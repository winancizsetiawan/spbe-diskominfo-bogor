package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	AppEnv             string
	CorsAllowedOrigins []string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	DBTimeZone string

	// Folder berisi dasborPublik.json dan dasborInternal.json (dibuat frontend/scripts/excel_dasbor_publik.py).
	DasborDataDir string

	// Autentikasi. Mode "demo" hanya untuk pengembangan; produksi wajib "keycloak".
	AuthMode         string
	KeycloakIssuer   string
	KeycloakJWKSURL  string
	KeycloakClientID string

	// Token sesi portal (login lewat halaman portal). Produksi wajib SESI_SECRET >= 32 karakter acak.
	SesiSecret    string
	SesiDurasiJam int

	// Login ASN lewat akun TND Pemkot Bogor. Kosong = login TND dimatikan.
	TNDLoginURL        string
	TNDBatasWaktuDetik int

	// Backup nyata (pg_dump + arsip unggahan).
	PgDumpPath    string
	BackupDir     string
	BackupRetensi int
	BackupJam     string // "HH:MM", waktu mengikuti DB_TIMEZONE
	UploadsDir    string

	// Alamat proxy tepercaya (mis. nginx di 127.0.0.1) agar IP klien dibaca dari X-Forwarded-For.
	// Kosong = tidak ada proxy; IP klien diambil dari sambungan langsung.
	TrustedProxies []string

	// Mengisi data contoh saat start. Bawaan: hanya di pengembangan.
	SeedData bool
}

func (c *Config) DSN() string {
	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		c.DBHost, c.DBUser, c.DBPassword, c.DBName, c.DBPort, c.DBSSLMode, c.DBTimeZone)
}

func LoadConfig() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("Info: File .env tidak ditemukan, menggunakan variabel lingkungan bawaan.")
	}

	port := getEnv("PORT", "8080")
	appEnv := getEnv("APP_ENV", "development")
	corsRaw := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")

	origins := strings.Split(corsRaw, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}

	return &Config{
		Port:               port,
		AppEnv:             appEnv,
		CorsAllowedOrigins: origins,

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "spbe_bogor"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),
		DBTimeZone: getEnv("DB_TIMEZONE", "Asia/Jakarta"),

		DasborDataDir: getEnv("DASBOR_DATA_DIR", "./data/dasbor"),

		AuthMode:         getEnv("AUTH_MODE", authModeBawaan(appEnv)),
		KeycloakIssuer:   strings.TrimRight(getEnv("KEYCLOAK_ISSUER", ""), "/"),
		KeycloakJWKSURL:  getEnv("KEYCLOAK_JWKS_URL", ""),
		KeycloakClientID: getEnv("KEYCLOAK_CLIENT_ID", ""),

		SesiSecret:    getEnv("SESI_SECRET", ""),
		SesiDurasiJam: getEnvInt("SESI_DURASI_JAM", 8),

		TNDLoginURL:        strings.TrimSpace(getEnv("TND_LOGIN_URL", "https://tnd.kotabogor.go.id/api-baru/api/v1/login")),
		TNDBatasWaktuDetik: getEnvInt("TND_BATAS_WAKTU_DETIK", 10),

		PgDumpPath:    getEnv("PG_DUMP_PATH", "pg_dump"),
		BackupDir:     getEnv("BACKUP_DIR", "./backups"),
		BackupRetensi: getEnvInt("BACKUP_RETENSI", 7),
		BackupJam:     getEnv("BACKUP_JAM", "02:00"),
		UploadsDir:    getEnv("UPLOADS_DIR", "./uploads"),

		TrustedProxies: daftarEnv("TRUSTED_PROXIES"),

		SeedData: getEnvBool("SEED_DATA", appEnv == "development"),
	}
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return fallback
}

// authModeBawaan: pengembangan memakai demo, selain itu (produksi) wajib keycloak.
func authModeBawaan(appEnv string) string {
	if appEnv == "development" {
		return "demo"
	}
	return "keycloak"
}

func getEnvInt(key string, fallback int) int {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return fallback
}

func daftarEnv(key string) []string {
	var out []string
	for _, v := range strings.Split(os.Getenv(key), ",") {
		if v = strings.TrimSpace(v); v != "" {
			out = append(out, v)
		}
	}
	return out
}

func getEnvBool(key string, fallback bool) bool {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}
