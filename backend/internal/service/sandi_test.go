package service

import (
	"strings"
	"testing"

	"spbe-backend/internal/domain"
)

func TestHashSandiTidakMenyimpanTeksBiasa(t *testing.T) {
	h, err := hashSandi("Rahasia@2026")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(h, awalanHash) || strings.Contains(h, "Rahasia") {
		t.Fatalf("hash tidak boleh memuat teks biasa: %q", h)
	}
	h2, _ := hashSandi("Rahasia@2026")
	if h == h2 {
		t.Error("garam harus acak: dua hash dari sandi sama tidak boleh identik")
	}
	if ok, perlu := cocokSandi(h, "Rahasia@2026"); !ok || perlu {
		t.Errorf("sandi benar harus cocok tanpa perlu hash ulang: %v %v", ok, perlu)
	}
	if ok, _ := cocokSandi(h, "rahasia@2026"); ok {
		t.Error("sandi salah tidak boleh cocok")
	}
	if ok, _ := cocokSandi(awalanHash+"rusak", "x"); ok {
		t.Error("format rusak harus ditolak")
	}
}

func TestSandiLamaTeksBiasaDiubahJadiHash(t *testing.T) {
	AktifkanSandiDemo(false)
	lama := "SandiLama@1"
	u := &domain.User{Role: domain.RoleASN, KataSandi: &lama}
	if sandiCocok(u, "salah") {
		t.Fatal("sandi salah tidak boleh cocok")
	}
	if *u.KataSandi != "SandiLama@1" {
		t.Error("nilai tersimpan tidak boleh berubah bila sandi salah")
	}
	if !sandiCocok(u, "SandiLama@1") {
		t.Fatal("sandi teks biasa lama harus tetap bisa masuk satu kali")
	}
	if !strings.HasPrefix(*u.KataSandi, awalanHash) {
		t.Error("setelah berhasil, nilai harus diganti hash")
	}
	if !sandiCocok(u, "SandiLama@1") {
		t.Error("hash baru harus tetap cocok")
	}
}

func TestSandiDemoHanyaSaatPengembangan(t *testing.T) {
	u := &domain.User{Role: domain.RoleSuperAdmin}
	AktifkanSandiDemo(false)
	if sandiCocok(u, "Super@123") {
		t.Error("kata sandi demo harus ditolak bila tidak dalam pengembangan")
	}
	AktifkanSandiDemo(true)
	t.Cleanup(func() { AktifkanSandiDemo(false) })
	if !sandiCocok(u, "Super@123") {
		t.Error("kata sandi demo harus diterima dalam pengembangan")
	}
	if sandiCocok(u, "salah") {
		t.Error("sandi demo salah harus ditolak")
	}
}
