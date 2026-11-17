package auth

import (
	"encoding/base64"
	"strings"
	"testing"
	"time"
)

func TestTokenSesiDiterimaDanTidakBisaDiubah(t *testing.T) {
	Init(Config{Mode: ModeLokal})
	AturSesi("rahasia-uji-yang-cukup-panjang-0123456789", time.Hour)

	tok, exp, err := TerbitkanSesi(RoleASN, "Pegawai@KotaBogor.go.id")
	if err != nil || time.Until(exp) < 59*time.Minute {
		t.Fatalf("terbitkan: %v %v", err, exp)
	}
	ok, p, e := Identitas("Bearer " + tok)
	if !ok || p != RoleASN || e != "pegawai@kotabogor.go.id" {
		t.Fatalf("token sah harus diterima: %v %q %q", ok, p, e)
	}

	// Klien mengganti peran di klaim: tanda tangan tidak cocok lagi.
	b := strings.Split(tok, ".")
	klaimPalsu := base64.RawURLEncoding.EncodeToString([]byte(`{"iss":"spbe-portal","typ":"sesi","email":"pegawai@kotabogor.go.id","role":"super_admin","exp":9999999999}`))
	if ok, _, _ := Identitas("Bearer " + b[0] + "." + klaimPalsu + "." + b[2]); ok {
		t.Fatal("token yang klaimnya diubah harus ditolak")
	}

	// Rahasia berbeda (mis. server lain) menolak token.
	AturSesi("rahasia-lain-yang-juga-cukup-panjang-98765", time.Hour)
	if ok, _, _ := Identitas("Bearer " + tok); ok {
		t.Fatal("token dari rahasia lain harus ditolak")
	}
}

func TestTokenSesiKedaluwarsaDanModeLokal(t *testing.T) {
	Init(Config{Mode: ModeLokal})
	AturSesi("rahasia-uji-yang-cukup-panjang-0123456789", time.Hour)
	tok, _, _ := TerbitkanSesi(RoleAdminOPD, "admin@kotabogor.go.id")

	Init(Config{Mode: ModeLokal, Sekarang: func() time.Time { return time.Now().Add(2 * time.Hour) }})
	if ok, _, _ := Identitas("Bearer " + tok); ok {
		t.Fatal("token kedaluwarsa harus ditolak")
	}

	Init(Config{Mode: ModeLokal})
	if ok, _, _ := Identitas("Bearer demo.super_admin"); ok {
		t.Fatal("mode lokal tidak boleh menerima token demo")
	}
	if ok, _, _ := Identitas("Bearer " + tok); !ok {
		t.Fatal("mode lokal harus menerima token sesi")
	}

	// Mode demo tetap menerima token sesi, tetapi token HS256 palsu tidak jatuh ke "dianggap ASN".
	Init(Config{Mode: ModeDemo})
	if ok, _, _ := Identitas("Bearer " + tok + "x"); ok {
		t.Fatal("token sesi rusak harus ditolak di mode demo")
	}
}

func TestRahasiaSesiProduksi(t *testing.T) {
	if ValidasiRahasiaSesi("pendek", true) == nil {
		t.Fatal("rahasia pendek harus ditolak di produksi")
	}
	if ValidasiRahasiaSesi("", false) != nil {
		t.Fatal("pengembangan boleh tanpa rahasia")
	}
}
