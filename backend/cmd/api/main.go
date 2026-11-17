package main

import (
	"fmt"
	"log"
	"time"

	"spbe-backend/internal/auth"
	"spbe-backend/internal/backup"
	"spbe-backend/internal/config"
	"spbe-backend/internal/database"
	"spbe-backend/internal/handler"
	"spbe-backend/internal/middleware"
	"spbe-backend/internal/repository"
	"spbe-backend/internal/service"

	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Membaca konfigurasi aplikasi
	cfg := config.LoadConfig()

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Autentikasi: salah konfigurasi di produksi menghentikan server, bukan jatuh ke mode demo.
	authCfg := auth.Config{Mode: cfg.AuthMode, Issuer: cfg.KeycloakIssuer, JWKSURL: cfg.KeycloakJWKSURL, ClientID: cfg.KeycloakClientID}
	if err := auth.Validasi(authCfg, cfg.AppEnv == "production"); err != nil {
		log.Fatalf("Konfigurasi autentikasi tidak valid: %v", err)
	}
	auth.Init(authCfg)
	if err := auth.ValidasiRahasiaSesi(cfg.SesiSecret, cfg.AppEnv == "production"); err != nil {
		log.Fatalf("Konfigurasi sesi tidak valid: %v", err)
	}
	auth.AturSesi(cfg.SesiSecret, time.Duration(cfg.SesiDurasiJam)*time.Hour)
	if cfg.SesiSecret == "" {
		log.Println("[PERINGATAN] SESI_SECRET kosong: rahasia sesi acak dipakai; semua sesi login gugur saat server restart.")
	}
	// Kata sandi demo per peran hanya untuk pengembangan lokal.
	service.AktifkanSandiDemo(cfg.AppEnv == "development")
	if cfg.AuthMode == auth.ModeDemo {
		log.Println("[PERINGATAN] AUTH_MODE=demo: token \"demo.<peran>\" diterima. Hanya untuk pengembangan lokal.")
	}

	// 2. Menghubungkan ke Database PostgreSQL
	db, err := database.Connect(cfg.DSN(), cfg.AppEnv == "development", cfg.SeedData)
	if err != nil {
		log.Printf("[PERINGATAN] Gagal terhubung ke PostgreSQL: %v", err)
		log.Println("[INFO] Pastikan service PostgreSQL lokal Anda aktif, dan database 'spbe_bogor' sudah dibuat.")
		log.Println("[INFO] Anda dapat membuat database di pgAdmin / psql: CREATE DATABASE spbe_bogor;")
	}

	// 3. Inisialisasi Gin Engine
	r := gin.New()
	if err := r.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		log.Fatalf("TRUSTED_PROXIES tidak valid: %v", err)
	}

	// 4. Pasang middleware standar
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.HeaderKeamanan(cfg.AppEnv == "production"))
	r.Use(middleware.SetupCORS(cfg.CorsAllowedOrigins))
	r.Use(middleware.BatasLaju(600, time.Minute))

	// 5. Inisialisasi Handler
	healthHandler := handler.NewHealthHandler()

	// 6. Daftarkan rute API (sesuai prefix /api yang dipanggil frontend)
	api := r.Group("/api")
	{
		api.GET("/health", healthHandler.Check)

		// Dasbor arsitektur SPBE: data dari berkas JSON (bukan database), jadi tetap tersedia walau DB mati.
		dasborArsitektur := handler.NewDasborArsitekturHandler(cfg.DasborDataDir)
		api.GET("/dasbor/publik", dasborArsitektur.GetPublik)
		api.GET("/dasbor/analitik", dasborArsitektur.GetAnalitik)

		if db != nil {
			if n, err := service.HashSandiTeksBiasa(db); err != nil {
				log.Printf("[PERINGATAN] Gagal men-hash kata sandi lama: %v", err)
			} else if n > 0 {
				log.Printf("%d kata sandi teks biasa diganti hash.", n)
			}
			if n, err := service.NormalisasiPeranVerifikator(db); err != nil {
				log.Printf("[PERINGATAN] Gagal merapikan peran Verifikator: %v", err)
			} else if n > 0 {
				log.Printf("%d akun Verifikator lama dijadikan peran tambahan ASN.", n)
			}

			instansiRepo := repository.NewInstansiRepository(db)
			referensiHandler := handler.NewReferensiHandler(instansiRepo)

			raaRepo := repository.NewRaaRepository(db)
			aplRepo := repository.NewAplikasiRepository(db)
			aplService := service.NewAplikasiService(aplRepo, raaRepo)
			katalogHandler := handler.NewKatalogHandler(aplService)

			dokRepo := repository.NewDokumenRepository(db)
			dokService := service.NewDokumenService(dokRepo)
			dokHandler := handler.NewDokumenHandler(dokService)

			fcRepo := repository.NewFlowchartRepository(db)
			fcService := service.NewFlowchartService(fcRepo)
			fcHandler := handler.NewFlowchartHandler(fcService, aplService, dokService)

			valRepo := repository.NewValidasiRepository(db)
			valService := service.NewValidasiService(valRepo)
			valHandler := handler.NewValidasiHandler(valService)

			forumRepo := repository.NewForumRepository(db)
			forumService := service.NewForumService(forumRepo)
			forumHandler := handler.NewForumHandler(forumService)

			sistemRepo := repository.NewSistemRepository(db)
			sistemService := service.NewSistemService(sistemRepo)
			pelaksanaBackup := &backup.Runner{
				PgDump: cfg.PgDumpPath, Dir: cfg.BackupDir, UploadsDir: cfg.UploadsDir, Retensi: cfg.BackupRetensi,
				Host: cfg.DBHost, Port: cfg.DBPort, User: cfg.DBUser, Password: cfg.DBPassword, DBName: cfg.DBName,
			}
			sistemService.PasangBackup(pelaksanaBackup, cfg.BackupJam)
			if err := pelaksanaBackup.Siap(); err != nil {
				log.Printf("[PERINGATAN] Backup tidak aktif: %v", err)
			} else {
				jadwalkanBackupHarian(sistemService, cfg.BackupJam, cfg.DBTimeZone)
			}
			sistemHandler := handler.NewSistemHandler(sistemService)

			// Pembaruan data Dasbor Publik/Analitik dari Excel (Super Admin).
			dataDasbor := handler.NewDataDasborHandler(cfg.DasborDataDir, sistemService.CatatAktivitas)
			api.GET("/dasbor/data", dataDasbor.GetStatus)
			api.POST("/dasbor/data/pratinjau", dataDasbor.Pratinjau)
			api.POST("/dasbor/data/terapkan", dataDasbor.Terapkan)
			api.POST("/dasbor/data/pulihkan", dataDasbor.Pulihkan)

			pmRepo := repository.NewPenggunaModulRepository(db)
			handler.ResolverPengguna = pmRepo.FindUserByRole
			pmService := service.NewPenggunaModulService(pmRepo, sistemService)
			if cfg.TNDLoginURL != "" {
				pmService.PasangTND(service.NewKlienTND(cfg.TNDLoginURL, time.Duration(cfg.TNDBatasWaktuDetik)*time.Second))
				log.Printf("Login ASN lewat TND aktif: %s", cfg.TNDLoginURL)
			}
			pmHandler := handler.NewPenggunaModulHandler(pmService)

			portalRepo := repository.NewPortalModulRepository(db)
			portalService := service.NewPortalModulService(portalRepo)
			portalHandler := handler.NewPortalModulHandler(portalService)

			// Rute Referensi Master
			api.GET("/referensi/instansi", referensiHandler.GetInstansi)
			api.GET("/referensi/raa", katalogHandler.GetReferensiRaa)

			// Rute Katalog Aplikasi
			api.GET("/aplikasi/ringkasan", katalogHandler.GetRingkasan)
			api.GET("/aplikasi/siap-diajukan", katalogHandler.GetSiapDiajukan)
			api.GET("/aplikasi", katalogHandler.GetDaftar)
			api.GET("/aplikasi/:id", katalogHandler.GetDetail)
			api.POST("/aplikasi", katalogHandler.Create)
			api.PUT("/aplikasi/:id", katalogHandler.Update)

			// Rute Flowchart Proses Bisnis
			api.GET("/flowchart/opsi", fcHandler.GetOpsi)
			api.GET("/flowchart", fcHandler.GetDaftar)
			api.GET("/flowchart/:id", fcHandler.GetDetail)
			api.POST("/flowchart", fcHandler.Create)
			api.PUT("/flowchart/:id", fcHandler.Update)

			// Rute Validasi & Approval Data (Diskominfo)
			api.GET("/validasi", valHandler.GetDaftar)
			api.GET("/validasi/:id", valHandler.GetDetail)
			api.POST("/validasi", valHandler.Ajukan)
			api.POST("/validasi/:id/keputusan", valHandler.Putuskan)

			// Rute Dokumen SPBE, SOP Pemerintahan, & Admin Repositori
			api.GET("/dokumen/berkas/:nama", dokHandler.BerkasUnduh)
			api.GET("/dokumen/ringkasan", dokHandler.GetRingkasan)
			api.GET("/dokumen/kategori", dokHandler.GetKategori)
			api.GET("/dokumen", dokHandler.List)
			api.POST("/dokumen/unggah/mulai", dokHandler.MulaiUnggah)
			api.POST("/dokumen/unggah/berkas/:idSesi", dokHandler.UnggahBerkas)
			api.POST("/dokumen/unggah/selesai", dokHandler.SelesaiUnggah)
			api.GET("/dokumen/:id", dokHandler.GetByID)
			api.GET("/dokumen/:id/unduh", dokHandler.Unduh)
			api.PATCH("/dokumen/:id", dokHandler.UbahStatus)
			api.GET("/admin/dokumen", dokHandler.ListAdmin)

			// Rute Forum Diskusi & Moderasi Konten
			api.GET("/forum/kategori", forumHandler.GetKategori)
			api.GET("/forum/thread", forumHandler.ListThread)
			api.POST("/forum/thread", forumHandler.BuatThread)
			api.GET("/forum/thread/:id", forumHandler.GetThreadDetail)
			api.POST("/forum/thread/:id/balasan", forumHandler.BuatBalasan)
			api.PUT("/forum/thread/:id/penerima", forumHandler.UbahPenerima)
			api.GET("/forum/pengguna", forumHandler.CariPengguna)
			api.POST("/forum/lampiran", forumHandler.UnggahLampiran)
			api.GET("/forum/lampiran/:nama", forumHandler.LampiranUnduh)
			api.PUT("/forum/balasan/:id/nilai", forumHandler.ToggleNilaiBalasan)
			api.POST("/forum/laporan", forumHandler.BuatLaporan)
			api.GET("/moderasi", forumHandler.ListModerasi)
			api.POST("/moderasi/tindakan", forumHandler.TindakanModerasi)

			// Rute Sistem (Audit Trail, Backup, Periode Pembaruan Data) & Kritik Saran
			api.GET("/audit", sistemHandler.ListAudit)
			api.GET("/backup", sistemHandler.GetBackup)
			api.POST("/backup", sistemHandler.MulaiBackup)
			api.GET("/periode", sistemHandler.GetPeriode)
			api.POST("/periode", sistemHandler.BuatPeriode)
			api.PUT("/periode/:id", sistemHandler.UbahPeriode)
			api.DELETE("/periode/:id", sistemHandler.HapusPeriode)
			api.POST("/kritik", sistemHandler.KirimKritik)
			api.GET("/kritik", sistemHandler.ListKritik)

			// Rute Auth, Profil, Manajemen Pengguna, Notifikasi, & Pembelajaran (LMS)
			api.POST("/auth/login", pmHandler.Login)
			api.POST("/auth/switch-role", pmHandler.SwitchRole)
			api.POST("/auth/ubah-sandi", pmHandler.UbahSandi)
			// Alat uji kebijakan sandi tahunan: tidak boleh ada di produksi.
			if cfg.AppEnv == "development" {
				api.POST("/auth/simulasi-kedaluwarsa", pmHandler.SimulasiKedaluwarsaSandi)
			}
			api.GET("/me", pmHandler.GetMe)
			api.GET("/profil", pmHandler.GetProfil)
			api.PUT("/profil", pmHandler.UbahProfil)
			api.GET("/profil/preferensi", pmHandler.GetPreferensi)
			api.PUT("/profil/preferensi", pmHandler.UbahPreferensi)
			api.GET("/profil/aktivitas", pmHandler.ListAktivitasSaya)

			api.GET("/pengguna/instansi", pmHandler.GetInstansiPengguna)
			api.GET("/pengguna", pmHandler.ListPengguna)
			api.POST("/pengguna", pmHandler.UndangPengguna)
			api.PATCH("/pengguna/:id", pmHandler.UbahPengguna)
			api.DELETE("/pengguna/:id", pmHandler.HapusPengguna)
			api.POST("/pengguna/:id/undang-ulang", pmHandler.UndangUlang)

			api.GET("/notifikasi/ringkas", pmHandler.GetRingkasNotifikasi)
			api.GET("/notifikasi", pmHandler.ListNotifikasi)
			api.POST("/notifikasi/dibaca-semua", pmHandler.TandaiDibacaSemua)
			api.POST("/notifikasi/:id/dibaca", pmHandler.TandaiDibaca)

			api.GET("/kursus", pmHandler.ListKursus)
			api.GET("/kursus/:id", pmHandler.GetKursusDetail)
			api.PUT("/kursus/:id/materi/:materi/selesai", pmHandler.TandaiMateriSelesai)

			// Rute Beranda, Artikel/Berita, Bantuan, Dasbor, & Pencarian Global
			api.GET("/artikel", portalHandler.ListArtikel)
			api.GET("/artikel/verifikasi", portalHandler.ListVerifikasiArtikel)
			api.GET("/artikel/:id", portalHandler.GetArtikelDetail)
			api.POST("/artikel", portalHandler.BuatArtikel)
			api.PUT("/artikel/:id", portalHandler.UbahArtikel)
			api.POST("/artikel/:id/verifikasi", portalHandler.VerifikasiArtikel)
			api.GET("/bantuan", portalHandler.GetBantuan)

			api.GET("/beranda/publik", portalHandler.GetBerandaPublik)
			api.GET("/beranda", portalHandler.GetBeranda)

			api.GET("/dasbor/instansi", portalHandler.GetDasborInstansi)
			api.GET("/dasbor/embed", portalHandler.GetDasborEmbed)

			api.GET("/cari", portalHandler.Cari)
		}
	}

	// 7. Jalankan server
	log.Printf("Server SPBE Backend berjalan di port :%s (Mode: %s)", cfg.Port, cfg.AppEnv)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}

// jadwalkanBackupHarian menjalankan backup otomatis setiap hari pada jam "HH:MM" di zona waktu yang diberikan.
func jadwalkanBackupHarian(svc *service.SistemService, jamMenit, zona string) {
	var jam, menit int
	if _, err := fmt.Sscanf(jamMenit, "%d:%d", &jam, &menit); err != nil || jam < 0 || jam > 23 || menit < 0 || menit > 59 {
		log.Printf("[PERINGATAN] BACKUP_JAM %q tidak valid, memakai 02:00", jamMenit)
		jam, menit = 2, 0
	}
	loc, err := time.LoadLocation(zona)
	if err != nil {
		loc = time.Local
	}
	go func() {
		for {
			berikut := backup.WaktuBerikutnya(time.Now().In(loc), jam, menit)
			log.Printf("Backup otomatis berikutnya: %s", berikut.Format("2006-01-02 15:04 MST"))
			time.Sleep(time.Until(berikut))
			if err := svc.JalankanBackupOtomatis(); err != nil {
				log.Printf("[PERINGATAN] Backup otomatis: %v", err)
			}
		}
	}()
}
