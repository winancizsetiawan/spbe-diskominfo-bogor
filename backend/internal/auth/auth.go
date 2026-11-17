// Package auth memverifikasi token akses dari Keycloak (JWT RS256) dan menentukan peran pengguna.
//
// Dua mode:
//   - "keycloak": tanda tangan token diperiksa dengan kunci publik (JWKS) dari Keycloak, lalu
//     masa berlaku, penerbit, dan audiens diperiksa. Peran diambil dari klaim token, bukan dari klien.
//   - "demo": hanya untuk pengembangan lokal. Token "demo.<peran>" diterima apa adanya.
//     Mode ini DITOLAK saat APP_ENV=production (lihat Validasi).
package auth

import (
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	ModeDemo     = "demo"
	ModeKeycloak = "keycloak"

	RoleSuperAdmin = "super_admin"
	RoleAdminOPD   = "admin_opd"
	RoleAkademisi  = "akademisi"
	RoleASN        = "asn"
)

// urutan hak akses dari yang tertinggi; bila token memuat beberapa peran, yang tertinggi dipakai.
var urutanPeran = []string{RoleSuperAdmin, RoleAdminOPD, RoleAkademisi, RoleASN}

// Config mengatur pemeriksaan token.
type Config struct {
	Mode     string
	Issuer   string // contoh: https://sso.kotabogor.go.id/realms/spbe
	JWKSURL  string // contoh: <Issuer>/protocol/openid-connect/certs
	ClientID string // diperiksa terhadap klaim aud atau azp; kosong = tidak diperiksa
	// Dipakai uji agar tidak mengakses jaringan.
	HTTPClient *http.Client
	Sekarang   func() time.Time
}

var (
	mu  sync.RWMutex
	cfg = Config{Mode: ModeDemo}
	jwk = &kunciCache{}
)

// Validasi memeriksa konfigurasi sebelum server berjalan.
func Validasi(c Config, produksi bool) error {
	switch c.Mode {
	case ModeDemo:
		if produksi {
			return errors.New("AUTH_MODE=demo tidak boleh dipakai saat APP_ENV=production; gunakan AUTH_MODE=keycloak")
		}
	case ModeKeycloak:
		if c.Issuer == "" || c.JWKSURL == "" {
			return errors.New("AUTH_MODE=keycloak membutuhkan KEYCLOAK_ISSUER dan KEYCLOAK_JWKS_URL")
		}
	default:
		return fmt.Errorf("AUTH_MODE %q tidak dikenal (pilih demo atau keycloak)", c.Mode)
	}
	return nil
}

// Init memasang konfigurasi global. Panggil sekali saat start.
func Init(c Config) {
	if c.HTTPClient == nil {
		c.HTTPClient = &http.Client{Timeout: 5 * time.Second}
	}
	if c.Sekarang == nil {
		c.Sekarang = time.Now
	}
	mu.Lock()
	cfg = c
	jwk = &kunciCache{}
	mu.Unlock()
}

// Pemisah antara peran dan email pada "pengenal" (lihat Kunci).
const pemisah = "\x1f"

// Kunci menggabungkan peran dan email terverifikasi menjadi satu "pengenal" yang diteruskan
// handler ke layanan. Layanan memakainya untuk mencari pengguna yang sebenarnya (Pisah);
// perbandingan hak akses selalu memakai PeranDari, bukan string utuh.
func Kunci(peran, email string) string {
	if email == "" {
		return peran
	}
	return peran + pemisah + strings.ToLower(email)
}

// Pisah memecah pengenal menjadi peran dan email (email kosong pada mode demo tanpa email).
func Pisah(kunci string) (peran, email string) {
	peran, email, _ = strings.Cut(kunci, pemisah)
	return peran, email
}

// PeranDari mengambil bagian peran dari pengenal, untuk pemeriksaan hak akses.
func PeranDari(kunci string) string {
	p, _ := Pisah(kunci)
	return p
}

// Dari membaca header Authorization lalu mengembalikan apakah pengguna sah dan perannya.
// Token yang tidak sah, kedaluwarsa, atau tanpa peran dikenal dianggap belum masuk.
func Dari(header string) (sudahLogin bool, peran string) {
	ok, p, _ := Identitas(header)
	return ok, p
}

// Identitas seperti Dari, ditambah email terverifikasi dari token. Pada mode keycloak, token tanpa
// email terverifikasi ditolak karena pengguna tidak dapat dikenali. Pada mode demo, token
// "demo.<peran>" tidak berisi email, dan "demo.<peran>:<email>" mensimulasikan pengguna tertentu.
func Identitas(header string) (sudahLogin bool, peran, email string) {
	header = strings.TrimSpace(header)
	if !strings.HasPrefix(header, "Bearer ") {
		return false, "", ""
	}
	token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
	if token == "" {
		return false, "", ""
	}

	mu.RLock()
	c := cfg
	mu.RUnlock()

	if c.Mode == ModeDemo {
		if strings.HasPrefix(token, "demo.") {
			p, e, _ := strings.Cut(strings.TrimPrefix(token, "demo."), ":")
			for _, r := range urutanPeran {
				if r == p {
					return true, p, strings.ToLower(strings.TrimSpace(e))
				}
			}
			return false, "", ""
		}
		// Token lain pada mode demo dianggap ASN, agar uji manual tetap mudah.
		return true, RoleASN, ""
	}

	p, e, err := periksaJWT(token, c)
	if err != nil {
		return false, "", ""
	}
	return true, p, e
}

type klaim struct {
	Iss           string          `json:"iss"`
	Aud           json.RawMessage `json:"aud"`
	Azp           string          `json:"azp"`
	Email         string          `json:"email"`
	EmailVerified bool            `json:"email_verified"`
	Exp           float64         `json:"exp"`
	Nbf           float64         `json:"nbf"`
	Real          struct {
		Roles []string `json:"roles"`
	} `json:"realm_access"`
	Resource map[string]struct {
		Roles []string `json:"roles"`
	} `json:"resource_access"`
}

func periksaJWT(token string, c Config) (peran, email string, err error) {
	bagian := strings.Split(token, ".")
	if len(bagian) != 3 {
		return "", "", errors.New("format token salah")
	}
	var kepala struct {
		Alg string `json:"alg"`
		Kid string `json:"kid"`
	}
	if err := dekodeJSON(bagian[0], &kepala); err != nil {
		return "", "", err
	}
	// Hanya RS256. Menolak "none" dan HS256 menutup serangan pemalsuan algoritma.
	if kepala.Alg != "RS256" {
		return "", "", errors.New("algoritma tidak diizinkan")
	}
	kunci, err := jwk.cari(kepala.Kid, c)
	if err != nil {
		return "", "", err
	}
	tanda, err := base64.RawURLEncoding.DecodeString(bagian[2])
	if err != nil {
		return "", "", err
	}
	h := sha256.Sum256([]byte(bagian[0] + "." + bagian[1]))
	if err := rsa.VerifyPKCS1v15(kunci, crypto.SHA256, h[:], tanda); err != nil {
		return "", "", errors.New("tanda tangan tidak sah")
	}

	var k klaim
	if err := dekodeJSON(bagian[1], &k); err != nil {
		return "", "", err
	}
	now := float64(c.Sekarang().Unix())
	if k.Exp == 0 || now >= k.Exp {
		return "", "", errors.New("token kedaluwarsa")
	}
	if k.Nbf != 0 && now+30 < k.Nbf {
		return "", "", errors.New("token belum berlaku")
	}
	if k.Iss != c.Issuer {
		return "", "", errors.New("penerbit tidak cocok")
	}
	if c.ClientID != "" && k.Azp != c.ClientID && !audMemuat(k.Aud, c.ClientID) {
		return "", "", errors.New("audiens tidak cocok")
	}

	semua := append([]string{}, k.Real.Roles...)
	if c.ClientID != "" {
		semua = append(semua, k.Resource[c.ClientID].Roles...)
	}
	// Pengguna dikenali lewat email; email yang belum diverifikasi bisa dipalsukan sendiri oleh pemiliknya.
	if k.Email == "" || !k.EmailVerified {
		return "", "", errors.New("token tidak memuat email terverifikasi")
	}
	for _, r := range urutanPeran {
		for _, v := range semua {
			if v == r {
				return r, strings.ToLower(strings.TrimSpace(k.Email)), nil
			}
		}
	}
	return "", "", errors.New("token tidak memuat peran yang dikenal")
}

func audMemuat(raw json.RawMessage, id string) bool {
	var satu string
	if json.Unmarshal(raw, &satu) == nil {
		return satu == id
	}
	var banyak []string
	if json.Unmarshal(raw, &banyak) == nil {
		for _, a := range banyak {
			if a == id {
				return true
			}
		}
	}
	return false
}

func dekodeJSON(b64 string, tujuan any) error {
	b, err := base64.RawURLEncoding.DecodeString(b64)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, tujuan)
}

// ---- JWKS ----

type kunciCache struct {
	mu        sync.Mutex
	kunci     map[string]*rsa.PublicKey
	diambil   time.Time
	gagalPada time.Time
}

const (
	masaCache     = 10 * time.Minute
	jedaMuatUlang = 30 * time.Second // mencegah banjir permintaan bila kid acak dikirim berulang
)

func (k *kunciCache) cari(kid string, c Config) (*rsa.PublicKey, error) {
	k.mu.Lock()
	defer k.mu.Unlock()
	now := c.Sekarang()
	if p, ada := k.kunci[kid]; ada && now.Sub(k.diambil) < masaCache {
		return p, nil
	}
	// kid tidak dikenal atau cache basi: muat ulang, tapi tidak lebih sering dari jedaMuatUlang.
	if now.Sub(k.gagalPada) < jedaMuatUlang && k.kunci != nil {
		if p, ada := k.kunci[kid]; ada {
			return p, nil
		}
		return nil, errors.New("kunci tidak dikenal")
	}
	baru, err := muatJWKS(c)
	if err != nil {
		k.gagalPada = now
		if p, ada := k.kunci[kid]; ada { // pakai cache lama bila Keycloak sedang tidak terjangkau
			return p, nil
		}
		return nil, err
	}
	k.kunci, k.diambil = baru, now
	k.gagalPada = now
	if p, ada := k.kunci[kid]; ada {
		return p, nil
	}
	return nil, errors.New("kunci tidak dikenal")
}

func muatJWKS(c Config) (map[string]*rsa.PublicKey, error) {
	resp, err := c.HTTPClient.Get(c.JWKSURL)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil JWKS: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("JWKS menjawab %d", resp.StatusCode)
	}
	isi, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	var set struct {
		Keys []struct {
			Kty string `json:"kty"`
			Kid string `json:"kid"`
			Use string `json:"use"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}
	if err := json.Unmarshal(isi, &set); err != nil {
		return nil, err
	}
	out := map[string]*rsa.PublicKey{}
	for _, j := range set.Keys {
		if j.Kty != "RSA" || (j.Use != "" && j.Use != "sig") {
			continue
		}
		n, err1 := base64.RawURLEncoding.DecodeString(j.N)
		e, err2 := base64.RawURLEncoding.DecodeString(j.E)
		if err1 != nil || err2 != nil {
			continue
		}
		out[j.Kid] = &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(new(big.Int).SetBytes(e).Int64())}
	}
	if len(out) == 0 {
		return nil, errors.New("JWKS tidak memuat kunci RSA")
	}
	return out, nil
}
