package service

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// Bentuk jawaban berhasil mengikuti API login TND (data pribadi diganti contoh).
const jawabanTNDBerhasil = `{"data":{"token":"xxx","user":{"nama":"Pegawai Uji","nik":"3201000000000000","nip":"199001012020121001",
"nama_pd":"Dinas Komunikasi dan Informatika","username":"199001012020121001","email":"Pegawai.Uji@kotabogor.go.id",
"nama_jabatan":"Operator Layanan Operasional","jabatan":"Operator","opd_id":29,"status":"Aktif","statusaparatur":"Aktif"}},
"message":"Login berhasil","status":"success"}`

func tndUji(t *testing.T, kode int, body string) *KlienTND {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("permintaan ke TND salah: %s %s", r.Method, r.Header.Get("Content-Type"))
		}
		w.WriteHeader(kode)
		w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return NewKlienTND(srv.URL, 2*time.Second)
}

func TestTNDBerhasil(t *testing.T) {
	p, err := tndUji(t, 200, jawabanTNDBerhasil).Login(context.Background(), "199001012020121001", "rahasia")
	if err != nil {
		t.Fatal(err)
	}
	if p.Nama != "Pegawai Uji" || p.Email != "pegawai.uji@kotabogor.go.id" || p.OpdID != 29 || p.NamaPD != "Dinas Komunikasi dan Informatika" || p.Jabatan != "Operator Layanan Operasional" {
		t.Fatalf("data pegawai salah: %+v", p)
	}
}

func TestTNDDitolakDalamBerbagaiBentuk(t *testing.T) {
	kasus := map[string]struct {
		kode int
		body string
		nip  string
		mau  error
	}{
		"401":                   {401, `{"message":"Username atau password salah","status":"error"}`, "199001012020121001", ErrTNDDitolak},
		"200 tapi status gagal": {200, `{"message":"Password salah","status":"failed"}`, "199001012020121001", ErrTNDDitolak},
		"200 bukan JSON":        {200, `<html>login</html>`, "199001012020121001", ErrTNDDitolak},
		"NIP jawaban berbeda":   {200, jawabanTNDBerhasil, "199912312020121009", ErrTNDDitolak},
		"server TND galat":      {502, `bad gateway`, "199001012020121001", ErrTNDTidakTersedia},
		"pegawai tidak aktif": {200, `{"data":{"user":{"nip":"199001012020121001","statusaparatur":"Pensiun"}},"status":"success"}`,
			"199001012020121001", ErrTNDTidakAktif},
	}
	for nama, k := range kasus {
		_, err := tndUji(t, k.kode, k.body).Login(context.Background(), k.nip, "x")
		if !errors.Is(err, k.mau) {
			t.Errorf("%s: mau %v, dapat %v", nama, k.mau, err)
		}
	}
}

func TestTNDTidakTerjangkau(t *testing.T) {
	k := NewKlienTND("http://127.0.0.1:1/login", 500*time.Millisecond)
	if _, err := k.Login(context.Background(), "199001012020121001", "x"); !errors.Is(err, ErrTNDTidakTersedia) {
		t.Fatalf("mau ErrTNDTidakTersedia, dapat %v", err)
	}
}

func TestAdalahNIP(t *testing.T) {
	for s, mau := range map[string]bool{"199001012020121001": true, " 199001012020121001 ": true, "19900101202012100": false, "superadmin": false, "1990010120201210ab": false} {
		if AdalahNIP(s) != mau {
			t.Errorf("AdalahNIP(%q) != %v", s, mau)
		}
	}
}
