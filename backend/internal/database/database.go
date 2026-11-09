package database

import (
	"log"
	"time"

	"spbe-backend/internal/domain"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(dsn string, isDevelopment bool) (*gorm.DB, error) {
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
	); err != nil {
		return nil, err
	}

	// Jalankan seed data awal
	if err := SeedData(db); err != nil {
		log.Printf("Peringatan saat seeding data: %v", err)
	}

	return db, nil
}

