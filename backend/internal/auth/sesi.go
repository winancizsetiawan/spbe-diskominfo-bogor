package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"time"
)

// Token sesi portal: diterbitkan BE setelah pengguna masuk lewat halaman login portal
// (kata sandi lokal atau akun TND untuk ASN). Bentuknya JWT HS256 yang ditandatangani SESI_SECRET,
// sehingga klien tidak dapat mengubah peran atau email di dalamnya.
//
// Klaim: iss "spbe-portal", typ "sesi", email, role, iat, exp. Kata sandi dan token TND tidak pernah
// dimasukkan ke token ini.

const (
	penerbitSesi = "spbe-portal"
	jenisSesi    = "sesi"
)

var (
	muSesi      sync.RWMutex
	rahasiaSesi []byte
	durasiSesi  = 8 * time.Hour
)

// AturSesi memasang rahasia penandatangan dan masa berlaku token sesi. Rahasia kosong berarti
// rahasia acak dibuat saat start (cukup untuk pengembangan; semua sesi gugur saat server restart).
func AturSesi(rahasia string, durasi time.Duration) {
	k := []byte(rahasia)
	if len(k) == 0 {
		k = make([]byte, 32)
		_, _ = rand.Read(k)
	}
	muSesi.Lock()
	rahasiaSesi = k
	if durasi > 0 {
		durasiSesi = durasi
	}
	muSesi.Unlock()
}

type klaimSesi struct {
	Iss   string `json:"iss"`
	Typ   string `json:"typ"`
	Email string `json:"email"`
	Role  string `json:"role"`
	Iat   int64  `json:"iat"`
	Exp   int64  `json:"exp"`
}

func tandaiSesi(isi string, k []byte) string {
	m := hmac.New(sha256.New, k)
	m.Write([]byte(isi))
	return base64.RawURLEncoding.EncodeToString(m.Sum(nil))
}

// TerbitkanSesi membuat token sesi untuk pengguna dengan peran aktif dan email tertentu.
func TerbitkanSesi(peran, email string) (token string, kedaluwarsa time.Time, err error) {
	muSesi.RLock()
	k, durasi := rahasiaSesi, durasiSesi
	muSesi.RUnlock()
	if len(k) == 0 {
		return "", time.Time{}, errors.New("rahasia sesi belum diatur")
	}
	if !peranDikenal(peran) || strings.TrimSpace(email) == "" {
		return "", time.Time{}, errors.New("peran atau email tidak valid")
	}
	sekarang := time.Now()
	kedaluwarsa = sekarang.Add(durasi)
	kepala, _ := json.Marshal(map[string]string{"alg": "HS256", "typ": "JWT"})
	klaim, _ := json.Marshal(klaimSesi{Iss: penerbitSesi, Typ: jenisSesi, Email: strings.ToLower(strings.TrimSpace(email)),
		Role: peran, Iat: sekarang.Unix(), Exp: kedaluwarsa.Unix()})
	isi := base64.RawURLEncoding.EncodeToString(kepala) + "." + base64.RawURLEncoding.EncodeToString(klaim)
	return isi + "." + tandaiSesi(isi, k), kedaluwarsa, nil
}

// adalahTokenSesi: token berbentuk JWT dengan alg HS256 dianggap token sesi portal.
// Token Keycloak selalu RS256, jadi keduanya tidak tertukar.
func adalahTokenSesi(token string) bool {
	bagian := strings.Split(token, ".")
	if len(bagian) != 3 {
		return false
	}
	var kepala struct {
		Alg string `json:"alg"`
	}
	return dekodeJSON(bagian[0], &kepala) == nil && kepala.Alg == "HS256"
}

// periksaSesi memverifikasi tanda tangan, penerbit, jenis, dan masa berlaku token sesi.
func periksaSesi(token string, sekarang time.Time) (peran, email string, err error) {
	muSesi.RLock()
	k := rahasiaSesi
	muSesi.RUnlock()
	if len(k) == 0 {
		return "", "", errors.New("sesi portal tidak aktif")
	}
	bagian := strings.Split(token, ".")
	if len(bagian) != 3 {
		return "", "", errors.New("format token salah")
	}
	isi := bagian[0] + "." + bagian[1]
	if !hmac.Equal([]byte(bagian[2]), []byte(tandaiSesi(isi, k))) {
		return "", "", errors.New("tanda tangan tidak sah")
	}
	var c klaimSesi
	if err := dekodeJSON(bagian[1], &c); err != nil {
		return "", "", err
	}
	if c.Iss != penerbitSesi || c.Typ != jenisSesi {
		return "", "", errors.New("bukan token sesi portal")
	}
	if c.Exp == 0 || sekarang.Unix() >= c.Exp {
		return "", "", errors.New("token kedaluwarsa")
	}
	if !peranDikenal(c.Role) || c.Email == "" {
		return "", "", errors.New("klaim tidak lengkap")
	}
	return c.Role, c.Email, nil
}

func peranDikenal(p string) bool {
	for _, r := range urutanPeran {
		if r == p {
			return true
		}
	}
	return false
}
