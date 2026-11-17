package service

import (
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
	"sync/atomic"

	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

// Penyimpanan kata sandi: PBKDF2-SHA256 dengan garam acak per pengguna (pustaka standar Go).
// Bentuk tersimpan: "pbkdf2-sha256$<iterasi>$<garam base64>$<hash base64>".
// Memenuhi butir B.1 dan B.5 Buku Panduan (kata sandi disimpan dengan kriptografi satu arah).
const (
	awalanHash     = "pbkdf2-sha256$"
	iterasiPBKDF2  = 600_000 // rekomendasi OWASP untuk PBKDF2-HMAC-SHA256
	panjangGaram   = 16
	panjangHashKey = 32
)

// sandiDemoAktif mengizinkan kata sandi bawaan per peran (sandiPerRole) dan pintasan username demo.
// Hanya untuk pengembangan; main.go mengaktifkannya bila APP_ENV=development.
var sandiDemoAktif atomic.Bool

// AktifkanSandiDemo menyalakan atau mematikan kata sandi demo. Bawaan: mati.
func AktifkanSandiDemo(aktif bool) { sandiDemoAktif.Store(aktif) }

func hashSandi(sandi string) (string, error) {
	garam := make([]byte, panjangGaram)
	if _, err := rand.Read(garam); err != nil {
		return "", err
	}
	h, err := pbkdf2.Key(sha256.New, sandi, garam, iterasiPBKDF2, panjangHashKey)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s%d$%s$%s", awalanHash, iterasiPBKDF2, base64.RawStdEncoding.EncodeToString(garam), base64.RawStdEncoding.EncodeToString(h)), nil
}

// cocokSandi membandingkan masukan dengan nilai tersimpan.
// Nilai lama tanpa awalan hash dianggap teks biasa (data sebelum perbaikan): tetap dibandingkan
// dengan waktu tetap, dan `perluHash` true agar pemanggil menggantinya dengan hash setelah berhasil masuk.
func cocokSandi(tersimpan, masukan string) (cocok bool, perluHash bool) {
	if !strings.HasPrefix(tersimpan, awalanHash) {
		return subtle.ConstantTimeCompare([]byte(tersimpan), []byte(masukan)) == 1, true
	}
	bagian := strings.Split(strings.TrimPrefix(tersimpan, awalanHash), "$")
	if len(bagian) != 3 {
		return false, false
	}
	iter, err := strconv.Atoi(bagian[0])
	if err != nil || iter < 1 {
		return false, false
	}
	garam, err1 := base64.RawStdEncoding.DecodeString(bagian[1])
	harapan, err2 := base64.RawStdEncoding.DecodeString(bagian[2])
	if err1 != nil || err2 != nil || len(harapan) == 0 {
		return false, false
	}
	h, err := pbkdf2.Key(sha256.New, masukan, garam, iter, len(harapan))
	if err != nil {
		return false, false
	}
	return subtle.ConstantTimeCompare(h, harapan) == 1, iter < iterasiPBKDF2
}

// sandiCocok memeriksa kata sandi pengguna. Bila nilai tersimpan masih teks biasa atau iterasinya
// lebih rendah dari standar, `u.KataSandi` diganti hash baru (pemanggil wajib menyimpan `u`).
func sandiCocok(u *domain.User, masukan string) bool {
	if u.KataSandi != nil && *u.KataSandi != "" {
		ok, perluHash := cocokSandi(*u.KataSandi, masukan)
		if ok && perluHash {
			if baru, err := hashSandi(masukan); err == nil {
				u.KataSandi = &baru
			}
		}
		return ok
	}
	// Belum pernah mengganti sandi: hanya kata sandi demo, dan hanya saat pengembangan.
	if !sandiDemoAktif.Load() {
		return false
	}
	demo, ada := sandiPerRole[u.Role]
	return ada && subtle.ConstantTimeCompare([]byte(demo), []byte(masukan)) == 1
}

// HashSandiTeksBiasa mengganti semua kata sandi tersimpan yang masih berupa teks biasa dengan hash.
// Dipanggil sekali saat start; aman dijalankan berulang. Mengembalikan jumlah baris yang diubah.
func HashSandiTeksBiasa(db *gorm.DB) (int, error) {
	var daftar []domain.User
	if err := db.Where("kata_sandi IS NOT NULL AND kata_sandi <> '' AND kata_sandi NOT LIKE ?", awalanHash+"%").Find(&daftar).Error; err != nil {
		return 0, err
	}
	n := 0
	for _, u := range daftar {
		h, err := hashSandi(*u.KataSandi)
		if err != nil {
			return n, err
		}
		if err := db.Model(&domain.User{}).Where("id = ?", u.ID).Update("kata_sandi", h).Error; err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}
