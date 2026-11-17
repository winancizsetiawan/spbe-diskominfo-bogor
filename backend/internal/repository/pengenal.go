package repository

import (
	"spbe-backend/internal/auth"
	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

// cariPengguna menemukan pengguna dari "pengenal" (lihat auth.Kunci).
//   - Dengan email (token Keycloak): pengguna dengan email itu. Tidak ada cadangan ke pengguna lain,
//     jadi akun yang belum terdaftar di portal tidak bisa menyamar sebagai pengguna lain.
//   - Tanpa email (mode demo): pengguna pertama dengan peran itu, perilaku lama untuk pengembangan.
func cariPengguna(db *gorm.DB, kunci string, denganInstansi bool) (*domain.User, error) {
	peran, email := auth.Pisah(kunci)
	q := db
	if denganInstansi {
		q = q.Preload("Instansi")
	}
	var u domain.User
	var err error
	if email != "" {
		err = q.Where("LOWER(email) = ?", email).First(&u).Error
	} else {
		err = q.Where("role = ?", peran).Order("id ASC").First(&u).Error
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}
