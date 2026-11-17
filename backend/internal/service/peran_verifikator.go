package service

import (
	"strings"

	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

// NormalisasiPeranVerifikator merapikan data lama dari masa Verifikator masih peran berdiri sendiri:
// pengguna yang tercatat berperan Verifikator tetapi daftar perannya tidak memuat ASN diberi peran ASN,
// sehingga hak Verifikatornya tetap berlaku sebagai peran tambahan ASN. Aman dijalankan berulang.
func NormalisasiPeranVerifikator(db *gorm.DB) (int, error) {
	var daftar []domain.User
	if err := db.Where("role = ? OR daftar_peran LIKE ?", domain.RoleVerifikator, "%verifikator%").Find(&daftar).Error; err != nil {
		return 0, err
	}
	n := 0
	for _, u := range daftar {
		peran := []domain.Role{domain.RoleASN}
		if strings.TrimSpace(u.DaftarPeranRaw) == "" {
			peran = append(peran, domain.RoleAkademisi, domain.RoleVerifikator)
		} else {
			adaASN := false
			for _, s := range strings.Split(u.DaftarPeranRaw, ",") {
				r := domain.Role(strings.TrimSpace(s))
				adaASN = adaASN || r == domain.RoleASN
				peran = append(peran, r)
			}
			if adaASN {
				continue
			}
		}
		u.SetDaftarPeran(peran)
		if err := db.Model(&domain.User{}).Where("id = ?", u.ID).Update("daftar_peran", u.DaftarPeranRaw).Error; err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}
