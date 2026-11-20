package database

import (
	"log"
	"time"

	"spbe-backend/internal/domain"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect membuka koneksi dan memigrasi skema. Data contoh (seeder) hanya diisi bila `isiDataContoh`
// true; di produksi harus false agar tidak ada user, peran, dan data uji (Buku Panduan B.13).
func Connect(dsn string, isDevelopment bool, isiDataContoh bool) (*gorm.DB, error) {
	logLevel := logger.Warn
	if isDevelopment {
		logLevel = logger.Info
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	// Konfigurasi Connection Pool
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("Berhasil terhubung ke database PostgreSQL.")

	// Auto-Migrasi tabel master dan katalog
	if err := db.AutoMigrate(
		&domain.Instansi{},
		&domain.User{},
		&domain.NodeRaa{},
		&domain.Aplikasi{},
		&domain.Flowchart{},
		&domain.FlowchartRiwayat{},
		&domain.PengajuanValidasi{},
		&domain.KategoriDokumen{},
		&domain.Dokumen{},
		&domain.KategoriForum{},
		&domain.ForumThread{},
		&domain.ForumBalasan{},
		&domain.ForumNilai{},
		&domain.ForumLaporan{},
		&domain.ForumPenerima{},
		&domain.ForumLampiran{},
		&domain.AuditLog{},
		&domain.RiwayatBackup{},
		&domain.PeriodePembaruan{},
		&domain.KritikSaran{},
		&domain.ProfilPengguna{},
		&domain.Notifikasi{},
		&domain.Kursus{},
		&domain.MateriKursus{},
		&domain.KursusProgres{},
		&domain.KursusSertifikat{},
		&domain.Artikel{},
	); err != nil {
		return nil, err
	}

	// Halaman Klasifikasi RAA sudah dihapus: pengajuan jenis "raa" lama dijadikan pengajuan aplikasi biasa,
	// dan notifikasi yang menautkan ke halaman itu diarahkan ke Data Aplikasi.
	if err := db.Exec(`UPDATE pengajuan_validasi SET jenis_data = 'aplikasi' WHERE jenis_data = 'raa'`).Error; err != nil {
		return nil, err
	}
	if err := db.Exec(`UPDATE notifikasi SET url_tujuan = '/katalog/aplikasi' WHERE url_tujuan = '/katalog/raa'`).Error; err != nil {
		return nil, err
	}

	// Jalankan seed data awal
	if !isiDataContoh {
		log.Println("Data contoh (seeder) dilewati: SEED_DATA=false.")
		return db, nil
	}
	if err := SeedData(db); err != nil {
		log.Printf("Peringatan saat seeding data: %v", err)
	}

	return db, nil
}

