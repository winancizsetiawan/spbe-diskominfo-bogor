package dasbor

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"sync"
	"time"
)

const (
	BerkasPublik   = "dasborPublik.json"
	BerkasInternal = "dasborInternal.json"
	berkasMeta     = "meta.json"
	folderRiwayat  = "riwayat"
)

var polaVersi = regexp.MustCompile(`^\d{8}-\d{6}(-\d{1,3})?$`)

// ErrVersiTidakAda dikembalikan bila versi riwayat yang diminta tidak ditemukan.
var ErrVersiTidakAda = errors.New("versi data dasbor tidak ditemukan")

// Meta mencatat asal data dasbor yang sedang aktif atau tersimpan di riwayat.
type Meta struct {
	NamaBerkas     string    `json:"namaBerkas"`
	DiunggahOleh   string    `json:"diunggahOleh"`
	DiterapkanPada time.Time `json:"diterapkanPada"`
	DipulihkanDari string    `json:"dipulihkanDari,omitempty"`
}

// Versi adalah satu set data dasbor (aktif atau arsip).
type Versi struct {
	Versi      string     `json:"versi,omitempty"`
	Meta       *Meta      `json:"meta"`
	Ringkasan  *Ringkasan `json:"ringkasan"`
	DiubahPada time.Time  `json:"diubahPada"`
}

// Penyimpanan mengelola berkas dasbor di folder DASBOR_DATA_DIR beserta arsip versi sebelumnya.
// Struktur: <dir>/dasborPublik.json, dasborInternal.json, meta.json, riwayat/<versi>/(berkas yang sama).
type Penyimpanan struct {
	Dir    string
	Simpan int // jumlah versi riwayat yang dipertahankan
	mu     sync.Mutex
}

func bacaVersi(dir string) (*Versi, error) {
	info, err := os.Stat(filepath.Join(dir, BerkasInternal))
	if err != nil {
		return nil, err
	}
	v := &Versi{DiubahPada: info.ModTime()}
	if isi, err := os.ReadFile(filepath.Join(dir, BerkasInternal)); err == nil {
		if r, err := RingkasanDari(isi); err == nil {
			v.Ringkasan = &r
		}
	}
	if isi, err := os.ReadFile(filepath.Join(dir, berkasMeta)); err == nil {
		var m Meta
		if json.Unmarshal(isi, &m) == nil {
			v.Meta = &m
		}
	}
	return v, nil
}

// Aktif mengembalikan data yang sedang dipakai dasbor, atau nil bila belum ada.
func (p *Penyimpanan) Aktif() (*Versi, error) {
	v, err := bacaVersi(p.Dir)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	return v, err
}

// Riwayat mengembalikan arsip versi sebelumnya, terbaru lebih dulu.
func (p *Penyimpanan) Riwayat() ([]Versi, error) {
	entri, err := os.ReadDir(filepath.Join(p.Dir, folderRiwayat))
	if errors.Is(err, fs.ErrNotExist) {
		return []Versi{}, nil
	}
	if err != nil {
		return nil, err
	}
	out := []Versi{}
	for _, e := range entri {
		if !e.IsDir() || !polaVersi.MatchString(e.Name()) {
			continue
		}
		v, err := bacaVersi(filepath.Join(p.Dir, folderRiwayat, e.Name()))
		if err != nil {
			continue
		}
		v.Versi = e.Name()
		out = append(out, *v)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Versi > out[j].Versi })
	return out, nil
}

func tulisAtomik(path string, isi []byte) error {
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, isi, 0o640); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

// arsipkanAktif memindahkan salinan data aktif ke riwayat dan memangkas riwayat lama. Pemanggil memegang mu.
func (p *Penyimpanan) arsipkanAktif(sekarang time.Time) error {
	if _, err := os.Stat(filepath.Join(p.Dir, BerkasInternal)); errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	nama := sekarang.Format("20060102-150405")
	tujuan := filepath.Join(p.Dir, folderRiwayat, nama)
	for i := 1; ; i++ {
		if _, err := os.Stat(tujuan); errors.Is(err, fs.ErrNotExist) {
			break
		}
		tujuan = filepath.Join(p.Dir, folderRiwayat, fmt.Sprintf("%s-%d", nama, i))
	}
	if err := os.MkdirAll(tujuan, 0o750); err != nil {
		return err
	}
	for _, b := range []string{BerkasPublik, BerkasInternal, BerkasRelasi, berkasMeta} {
		asal := filepath.Join(p.Dir, b)
		isi, err := os.ReadFile(asal)
		if errors.Is(err, fs.ErrNotExist) {
			continue
		}
		if err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(tujuan, b), isi, 0o640); err != nil {
			return err
		}
		// Pertahankan waktu berkas asli: untuk data lama tanpa meta, inilah satu-satunya penanda kapan data dipakai.
		if info, err := os.Stat(asal); err == nil {
			_ = os.Chtimes(filepath.Join(tujuan, b), info.ModTime(), info.ModTime())
		}
	}
	return p.pangkas()
}

func (p *Penyimpanan) pangkas() error {
	if p.Simpan <= 0 {
		return nil
	}
	semua, err := p.Riwayat()
	if err != nil {
		return err
	}
	for _, v := range semua[min(len(semua), p.Simpan):] {
		if err := os.RemoveAll(filepath.Join(p.Dir, folderRiwayat, v.Versi)); err != nil {
			return err
		}
	}
	return nil
}

func (p *Penyimpanan) tulisAktif(publik, internal, relasi []byte, m Meta) error {
	if err := os.MkdirAll(p.Dir, 0o750); err != nil {
		return err
	}
	// Relasi harus selalu berasal dari Excel yang sama dengan data dasbor: bila tidak ada, berkas lama dihapus.
	pathRelasi := filepath.Join(p.Dir, BerkasRelasi)
	if relasi == nil {
		if err := os.Remove(pathRelasi); err != nil && !errors.Is(err, fs.ErrNotExist) {
			return err
		}
	} else if err := tulisAtomik(pathRelasi, relasi); err != nil {
		return err
	}
	mb, _ := json.Marshal(m)
	// Internal ditulis terakhir: berkas inilah penanda "data aktif ada".
	for _, x := range []struct {
		nama string
		isi  []byte
	}{{BerkasPublik, publik}, {berkasMeta, mb}, {BerkasInternal, internal}} {
		if err := tulisAtomik(filepath.Join(p.Dir, x.nama), x.isi); err != nil {
			return err
		}
	}
	return nil
}

// Terapkan menjadikan data baru sebagai data aktif. Data sebelumnya diarsipkan lebih dulu.
// relasi boleh nil (Excel tanpa sheet keterkaitan antar-domain).
func (p *Penyimpanan) Terapkan(publik, internal, relasi []byte, m Meta) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	if err := os.MkdirAll(p.Dir, 0o750); err != nil {
		return err
	}
	if err := p.arsipkanAktif(m.DiterapkanPada); err != nil {
		return err
	}
	return p.tulisAktif(publik, internal, relasi, m)
}

// Pulihkan mengembalikan versi riwayat sebagai data aktif. Data aktif saat ini ikut diarsipkan.
func (p *Penyimpanan) Pulihkan(versi string, oleh string, sekarang time.Time) (*Meta, error) {
	if !polaVersi.MatchString(versi) {
		return nil, ErrVersiTidakAda
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	asal := filepath.Join(p.Dir, folderRiwayat, versi)
	publik, err1 := os.ReadFile(filepath.Join(asal, BerkasPublik))
	internal, err2 := os.ReadFile(filepath.Join(asal, BerkasInternal))
	if err1 != nil || err2 != nil {
		return nil, ErrVersiTidakAda
	}
	m := Meta{DiunggahOleh: oleh, DiterapkanPada: sekarang, DipulihkanDari: versi}
	if isi, err := os.ReadFile(filepath.Join(asal, berkasMeta)); err == nil {
		var lama Meta
		if json.Unmarshal(isi, &lama) == nil {
			m.NamaBerkas = lama.NamaBerkas
		}
	}
	relasi, err := os.ReadFile(filepath.Join(asal, BerkasRelasi))
	if err != nil {
		relasi = nil // versi lama tanpa relasi
	}
	if err := p.arsipkanAktif(sekarang); err != nil {
		return nil, err
	}
	return &m, p.tulisAktif(publik, internal, relasi, m)
}
