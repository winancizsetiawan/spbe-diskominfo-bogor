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
		}
	}

	// 7. Jalankan server
	log.Printf("Server SPBE Backend berjalan di port :%s (Mode: %s)", cfg.Port, cfg.AppEnv)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}
