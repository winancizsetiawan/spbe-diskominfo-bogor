package auth

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func b64(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }

func buatToken(t *testing.T, kunci *rsa.PrivateKey, kid, alg string, klaim map[string]any) string {
	t.Helper()
	kepala, _ := json.Marshal(map[string]string{"alg": alg, "kid": kid, "typ": "JWT"})
	isi, _ := json.Marshal(klaim)
	bahan := b64(kepala) + "." + b64(isi)
	h := sha256.Sum256([]byte(bahan))
	tanda, err := rsa.SignPKCS1v15(rand.Reader, kunci, crypto.SHA256, h[:])
	if err != nil {
		t.Fatal(err)
	}
	return bahan + "." + b64(tanda)
}

func siapkan(t *testing.T) (*rsa.PrivateKey, *rsa.PrivateKey, time.Time) {
	t.Helper()
	sah, _ := rsa.GenerateKey(rand.Reader, 2048)
	asing, _ := rsa.GenerateKey(rand.Reader, 2048)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{
			"kty": "RSA", "kid": "k1", "use": "sig",
			"n": b64(sah.N.Bytes()), "e": b64(big.NewInt(int64(sah.E)).Bytes()),
		}}})
	}))
	t.Cleanup(srv.Close)
	now := time.Unix(1_800_000_000, 0)
	Init(Config{Mode: ModeKeycloak, Issuer: "https://sso/realms/spbe", JWKSURL: srv.URL, ClientID: "spbe-web", Sekarang: func() time.Time { return now }})
	t.Cleanup(func() { Init(Config{Mode: ModeDemo}) })
	return sah, asing, now
}

func klaimDasar(now time.Time, peran ...string) map[string]any {
	return map[string]any{
		"iss": "https://sso/realms/spbe", "azp": "spbe-web", "exp": now.Add(5 * time.Minute).Unix(),
		"email": "Budi@Kotabogor.go.id", "email_verified": true,
		"realm_access": map[string]any{"roles": peran},
	}
}

func TestTokenSahDiterimaDanPeranTertinggiDipakai(t *testing.T) {
	sah, _, now := siapkan(t)
	ok, peran := Dari("Bearer " + buatToken(t, sah, "k1", "RS256", klaimDasar(now, "asn", "admin_opd")))
	if !ok || peran != RoleAdminOPD {
		t.Fatalf("diharapkan admin_opd, dapat %v %q", ok, peran)
	}
}

func TestTokenDitolak(t *testing.T) {
	sah, asing, now := siapkan(t)
	kasus := map[string]string{
		"ditandatangani kunci lain": buatToken(t, asing, "k1", "RS256", klaimDasar(now, "super_admin")),
		"kid tidak dikenal":         buatToken(t, sah, "zzz", "RS256", klaimDasar(now, "super_admin")),
		"token demo":                "demo.super_admin",
		"tanpa peran dikenal":       buatToken(t, sah, "k1", "RS256", klaimDasar(now, "tamu")),
		"alg none":                  b64([]byte(`{"alg":"none"}`)) + "." + b64([]byte(`{"exp":9999999999}`)) + ".",
	}
	k := klaimDasar(now, "super_admin")
	k["exp"] = now.Add(-time.Minute).Unix()
	kasus["kedaluwarsa"] = buatToken(t, sah, "k1", "RS256", k)
	k = klaimDasar(now, "super_admin")
	k["iss"] = "https://penyerang"
	kasus["penerbit salah"] = buatToken(t, sah, "k1", "RS256", k)
	k = klaimDasar(now, "super_admin")
	k["azp"] = "aplikasi-lain"
	kasus["audiens salah"] = buatToken(t, sah, "k1", "RS256", k)
	kasus["HS256 dipalsukan"] = buatToken(t, sah, "k1", "HS256", klaimDasar(now, "super_admin"))

	for nama, tok := range kasus {
		if ok, peran := Dari("Bearer " + tok); ok {
			t.Errorf("%s: seharusnya ditolak, malah diterima sebagai %q", nama, peran)
		}
	}
	if ok, _ := Dari(""); ok {
		t.Error("tanpa header seharusnya ditolak")
	}
}

func TestModeDemo(t *testing.T) {
	Init(Config{Mode: ModeDemo})
	if ok, p := Dari("Bearer demo.super_admin"); !ok || p != RoleSuperAdmin {
		t.Errorf("demo.super_admin: %v %q", ok, p)
	}
	if ok, _ := Dari("Bearer demo.dewa"); ok {
		t.Error("peran demo tak dikenal harus ditolak")
	}
}

func TestValidasiKonfigurasi(t *testing.T) {
	if Validasi(Config{Mode: ModeDemo}, true) == nil {
		t.Error("demo di produksi harus ditolak")
	}
	if Validasi(Config{Mode: ModeDemo}, false) != nil {
		t.Error("demo di pengembangan harus boleh")
	}
	if Validasi(Config{Mode: ModeKeycloak}, true) == nil {
		t.Error("keycloak tanpa issuer/JWKS harus ditolak")
	}
	if Validasi(Config{Mode: ModeKeycloak, Issuer: "i", JWKSURL: "u"}, true) != nil {
		t.Error("keycloak lengkap harus lolos")
	}
}

func TestIdentitasEmailTerverifikasi(t *testing.T) {
	sah, _, now := siapkan(t)

	ok, peran, email := Identitas("Bearer " + buatToken(t, sah, "k1", "RS256", klaimDasar(now, "admin_opd")))
	if !ok || peran != RoleAdminOPD || email != "budi@kotabogor.go.id" {
		t.Fatalf("diharapkan admin_opd + email huruf kecil, dapat %v %q %q", ok, peran, email)
	}

	k := klaimDasar(now, "super_admin")
	k["email_verified"] = false
	if ok, _, _ := Identitas("Bearer " + buatToken(t, sah, "k1", "RS256", k)); ok {
		t.Error("email belum terverifikasi harus ditolak")
	}
	k = klaimDasar(now, "super_admin")
	delete(k, "email")
	if ok, _, _ := Identitas("Bearer " + buatToken(t, sah, "k1", "RS256", k)); ok {
		t.Error("token tanpa email harus ditolak")
	}
}

func TestKunciDanPisah(t *testing.T) {
	k := Kunci("admin_opd", "Budi@Kotabogor.go.id")
	p, e := Pisah(k)
	if p != "admin_opd" || e != "budi@kotabogor.go.id" || PeranDari(k) != "admin_opd" {
		t.Errorf("Pisah/PeranDari salah: %q %q", p, e)
	}
	if Kunci("asn", "") != "asn" {
		t.Error("tanpa email, pengenal harus sama dengan peran")
	}
}

func TestDemoDenganEmail(t *testing.T) {
	Init(Config{Mode: ModeDemo})
	ok, p, e := Identitas("Bearer demo.admin_opd:Ajri@Contoh.go.id")
	if !ok || p != RoleAdminOPD || e != "ajri@contoh.go.id" {
		t.Errorf("demo dengan email: %v %q %q", ok, p, e)
	}
	if ok, p, e := Identitas("Bearer demo.asn"); !ok || p != RoleASN || e != "" {
		t.Errorf("demo tanpa email: %v %q %q", ok, p, e)
	}
}
