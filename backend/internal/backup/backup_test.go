package backup

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestWaktuBerikutnya(t *testing.T) {
	wib := time.FixedZone("WIB", 7*3600)
	pagi := time.Date(2026, 11, 17, 1, 0, 0, 0, wib)
	if got := WaktuBerikutnya(pagi, 2, 0); !got.Equal(time.Date(2026, 11, 17, 2, 0, 0, 0, wib)) {
		t.Errorf("sebelum jam jadwal: %v", got)
	}
	siang := time.Date(2026, 11, 17, 14, 0, 0, 0, wib)
	if got := WaktuBerikutnya(siang, 2, 0); !got.Equal(time.Date(2026, 11, 18, 2, 0, 0, 0, wib)) {
		t.Errorf("setelah jam jadwal: %v", got)
	}
	tepat := time.Date(2026, 11, 17, 2, 0, 0, 0, wib)
	if got := WaktuBerikutnya(tepat, 2, 0); !got.Equal(time.Date(2026, 11, 18, 2, 0, 0, 0, wib)) {
		t.Errorf("tepat pada jam jadwal harus besok: %v", got)
	}
}

func TestPangkasMenyisakanTerbaru(t *testing.T) {
	dir := t.TempDir()
	for _, ts := range []string{"20261110-020000", "20261111-020000", "20261112-020000", "20261113-020000"} {
		os.WriteFile(filepath.Join(dir, "spbe-"+ts+".dump"), []byte("x"), 0o600)
		os.WriteFile(filepath.Join(dir, "spbe-"+ts+"-uploads.zip"), []byte("x"), 0o600)
	}
	(&Runner{Dir: dir, Retensi: 2}).pangkas()
	sisa, _ := filepath.Glob(filepath.Join(dir, "spbe-*"))
	if len(sisa) != 4 { // 2 set x (dump + zip)
		t.Fatalf("berkas tersisa %d, diharapkan 4: %v", len(sisa), sisa)
	}
	if _, err := os.Stat(filepath.Join(dir, "spbe-20261113-020000.dump")); err != nil {
		t.Error("cadangan terbaru ikut terhapus")
	}
	if _, err := os.Stat(filepath.Join(dir, "spbe-20261110-020000-uploads.zip")); err == nil {
		t.Error("arsip unggahan lama tidak ikut terhapus")
	}
}

func TestSiapMenolakTanpaPgDump(t *testing.T) {
	r := &Runner{PgDump: "pg_dump_tidak_ada_xyz", Dir: t.TempDir(), DBName: "x"}
	if r.Siap() == nil {
		t.Error("harus galat bila pg_dump tidak ditemukan")
	}
}
