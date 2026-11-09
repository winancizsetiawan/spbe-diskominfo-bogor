package database

import (
	"log"
	"time"

	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

func strPtr(s string) *string {
	return &s
}

func uintPtr(u uint) *uint {
	return &u
}

func hariLalu(hari int) time.Time {
	return time.Now().AddDate(0, 0, -hari)
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

	// 6. Seeder Kategori SOP & Dokumen Repositori
	var katCount int64
	if err := db.Model(&domain.KategoriDokumen{}).Count(&katCount).Error; err != nil {
		return err
	}

	if katCount == 0 {
		log.Println("Mengisi data master kategori SOP...")
		kategoriList := []domain.KategoriDokumen{
			{ID: 10, Nama: "Manajemen Aplikasi"},
			{ID: 11, Nama: "Keamanan Informasi"},
			{ID: 12, Nama: "Layanan Publik"},
		}
		for _, k := range kategoriList {
			if err := db.Where("id = ?", k.ID).FirstOrCreate(&k).Error; err != nil {
				return err
			}
		}
	}

	var dokCount int64
	if err := db.Model(&domain.Dokumen{}).Count(&dokCount).Error; err != nil {
		return err
	}

	if dokCount == 0 {
		log.Println("Mengisi data awal repositori dokumen & SOP...")
		dokumenList := []domain.Dokumen{
			{ID: 1, Jenis: domain.JenisRegulasi, Judul: "Peraturan Presiden No. 95 Tahun 2018 tentang SPBE", Deskripsi: "Dasar hukum penyelenggaraan Sistem Pemerintahan Berbasis Elektronik di instansi pusat dan pemerintah daerah.", TipeBerkas: domain.TipePDF, UkuranMb: 2.4, Versi: "1.0", Sumber: strPtr("Sekretariat Negara"), Status: domain.StatusDokBerlaku, Visibilitas: domain.VisibilitasPublik, JumlahUnduhan: 12340, TanggalRilis: hariLalu(140)},
			{ID: 2, Jenis: domain.JenisPedoman, Judul: "Pedoman Penyusunan Arsitektur SPBE Pemerintah Daerah", Deskripsi: "Panduan menyusun arsitektur proses bisnis, data, aplikasi, infrastruktur, dan keamanan SPBE di tingkat daerah.", TipeBerkas: domain.TipeDOCX, UkuranMb: 1.8, Versi: "2.1", Sumber: strPtr("Kementerian PANRB"), Status: domain.StatusDokBerlaku, Visibilitas: domain.VisibilitasPublik, JumlahUnduhan: 8920, TanggalRilis: hariLalu(95)},
			{ID: 3, Jenis: domain.JenisTemplate, Judul: "Template RAA Aplikasi Pemerintah", Deskripsi: "Lembar kerja untuk mendata dan mengklasifikasikan aplikasi ke dalam Referensi Arsitektur Aplikasi Level 1–3.", TipeBerkas: domain.TipeXLSX, UkuranMb: 0.9, Versi: "1.2", Sumber: strPtr("Diskominfo Kota Bogor"), Status: domain.StatusDokBerlaku, Visibilitas: domain.VisibilitasInternal, JumlahUnduhan: 4210, TanggalRilis: hariLalu(60)},
			{ID: 4, Jenis: domain.JenisLaporan, Judul: "Laporan Evaluasi Indeks SPBE Nasional Tahun 2023", Deskripsi: "Hasil evaluasi nasional beserta rekomendasi peningkatan domain kebijakan, tata kelola, layanan, dan manajemen pengetahuan.", TipeBerkas: domain.TipePDF, UkuranMb: 3.1, Versi: "1.0", Sumber: strPtr("Kementerian PANRB"), Status: domain.StatusDokBerlaku, Visibilitas: domain.VisibilitasPublik, JumlahUnduhan: 2980, TanggalRilis: hariLalu(210)},
			{ID: 5, Jenis: domain.JenisPresentasi, Judul: "Paparan Peta Rencana SPBE Kota Bogor 2025–2030", Deskripsi: "Materi paparan arah kebijakan dan program SPBE Kota Bogor, termasuk program Pengembangan Aplikasi Manajemen Pengetahuan.", TipeBerkas: domain.TipePPTX, UkuranMb: 5.6, Versi: "1.0", Sumber: strPtr("Diskominfo Kota Bogor"), Status: domain.StatusDokBerlaku, Visibilitas: domain.VisibilitasInternal, JumlahUnduhan: 640, TanggalRilis: hariLalu(35)},
			{ID: 6, Jenis: domain.JenisRegulasi, Judul: "Peraturan Wali Kota Bogor tentang Tata Naskah Dinas", Deskripsi: "Ketentuan format, penomoran, dan tata cara penyelenggaraan naskah dinas di lingkungan Pemerintah Kota Bogor.", TipeBerkas: domain.TipePDF, UkuranMb: 1.2, Versi: "1.0", Sumber: strPtr("Pemerintah Kota Bogor"), Status: domain.StatusDokBerlaku, Visibilitas: domain.VisibilitasPublik, JumlahUnduhan: 1520, TanggalRilis: hariLalu(300)},
			{ID: 7, Jenis: domain.JenisPanduan, Judul: "Panduan Teknis Integrasi Aplikasi melalui SPLP", Deskripsi: "Langkah teknis mendaftarkan dan menghubungkan aplikasi OPD ke Sistem Penghubung Layanan Pemerintah Kota Bogor.", TipeBerkas: domain.TipePDF, UkuranMb: 2.9, Versi: "1.1", Sumber: strPtr("Diskominfo Kota Bogor"), Status: domain.StatusDokBerlaku, Visibilitas: domain.VisibilitasInternal, JumlahUnduhan: 1870, TanggalRilis: hariLalu(48)},
			{ID: 8, Jenis: domain.JenisLaporan, Judul: "Laporan Standardisasi Aplikasi Triwulan II", Deskripsi: "Rekap hasil asesmen standardisasi aplikasi OPD pada triwulan II.", TipeBerkas: domain.TipePDF, UkuranMb: 1.7, Versi: "0.9", Sumber: strPtr("Diskominfo Kota Bogor"), Status: domain.StatusDokReview, Visibilitas: domain.VisibilitasInternal, JumlahUnduhan: 310, TanggalRilis: hariLalu(12)},
			{ID: 9, Jenis: domain.JenisSOP, Judul: "SOP Manajemen Aplikasi Pemerintahan", Deskripsi: "Tata kelola siklus pengembangan, pengujian kelayakan kode, dan pemeliharaan interoperabilitas aplikasi pemerintah.", TipeBerkas: domain.TipePDF, UkuranMb: 2.1, Versi: "2.4", Sumber: strPtr("Revisi Kemenkominfo"), Status: domain.StatusDokBerlaku, Visibilitas: domain.VisibilitasInternal, JumlahUnduhan: 6450, IdKategori: uintPtr(10), TanggalRilis: hariLalu(16)},
			{ID: 10, Jenis: domain.JenisSOP, Judul: "SOP Pengelolaan Data SPBE", Deskripsi: "Ketentuan pengelolaan metadata, standardisasi interoperabilitas basis data induk, dan mekanisme pertukaran data antar-instansi.", TipeBerkas: domain.TipePDF, UkuranMb: 1.5, Versi: "1.8", Sumber: strPtr("Diskominfo Kota Bogor"), Status: domain.StatusDokBerlaku, Visibilitas: domain.VisibilitasInternal, JumlahUnduhan: 4320, IdKategori: uintPtr(10), TanggalRilis: hariLalu(20)},
			{ID: 11, Jenis: domain.JenisSOP, Judul: "SOP Keamanan Informasi", Deskripsi: "Protokol mitigasi insiden siber, manajemen hak akses, kriptografi, dan audit berkala sesuai ISO/IEC 27001 sektor publik.", TipeBerkas: domain.TipeDOCX, UkuranMb: 2.8, Versi: "3.0", Sumber: strPtr("BSSN Conformance"), Status: domain.StatusDokBerlaku, Visibilitas: domain.VisibilitasInternal, JumlahUnduhan: 3980, IdKategori: uintPtr(11), TanggalRilis: hariLalu(23)},
			{ID: 12, Jenis: domain.JenisSOP, Judul: "SOP Layanan Publik Digital", Deskripsi: "Kriteria integrasi layanan ke Mal Pelayanan Publik Digital, kepatuhan SLA respons aduan, dan aksesibilitas.", TipeBerkas: domain.TipeDOCX, UkuranMb: 1.9, Versi: "3.0", Sumber: strPtr("Diskominfo Kota Bogor"), Status: domain.StatusDokBerlaku, Visibilitas: domain.VisibilitasPublik, JumlahUnduhan: 2450, IdKategori: uintPtr(12), TanggalRilis: hariLalu(27)},
			{ID: 13, Jenis: domain.JenisSOP, Judul: "SOP Penanganan Gangguan TI", Deskripsi: "Alur pelaporan, eskalasi, dan pemulihan gangguan layanan teknologi informasi di lingkungan OPD.", TipeBerkas: domain.TipePDF, UkuranMb: 1.1, Versi: "1.0", Sumber: strPtr("Diskominfo Kota Bogor"), Status: domain.StatusDokReview, Visibilitas: domain.VisibilitasInternal, JumlahUnduhan: 120, IdKategori: uintPtr(11), TanggalRilis: hariLalu(6)},
			{ID: 14, Jenis: domain.JenisSOP, Judul: "SOP Pendaftaran Domain dan Hosting", Deskripsi: "Prosedur permohonan subdomain kotabogor.go.id dan fasilitas hosting setelah asesmen standardisasi.", TipeBerkas: domain.TipePDF, UkuranMb: 0.8, Versi: "1.3", Sumber: strPtr("Diskominfo Kota Bogor"), Status: domain.StatusDokBerlaku, Visibilitas: domain.VisibilitasInternal, JumlahUnduhan: 980, IdKategori: uintPtr(10), TanggalRilis: hariLalu(70)},
			{ID: 15, Jenis: domain.JenisSOP, Judul: "SOP Backup dan Pemulihan Data", Deskripsi: "Backup harian, retensi 7 hari, dan uji pemulihan data aplikasi termasuk berkas unggahan.", TipeBerkas: domain.TipePDF, UkuranMb: 1.0, Versi: "1.0", Sumber: strPtr("Diskominfo Kota Bogor"), Status: domain.StatusDokReview, Visibilitas: domain.VisibilitasInternal, JumlahUnduhan: 75, IdKategori: uintPtr(11), TanggalRilis: hariLalu(4)},
			{ID: 16, Jenis: domain.JenisPedoman, Judul: "Draf Pedoman Klasifikasi RAA", Deskripsi: "Konsep pedoman, belum disetujui.", TipeBerkas: domain.TipeDOCX, UkuranMb: 0.6, Versi: "0.1", Sumber: nil, Status: domain.StatusDokDraft, Visibilitas: domain.VisibilitasInternal, JumlahUnduhan: 0, TanggalRilis: hariLalu(2)},
			{ID: 17, Jenis: domain.JenisRegulasi, Judul: "Peraturan Lama tentang Aplikasi Daerah (dicabut)", Deskripsi: "Sudah digantikan.", TipeBerkas: domain.TipePDF, UkuranMb: 0.7, Versi: "1.0", Sumber: nil, Status: domain.StatusDokArsip, Visibilitas: domain.VisibilitasPublik, JumlahUnduhan: 52, TanggalRilis: hariLalu(900)},
		}

		for _, d := range dokumenList {
			if err := db.Where("id = ?", d.ID).FirstOrCreate(&d).Error; err != nil {
				return err
			}
		}
		// Reset sequence ID PostgreSQL agar insert dokumen baru tidak bentrok dengan ID 1..17
		_ = db.Exec("SELECT setval(pg_get_serial_sequence('dokumen', 'id'), COALESCE((SELECT MAX(id) FROM dokumen), 1), true);").Error
	}

	log.Println("Seeder data master instansi, pengguna, RAA, aplikasi, validasi, dan dokumen siap.")
	return nil
}
