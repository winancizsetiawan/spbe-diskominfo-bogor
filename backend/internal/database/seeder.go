package database

import (
	"log"

	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

// SeedData mengisi data master instansi dan akun demo jika tabel masih kosong
func SeedData(db *gorm.DB) error {
	var count int64
	if err := db.Model(&domain.Instansi{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		return nil // Data sudah ada
	}

	log.Println("Menjalankan seeder data awal master instansi dan pengguna demo...")

	// 1. Data Instansi / OPD
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
		if err := db.FirstOrCreate(&inst, domain.Instansi{ID: inst.ID}).Error; err != nil {
			return err
		}
	}

	// 2. Data Pengguna Demo (sesuai yang dipakai di frontend mock)
	users := []domain.User{
		{
			ID:         1,
			Nama:       "Andi Pratama",
			Email:      "andi.pratama@example.go.id",
			Role:       domain.RoleASN,
			StatusAkun: domain.StatusAktif,
			InstansiID: 1,
		},
		{
			ID:         2,
			Nama:       "Siti Rahma",
			Email:      "siti.rahma@example.ac.id",
			Role:       domain.RoleAkademisi,
			StatusAkun: domain.StatusAktif,
			InstansiID: 10,
		},
		{
			ID:         3,
			Nama:       "Ajri Dalae",
			Email:      "ajri.dalae@example.go.id",
			Role:       domain.RoleAdminOPD,
			StatusAkun: domain.StatusAktif,
			InstansiID: 2,
		},
		{
			ID:         4,
			Nama:       "Derto",
			Email:      "derto@example.go.id",
			Role:       domain.RoleSuperAdmin,
			StatusAkun: domain.StatusAktif,
			InstansiID: 1,
		},
	}

	for _, u := range users {
		if err := db.FirstOrCreate(&u, domain.User{Email: u.Email}).Error; err != nil {
			return err
		}
	}

	log.Println("Seeder data awal berhasil dimasukkan.")
	return nil
}

