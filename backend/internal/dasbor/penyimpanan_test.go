package dasbor

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func dataUji(n int) []byte {
	return []byte(`{"sumber":{"judul":"Uji","diolah":"2026-11-17"},"perOpd":[],"prosesBisnis":{"jumlahProsesBisnis":` +
		itoa(n) + `,"iku":[]},"data":{"jumlahData":2,"katalog":[{"sifat":"Terbuka"},{"sifat":"Tertutup"}]}}`)
}

func itoa(n int) string { return string(rune('0' + n)) }

func TestTerapkanArsipkanDanPulihkan(t *testing.T) {
	p := &Penyimpanan{Dir: t.TempDir(), Simpan: 2}
	if a, err := p.Aktif(); err != nil || a != nil {
		t.Fatalf("awal harus kosong: %v %v", a, err)
	}
	t0 := time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)
	for i := 1; i <= 4; i++ {
		if err := p.Terapkan([]byte("{}"), dataUji(i), nil, Meta{NamaBerkas: "v" + itoa(i) + ".xlsx", DiterapkanPada: t0.Add(time.Duration(i) * time.Minute)}); err != nil {
			t.Fatal(err)
		}
	}
	a, _ := p.Aktif()
	if a.Ringkasan.ProsesBisnis != 4 || a.Meta.NamaBerkas != "v4.xlsx" || a.Ringkasan.DataTerbuka != 1 {
		t.Fatalf("aktif salah: %+v %+v", a.Ringkasan, a.Meta)
	}
	r, _ := p.Riwayat()
	if len(r) != 2 || r[0].Ringkasan.ProsesBisnis != 3 || r[1].Ringkasan.ProsesBisnis != 2 {
		t.Fatalf("riwayat harus 2 versi terbaru (3, 2): %d", len(r))
	}

	m, err := p.Pulihkan(r[1].Versi, "Admin", t0.Add(time.Hour))
	if err != nil {
		t.Fatal(err)
	}
	a, _ = p.Aktif()
	if a.Ringkasan.ProsesBisnis != 2 || m.DipulihkanDari != r[1].Versi || a.Meta.NamaBerkas != "v2.xlsx" {
		t.Fatalf("pemulihan salah: %+v", a.Meta)
	}
	r, _ = p.Riwayat()
	if r[0].Ringkasan.ProsesBisnis != 4 {
		t.Fatalf("data sebelum pemulihan harus diarsipkan")
	}
	// Waktu berkas arsip mengikuti berkas aslinya (bukan waktu pengarsipan).
	lama := time.Date(2026, 11, 13, 9, 0, 0, 0, time.UTC)
	os.Chtimes(filepath.Join(p.Dir, BerkasInternal), lama, lama)
	if err := p.Terapkan([]byte("{}"), dataUji(5), nil, Meta{DiterapkanPada: t0.Add(2 * time.Hour)}); err != nil {
		t.Fatal(err)
	}
	r, _ = p.Riwayat()
	if !r[0].DiubahPada.Equal(lama) {
		t.Fatalf("waktu arsip harus mengikuti berkas asli: %v", r[0].DiubahPada)
	}
	if _, err := p.Pulihkan("../../etc", "x", time.Now()); err != ErrVersiTidakAda {
		t.Fatalf("versi tidak sah harus ditolak: %v", err)
	}
	if _, err := os.Stat(filepath.Join(p.Dir, BerkasPublik+".tmp")); err == nil {
		t.Fatal("berkas sementara tertinggal")
	}
}
