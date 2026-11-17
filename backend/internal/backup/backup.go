// Package backup membuat cadangan nyata: dump database dengan pg_dump dan arsip folder unggahan.
// Berkas disimpan di folder khusus pada server aplikasi dan hanya N cadangan terbaru yang dipertahankan
// (Buku Panduan B.7 dan D.1: harian, simpan 7 hari, termasuk berkas unggahan).
package backup

import (
	"archive/zip"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// Runner menyimpan semua yang dibutuhkan untuk satu kali cadangan.
type Runner struct {
	PgDump     string // jalur pg_dump; bawaan "pg_dump" (harus ada di PATH)
	Dir        string // folder tujuan cadangan
	UploadsDir string // folder unggahan yang ikut dicadangkan
	Retensi    int    // jumlah set cadangan yang disimpan

	Host, Port, User, Password, DBName string
}

// Hasil ringkasan cadangan yang berhasil.
type Hasil struct {
	UkuranBytes int64
	Berkas      []string
}

// Siap memeriksa pengaturan dasar dan bahwa pg_dump dapat ditemukan.
func (r *Runner) Siap() error {
	if r == nil {
		return errors.New("backup belum dikonfigurasi")
	}
	if r.Dir == "" || r.DBName == "" {
		return errors.New("folder backup atau nama database belum diatur")
	}
	if _, err := exec.LookPath(r.pgdump()); err != nil {
		return fmt.Errorf("pg_dump tidak ditemukan (%s); atur PG_DUMP_PATH", r.pgdump())
	}
	return nil
}

func (r *Runner) pgdump() string {
	if r.PgDump == "" {
		return "pg_dump"
	}
	return r.PgDump
}

// Jalankan membuat satu set cadangan lalu memangkas yang lama.
func (r *Runner) Jalankan(ctx context.Context) (*Hasil, error) {
	if err := r.Siap(); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(r.Dir, 0o700); err != nil {
		return nil, fmt.Errorf("gagal membuat folder backup: %w", err)
	}

	ts := time.Now().Format("20060102-150405")
	dump := filepath.Join(r.Dir, "spbe-"+ts+".dump")
	hasil := &Hasil{}

	ctx, batal := context.WithTimeout(ctx, 30*time.Minute)
	defer batal()
	// Kata sandi dikirim lewat lingkungan proses anak, bukan argumen, supaya tidak tampil di daftar proses.
	cmd := exec.CommandContext(ctx, r.pgdump(), "-Fc", "-h", r.Host, "-p", r.Port, "-U", r.User, "-d", r.DBName, "-f", dump)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+r.Password)
	if keluar, err := cmd.CombinedOutput(); err != nil {
		_ = os.Remove(dump)
		return nil, fmt.Errorf("pg_dump gagal: %s", ringkas(string(keluar), err))
	}
	_ = os.Chmod(dump, 0o600)
	if st, err := os.Stat(dump); err == nil {
		hasil.UkuranBytes += st.Size()
		hasil.Berkas = append(hasil.Berkas, filepath.Base(dump))
	}

	if r.UploadsDir != "" {
		zipPath := filepath.Join(r.Dir, "spbe-"+ts+"-uploads.zip")
		n, err := arsipkan(r.UploadsDir, zipPath)
		if err != nil {
			_ = os.Remove(zipPath)
			return nil, fmt.Errorf("gagal mengarsipkan berkas unggahan: %w", err)
		}
		if n > 0 {
			_ = os.Chmod(zipPath, 0o600)
			if st, err := os.Stat(zipPath); err == nil {
				hasil.UkuranBytes += st.Size()
				hasil.Berkas = append(hasil.Berkas, filepath.Base(zipPath))
			}
		} else {
			_ = os.Remove(zipPath)
		}
	}

	r.pangkas()
	return hasil, nil
}

func ringkas(keluar string, err error) string {
	keluar = strings.TrimSpace(keluar)
	if keluar == "" {
		return err.Error()
	}
	if len(keluar) > 300 {
		keluar = keluar[:300] + "…"
	}
	return keluar
}

// arsipkan memasukkan semua berkas biasa di dir ke zip; mengembalikan jumlah berkas.
func arsipkan(dir, tujuan string) (int, error) {
	if st, err := os.Stat(dir); err != nil || !st.IsDir() {
		return 0, nil // belum ada unggahan
	}
	out, err := os.Create(tujuan)
	if err != nil {
		return 0, err
	}
	zw := zip.NewWriter(out)
	n := 0
	walkErr := filepath.Walk(dir, func(p string, info os.FileInfo, err error) error {
		if err != nil || !info.Mode().IsRegular() {
			return err
		}
		rel, err := filepath.Rel(dir, p)
		if err != nil {
			return err
		}
		w, err := zw.Create(filepath.ToSlash(rel))
		if err != nil {
			return err
		}
		f, err := os.Open(p)
		if err != nil {
			return err
		}
		_, err = io.Copy(w, f)
		_ = f.Close()
		n++
		return err
	})
	if err := zw.Close(); walkErr == nil {
		walkErr = err
	}
	if err := out.Close(); walkErr == nil {
		walkErr = err
	}
	return n, walkErr
}

// pangkas menghapus set cadangan di luar N terbaru (dump dan arsip unggahan dengan cap waktu sama).
func (r *Runner) pangkas() {
	if r.Retensi < 1 {
		return
	}
	cocok, _ := filepath.Glob(filepath.Join(r.Dir, "spbe-*.dump"))
	if len(cocok) <= r.Retensi {
		return
	}
	sort.Strings(cocok) // cap waktu di nama berurutan secara leksikografis
	for _, d := range cocok[:len(cocok)-r.Retensi] {
		_ = os.Remove(d)
		_ = os.Remove(strings.TrimSuffix(d, ".dump") + "-uploads.zip")
	}
}

// WaktuBerikutnya menghitung kapan jam:menit berikutnya tiba (hari ini bila belum lewat, selain itu besok).
func WaktuBerikutnya(sekarang time.Time, jam, menit int) time.Time {
	t := time.Date(sekarang.Year(), sekarang.Month(), sekarang.Day(), jam, menit, 0, 0, sekarang.Location())
	if !t.After(sekarang) {
		t = t.AddDate(0, 0, 1)
	}
	return t
}
