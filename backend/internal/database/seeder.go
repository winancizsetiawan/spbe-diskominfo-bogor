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

	// 3. Seeder Pohon Referensi Arsitektur Aplikasi (RAA)
	var raaCount int64
	if err := db.Model(&domain.NodeRaa{}).Count(&raaCount).Error; err != nil {
		return err
	}

	if raaCount == 0 {
		log.Println("Mengisi data master pohon RAA...")
		nodes := []domain.NodeRaa{
			// Level 1
			{Kode: "1", Nama: "Layanan Publik", Level: 1, ParentKode: nil},
			{Kode: "2", Nama: "Administrasi Pemerintahan", Level: 1, ParentKode: nil},

			// Level 2
			{Kode: "1.1", Nama: "Kesehatan", Level: 2, ParentKode: strPtr("1")},
			{Kode: "1.2", Nama: "Perizinan dan Pengaduan", Level: 2, ParentKode: strPtr("1")},
			{Kode: "2.1", Nama: "Kepegawaian", Level: 2, ParentKode: strPtr("2")},
			{Kode: "2.2", Nama: "Keuangan dan Pendapatan", Level: 2, ParentKode: strPtr("2")},
			{Kode: "2.3", Nama: "Persuratan dan Data", Level: 2, ParentKode: strPtr("2")},

			// Level 3
			{Kode: "1.1.1", Nama: "Pelayanan Kesehatan Dasar", Level: 3, ParentKode: strPtr("1.1")},
			{Kode: "1.1.2", Nama: "Rujukan dan Rumah Sakit", Level: 3, ParentKode: strPtr("1.1")},
			{Kode: "1.1.3", Nama: "Surveilans dan Imunisasi", Level: 3, ParentKode: strPtr("1.1")},
			{Kode: "1.2.1", Nama: "Perizinan Berusaha", Level: 3, ParentKode: strPtr("1.2")},
			{Kode: "1.2.2", Nama: "Pengaduan Masyarakat", Level: 3, ParentKode: strPtr("1.2")},
			{Kode: "2.1.1", Nama: "Manajemen ASN", Level: 3, ParentKode: strPtr("2.1")},
			{Kode: "2.1.2", Nama: "Kinerja ASN", Level: 3, ParentKode: strPtr("2.1")},
			{Kode: "2.2.1", Nama: "Pengelolaan Pajak Daerah", Level: 3, ParentKode: strPtr("2.2")},
			{Kode: "2.2.2", Nama: "Penganggaran", Level: 3, ParentKode: strPtr("2.2")},
			{Kode: "2.3.1", Nama: "Tata Naskah Dinas", Level: 3, ParentKode: strPtr("2.3")},
			{Kode: "2.3.2", Nama: "Data dan Statistik", Level: 3, ParentKode: strPtr("2.3")},
		}

		for _, n := range nodes {
			if err := db.Where("kode = ?", n.Kode).FirstOrCreate(&n).Error; err != nil {
				return err
			}
		}
	}

	// 4. Seeder Contoh Aplikasi
	var aplCount int64
	if err := db.Model(&domain.Aplikasi{}).Count(&aplCount).Error; err != nil {
		return err
	}

	if aplCount == 0 {
		log.Println("Mengisi data contoh katalog aplikasi...")
		aplikasiList := []domain.Aplikasi{
			{
				ID:             1,
				InstansiID:     2, // Dinas Kesehatan
				Nama:           "SIKDA",
				Deskripsi:      "Sistem informasi kesehatan daerah untuk puskesmas.",
				Kategori:       strPtr("Pelayanan Publik"),
				RaaLevel1:      strPtr("1"),
				RaaLevel2:      strPtr("1.1"),
				RaaLevel3:      strPtr("1.1.1"),
				StatusValidasi: domain.StatusDisetujui,
			},
			{
				ID:              2,
				InstansiID:      2, // Dinas Kesehatan
				Nama:            "e-Puskesmas",
				Deskripsi:       "Rekam medis elektronik puskesmas.",
				Kategori:        strPtr("Pelayanan Publik"),
				RaaLevel1:       strPtr("1"),
				RaaLevel2:       strPtr("1.1"),
				StatusValidasi:  domain.StatusPerluRevisi,
				CatatanValidasi: strPtr("Lengkapi RAA Level 3 sesuai pedoman."),
			},
			{
				ID:             3,
				InstansiID:     2, // Dinas Kesehatan
				Nama:           "SIMRS Rujukan",
				Deskripsi:      "Pengelolaan rujukan pasien antar-fasilitas kesehatan.",
				Kategori:       strPtr("Pelayanan Publik"),
				RaaLevel1:      strPtr("1"),
				RaaLevel2:      strPtr("1.1"),
				RaaLevel3:      strPtr("1.1.2"),
				StatusValidasi: domain.StatusMenunggu,
			},
			{
				ID:             4,
				InstansiID:     2, // Dinas Kesehatan
				Nama:           "Sehat Bogor Mobile",
				Deskripsi:      "Aplikasi informasi layanan kesehatan untuk warga.",
				Kategori:       strPtr("Pelayanan Publik"),
				StatusValidasi: domain.StatusDraft,
			},
			{
				ID:             5,
				InstansiID:     1, // Diskominfo
				Nama:           "Portal Satu Data",
				Deskripsi:      "Portal data sektoral Kota Bogor.",
				Kategori:       strPtr("Manajemen"),
				RaaLevel1:      strPtr("2"),
				RaaLevel2:      strPtr("2.3"),
				RaaLevel3:      strPtr("2.3.2"),
				StatusValidasi: domain.StatusDisetujui,
			},
			{
				ID:             6,
				InstansiID:     3, // Bapenda
				Nama:           "e-SPPT PBB",
				Deskripsi:      "Penyampaian SPPT PBB secara elektronik kepada wajib pajak.",
				Kategori:       strPtr("Pelayanan Publik"),
				RaaLevel1:      strPtr("2"),
				RaaLevel2:      strPtr("2.2"),
				RaaLevel3:      strPtr("2.2.1"),
				StatusValidasi: domain.StatusDisetujui,
			},
		}

		for _, apl := range aplikasiList {
			apl.HitungKesesuaian()
			if err := db.Where("id = ?", apl.ID).FirstOrCreate(&apl).Error; err != nil {
				return err
			}
		}
	}

	// 5. Seeder Data Pengajuan Validasi Awal
	var valCount int64
	if err := db.Model(&domain.PengajuanValidasi{}).Count(&valCount).Error; err != nil {
		return err
	}

	if valCount == 0 {
		log.Println("Mengisi data contoh pengajuan validasi...")
		targetSIMRS := uint(3)
		targetEPuskesmas := uint(2)
		targetSIKDA := uint(1)

		validasiList := []domain.PengajuanValidasi{
			{
				ID:         1,
				JenisData:  domain.JenisDataAplikasi,
				Status:     domain.StatusMenunggu,
				InstansiID: 2, // Dinas Kesehatan
				AplikasiID: &targetSIMRS,
				Pengaju:    "Ajri Dalae",
			},
			{
				ID:         2,
				JenisData:  domain.JenisDataRaa,
				Status:     domain.StatusPerluRevisi,
				InstansiID: 2, // Dinas Kesehatan
				AplikasiID: &targetEPuskesmas,
				Pengaju:    "Ajri Dalae",
				Catatan:    strPtr("Lengkapi RAA Level 3 sesuai pedoman."),
			},
			{
				ID:         3,
				JenisData:  domain.JenisDataAplikasi,
				Status:     domain.StatusDisetujui,
				InstansiID: 2, // Dinas Kesehatan
				AplikasiID: &targetSIKDA,
				Pengaju:    "Ajri Dalae",
			},
		}

		for _, v := range validasiList {
			if err := db.Where("id = ?", v.ID).FirstOrCreate(&v).Error; err != nil {
				return err
			}
		}
	}

	log.Println("Seeder data master instansi, pengguna, RAA, aplikasi, dan validasi siap.")
	return nil
}
