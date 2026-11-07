package database

import (
	"log"

	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

func strPtr(s string) *string {
	return &s
}

// SeedData mengisi data master instansi dan akun demo jika tabel masih kosong
func SeedData(db *gorm.DB) error {
	// 1. Seeder Data Instansi / OPD
	var instansiCount int64
	if err := db.Model(&domain.Instansi{}).Count(&instansiCount).Error; err != nil {
		return err
	}

	if instansiCount == 0 {
		log.Println("Mengisi data master instansi awal...")
		instansiList := []domain.Instansi{
			{ID: 1, Nama: "Diskominfo Kota Bogor", Jenis: domain.JenisOPD},
			{ID: 2, Nama: "Dinas Kesehatan Kota Bogor", Jenis: domain.JenisOPD},
			{ID: 3, Nama: "Bapenda Kota Bogor", Jenis: domain.JenisOPD},
			{ID: 4, Nama: "Bappeda Kota Bogor", Jenis: domain.JenisOPD},
			{ID: 5, Nama: "BKPSDM Kota Bogor", Jenis: domain.JenisOPD},
			{ID: 6, Nama: "DPMPTSP Kota Bogor", Jenis: domain.JenisOPD},
			{ID: 10, Nama: "Perguruan Tinggi Mitra", Jenis: domain.JenisPerguruanTinggi},
		}

		for _, inst := range instansiList {
			if err := db.Where("id = ?", inst.ID).FirstOrCreate(&inst).Error; err != nil {
				return err
			}
		}
	}

	// 2. Seeder Data Pengguna Demo (sesuai yang dipakai di frontend mock)
	var userCount int64
	if err := db.Model(&domain.User{}).Count(&userCount).Error; err != nil {
		return err
	}

	if userCount < 4 {
		log.Println("Mengisi data pengguna demo awal...")
		users := []domain.User{
			{
				ID:          1,
				KeycloakSub: strPtr("mock-sub-1"),
				Nama:        "Andi Pratama",
				Email:       "andi.pratama@example.go.id",
				Role:        domain.RoleASN,
				StatusAkun:  domain.StatusAktif,
				InstansiID:  1,
			},
			{
				ID:          2,
				KeycloakSub: strPtr("mock-sub-2"),
				Nama:        "Siti Rahma",
				Email:       "siti.rahma@example.ac.id",
				Role:        domain.RoleAkademisi,
				StatusAkun:  domain.StatusAktif,
				InstansiID:  10,
			},
			{
				ID:          3,
				KeycloakSub: strPtr("mock-sub-3"),
				Nama:        "Ajri Dalae",
				Email:       "ajri.dalae@example.go.id",
				Role:        domain.RoleAdminOPD,
				StatusAkun:  domain.StatusAktif,
				InstansiID:  2,
			},
			{
				ID:          4,
				KeycloakSub: strPtr("mock-sub-4"),
				Nama:        "Derto",
				Email:       "derto@example.go.id",
				Role:        domain.RoleSuperAdmin,
				StatusAkun:  domain.StatusAktif,
				InstansiID:  1,
			},
		}

		for _, u := range users {
			var existing domain.User
			if err := db.Where("email = ?", u.Email).First(&existing).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					if err := db.Create(&u).Error; err != nil {
						return err
					}
				}
			} else {
				// Pastikan keycloak_sub terisi dengan unik
				if existing.KeycloakSub == nil || *existing.KeycloakSub == "" {
					db.Model(&existing).Update("keycloak_sub", u.KeycloakSub)
				}
			}
		}
	}

	log.Println("Seeder data master instansi dan pengguna demo siap.")
	return nil
}
