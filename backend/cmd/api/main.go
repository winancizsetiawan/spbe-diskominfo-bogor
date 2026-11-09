package main

import (
	"log"

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

	// 2. Menghubungkan ke Database PostgreSQL
	db, err := database.Connect(cfg.DSN(), cfg.AppEnv == "development")
	if err != nil {
		log.Printf("[PERINGATAN] Gagal terhubung ke PostgreSQL: %v", err)
		log.Println("[INFO] Pastikan service PostgreSQL lokal Anda aktif, dan database 'spbe_bogor' sudah dibuat.")
		log.Println("[INFO] Anda dapat membuat database di pgAdmin / psql: CREATE DATABASE spbe_bogor;")
	}

	// 3. Inisialisasi Gin Engine
	r := gin.New()
	_ = r.SetTrustedProxies(nil)

	// 4. Pasang middleware standar
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.SetupCORS(cfg.CorsAllowedOrigins))

	// 5. Inisialisasi Handler
	healthHandler := handler.NewHealthHandler()

	// 6. Daftarkan rute API (sesuai prefix /api yang dipanggil frontend)
	api := r.Group("/api")
	{
		api.GET("/health", healthHandler.Check)

		if db != nil {
			instansiRepo := repository.NewInstansiRepository(db)
			referensiHandler := handler.NewReferensiHandler(instansiRepo)

			raaRepo := repository.NewRaaRepository(db)
			aplRepo := repository.NewAplikasiRepository(db)
			aplService := service.NewAplikasiService(aplRepo, raaRepo)
			katalogHandler := handler.NewKatalogHandler(aplService)

			fcRepo := repository.NewFlowchartRepository(db)
			fcService := service.NewFlowchartService(fcRepo)
			fcHandler := handler.NewFlowchartHandler(fcService, aplService)

			valRepo := repository.NewValidasiRepository(db)
			valService := service.NewValidasiService(valRepo)
			valHandler := handler.NewValidasiHandler(valService)

			dokRepo := repository.NewDokumenRepository(db)
			dokService := service.NewDokumenService(dokRepo)
			dokHandler := handler.NewDokumenHandler(dokService)

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
			api.Static("/dokumen/berkas", "./uploads/dokumen")
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
		}
	}

	// 7. Jalankan server
	log.Printf("Server SPBE Backend berjalan di port :%s (Mode: %s)", cfg.Port, cfg.AppEnv)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}
