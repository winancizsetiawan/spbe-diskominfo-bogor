package handler

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"

	"spbe-backend/internal/auth"
	"spbe-backend/internal/domain"
	"spbe-backend/internal/service"

	"github.com/gin-gonic/gin"
)

type PenggunaModulHandler struct {
	svc *service.PenggunaModulService
}

func NewPenggunaModulHandler(svc *service.PenggunaModulService) *PenggunaModulHandler {
	return &PenggunaModulHandler{svc: svc}
}

func wajibLogin(c *gin.Context) (role string, ok bool) {
	sudahLogin, r := ekstrakRoleLogin(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return "", false
	}
	return r, true
}

// ---- 1. Auth & Profil ----

// Login menangani POST /api/auth/login (termasuk Brute Force Detection 5x salah kata sandi)
func (h *PenggunaModulHandler) Login(c *gin.Context) {
	var in domain.LoginInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	res, status, err := h.svc.Login(in)
	if err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		c.JSON(status, domain.ErrorResponse{Message: err.Error()})
		return
	}

	if !res.ButuhPersetujuan && !res.Butuh2FA {
		if !pasangTokenSesi(c, res) {
			return
		}
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, res)
}

// LanjutLogin menangani POST /api/auth/selesai-login (persetujuan S&K + setup/verifikasi 2FA).
func (h *PenggunaModulHandler) LanjutLogin(c *gin.Context) {
	var in domain.LanjutLoginInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}
	res, status, err := h.svc.LanjutLogin(in)
	if err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		c.JSON(status, domain.ErrorResponse{Message: err.Error()})
		return
	}
	if !res.ButuhPersetujuan && !res.Butuh2FA && !res.ButuhSetup2FA {
		if !pasangTokenSesi(c, res) {
			return
		}
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, res)
}

// MulaiSetup2FA menangani POST /api/profil/2fa/mulai
func (h *PenggunaModulHandler) MulaiSetup2FA(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	res, err := h.svc.MulaiSetup2FA(role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyiapkan pengaturan 2FA."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// Aktifkan2FA menangani POST /api/profil/2fa/aktifkan
func (h *PenggunaModulHandler) Aktifkan2FA(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	var in domain.Konfirmasi2FAInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}
	res, err := h.svc.Aktifkan2FA(role, in.Kode)
	if err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali kode autentikasi Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal mengaktifkan 2FA."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// Nonaktifkan2FA menangani POST /api/profil/2fa/nonaktifkan
func (h *PenggunaModulHandler) Nonaktifkan2FA(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	res, err := h.svc.Nonaktifkan2FA(role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menonaktifkan 2FA."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// pasangTokenSesi menerbitkan token sesi portal untuk peran aktif dan email pengguna.
func pasangTokenSesi(c *gin.Context, res *domain.LoginResponse) bool {
	tok, exp, err := auth.TerbitkanSesi(string(res.Role), res.User.Email)
	if err != nil {
		log.Printf("[auth] gagal menerbitkan token sesi: %v", err)
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal membuat sesi. Silakan coba lagi."})
		return false
	}
	res.Token, res.KedaluwarsaPada = tok, &exp
	c.Header("Cache-Control", "no-store")
	return true
}

// GetMe menangani GET /api/me
func (h *PenggunaModulHandler) GetMe(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	res, err := h.svc.GetMe(role)
	if err != nil {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// SwitchRole menangani POST /api/auth/switch-role (mengganti peran aktif pada akun Multi-Role)
func (h *PenggunaModulHandler) SwitchRole(c *gin.Context) {
	kunci, ok := wajibLogin(c)
	if !ok {
		return
	}
	var in domain.SwitchRoleInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	res, status, err := h.svc.SwitchRole(kunci, in.Role)
	if err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		c.JSON(status, domain.ErrorResponse{Message: err.Error()})
		return
	}

	// Peran aktif ada di dalam token, jadi ganti peran menerbitkan token baru.
	if !pasangTokenSesi(c, res) {
		return
	}
	c.JSON(http.StatusOK, res)
}

// UbahSandi menangani POST /api/auth/ubah-sandi
func (h *PenggunaModulHandler) UbahSandi(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	var in domain.UbahSandiInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	res, err := h.svc.UbahSandi(role, in)
	if err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		var konflikErr *service.PenggunaKonflikError
		if errors.As(err, &konflikErr) {
			c.JSON(http.StatusConflict, domain.ErrorResponse{Message: konflikErr.Pesan})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memperbarui kata sandi."})
		return
	}

	c.JSON(http.StatusOK, res)
}

// SimulasiKedaluwarsaSandi menangani POST /api/auth/simulasi-kedaluwarsa
func (h *PenggunaModulHandler) SimulasiKedaluwarsaSandi(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	var in struct {
		Kedaluwarsa bool `json:"kedaluwarsa"`
	}
	_ = c.ShouldBindJSON(&in)

	res, err := h.svc.SimulasiKedaluwarsaSandi(role, in.Kedaluwarsa)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal mengubah status simulasi kata sandi."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// GetProfil menangani GET /api/profil
func (h *PenggunaModulHandler) GetProfil(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	res, err := h.svc.GetProfil(role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat profil pengguna."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// UbahProfil menangani PUT /api/profil
func (h *PenggunaModulHandler) UbahProfil(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	var in domain.UbahTeleponInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	res, err := h.svc.UbahTelepon(role, in)
	if err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memperbarui profil."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// GetInstansiProfil menangani GET /api/profil/instansi untuk semua pengguna login.
func (h *PenggunaModulHandler) GetInstansiProfil(c *gin.Context) {
	if _, ok := wajibLogin(c); !ok {
		return
	}
	list, err := h.svc.GetInstansiPengguna()
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat daftar instansi."})
		return
	}
	c.JSON(http.StatusOK, list)
}

// UbahDataPegawai menangani PUT /api/profil/pegawai
func (h *PenggunaModulHandler) UbahDataPegawai(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	var in domain.UbahDataPegawaiInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	res, emailBerubah, err := h.svc.UbahDataPegawai(role, in)
	if err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		log.Printf("[profil] gagal ubah data pegawai (role=%s): %v", role, err)
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memperbarui data pegawai."})
		return
	}

	if emailBerubah {
		tok, exp, err := auth.TerbitkanSesi(string(res.User.Role), res.User.Email)
		if err != nil {
			log.Printf("[auth] gagal menerbitkan token baru setelah ubah email: %v", err)
			c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Data tersimpan, tetapi sesi gagal diperbarui. Silakan masuk ulang."})
			return
		}
		res.Token = tok
		res.KedaluwarsaPada = &exp
	}

	c.JSON(http.StatusOK, res)
}

const batasFotoProfil = 2 << 20 // 2 MB

var (
	ekstensiFotoProfil = map[string]string{
		"image/png":  "png",
		"image/jpeg": "jpg",
		"image/webp": "webp",
	}
	polaNamaFotoProfil = regexp.MustCompile(`^[a-f0-9]{32}\.(png|jpg|webp)$`)
)

func folderFotoProfil() string { return filepath.Join("uploads", "profil") }

// UnggahFotoProfil menangani POST /api/profil/foto (multipart field "file"). Semua role dapat mengunggah foto profil.
func (h *PenggunaModulHandler) UnggahFotoProfil(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, batasFotoProfil+(1<<20))
	fh, err := c.FormFile("file")
	if err != nil {
		var terlalu *http.MaxBytesError
		if errors.As(err, &terlalu) {
			c.JSON(http.StatusRequestEntityTooLarge, domain.ErrorResponse{Message: "Ukuran foto profil maksimal 2 MB."})
			return
		}
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Berkas foto tidak ditemukan."})
		return
	}
	if fh.Size <= 0 {
		c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{Message: "Berkas foto kosong."})
		return
	}
	if fh.Size > batasFotoProfil {
		c.JSON(http.StatusRequestEntityTooLarge, domain.ErrorResponse{Message: "Ukuran foto profil maksimal 2 MB."})
		return
	}

	f, err := fh.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Berkas foto tidak dapat dibaca."})
		return
	}
	awal := make([]byte, 512)
	n, _ := io.ReadFull(f, awal)
	_ = f.Close()
	tipe := http.DetectContentType(awal[:n])
	ext, ok := ekstensiFotoProfil[tipe]
	if !ok {
		c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{Message: "Foto profil harus berupa gambar PNG, JPG, atau WEBP."})
		return
	}

	acak := make([]byte, 16)
	if _, err := rand.Read(acak); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyimpan foto profil."})
		return
	}
	nama := hex.EncodeToString(acak) + "." + ext
	if err := os.MkdirAll(folderFotoProfil(), 0o750); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyiapkan ruang penyimpanan."})
		return
	}
	lokal := filepath.Join(folderFotoProfil(), nama)
	if err := c.SaveUploadedFile(fh, lokal); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyimpan foto profil."})
		return
	}

	res, err := h.svc.SimpanFotoProfil(role, nama)
	if err != nil {
		_ = os.Remove(lokal)
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memperbarui foto profil."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// HapusFotoProfil menangani DELETE /api/profil/foto
func (h *PenggunaModulHandler) HapusFotoProfil(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	res, err := h.svc.HapusFotoProfil(role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menghapus foto profil."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// FotoProfil menangani GET /api/profil/foto/:nama
func (h *PenggunaModulHandler) FotoProfil(c *gin.Context) {
	nama := c.Param("nama")
	if !polaNamaFotoProfil.MatchString(nama) {
		c.Status(http.StatusNotFound)
		return
	}
	lokal := filepath.Join(folderFotoProfil(), nama)
	if _, err := os.Stat(lokal); err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	switch filepath.Ext(nama) {
	case ".png":
		c.Header("Content-Type", "image/png")
	case ".webp":
		c.Header("Content-Type", "image/webp")
	default:
		c.Header("Content-Type", "image/jpeg")
	}
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Cache-Control", "public, max-age=86400")
	c.File(lokal)
}

// GetPreferensi menangani GET /api/profil/preferensi
func (h *PenggunaModulHandler) GetPreferensi(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	res, err := h.svc.GetPreferensi(role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat preferensi notifikasi."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// UbahPreferensi menangani PUT /api/profil/preferensi
func (h *PenggunaModulHandler) UbahPreferensi(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	var raw map[string]interface{}
	if err := c.ShouldBindJSON(&raw); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}
	val, exists := raw["kanalEmail"]
	kanalEmail, isBool := val.(bool)
	if !exists || !isBool {
		c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
			Message: "Periksa kembali isian Anda.",
			Errors:  map[string]string{"kanalEmail": "Nilai harus benar atau salah."},
		})
		return
	}

	res, err := h.svc.UbahPreferensi(role, kanalEmail)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memperbarui preferensi notifikasi."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// ListAktivitasSaya menangani GET /api/profil/aktivitas
func (h *PenggunaModulHandler) ListAktivitasSaya(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	res, err := h.svc.ListAktivitasSaya(role, page)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat riwayat aktivitas."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// HapusAktivitasSaya menangani DELETE /api/profil/aktivitas/:id
func (h *PenggunaModulHandler) HapusAktivitasSaya(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "ID aktivitas tidak valid."})
		return
	}
	if err := h.svc.HapusAktivitasSaya(role, uint(id)); err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "terhapus"})
}

// HapusSemuaAktivitasSaya menangani DELETE /api/profil/aktivitas
func (h *PenggunaModulHandler) HapusSemuaAktivitasSaya(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	jumlah, err := h.svc.HapusSemuaAktivitasSaya(role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menghapus riwayat aktivitas."})
		return
	}
	c.JSON(http.StatusOK, gin.H{"terhapus": jumlah})
}

// ---- 2. Manajemen Pengguna (Admin) ----

// GetInstansiPengguna menangani GET /api/pengguna/instansi
func (h *PenggunaModulHandler) GetInstansiPengguna(c *gin.Context) {
	if _, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat mengelola pengguna."); !ok {
		return
	}
	list, err := h.svc.GetInstansiPengguna()
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat daftar instansi."})
		return
	}
	c.JSON(http.StatusOK, list)
}

// ListPengguna menangani GET /api/pengguna
func (h *PenggunaModulHandler) ListPengguna(c *gin.Context) {
	if _, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat mengelola pengguna."); !ok {
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	res, err := h.svc.ListPengguna(domain.PenggunaFilter{
		Page:    page,
		PerPage: 8,
		Role:    c.DefaultQuery("role", "semua"),
		Query:   c.Query("q"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat daftar pengguna."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// UndangPengguna menangani POST /api/pengguna
func (h *PenggunaModulHandler) UndangPengguna(c *gin.Context) {
	role, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat mengelola pengguna.")
	if !ok {
		return
	}
	var in domain.UndangInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	res, err := h.svc.UndangPengguna(role, in)
	if err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal mengundang pengguna."})
		return
	}
	c.JSON(http.StatusCreated, res)
}

// UbahPengguna menangani PATCH /api/pengguna/:id
// HapusPengguna menangani DELETE /api/pengguna/:id (Super Admin).
func (h *PenggunaModulHandler) HapusPengguna(c *gin.Context) {
	role, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat mengelola pengguna.")
	if !ok {
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Pengguna tidak ditemukan."})
		return
	}
	if err := h.svc.HapusPengguna(role, uint(id)); err != nil {
		if errors.Is(err, service.ErrPenggunaTidakDitemukan) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		var konflikErr *service.PenggunaKonflikError
		if errors.As(err, &konflikErr) {
			c.JSON(http.StatusConflict, domain.ErrorResponse{Message: konflikErr.Pesan})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menghapus pengguna."})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *PenggunaModulHandler) UbahPengguna(c *gin.Context) {
	role, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat mengelola pengguna.")
	if !ok {
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Pengguna tidak ditemukan."})
		return
	}

	var in domain.UbahPenggunaInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	res, err := h.svc.UbahPengguna(role, uint(id), in)
	if err != nil {
		if errors.Is(err, service.ErrPenggunaTidakDitemukan) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		var konflikErr *service.PenggunaKonflikError
		if errors.As(err, &konflikErr) {
			c.JSON(http.StatusConflict, domain.ErrorResponse{Message: konflikErr.Pesan})
			return
		}
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal mengubah data pengguna."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// UndangUlang menangani POST /api/pengguna/:id/undang-ulang
func (h *PenggunaModulHandler) UndangUlang(c *gin.Context) {
	role, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat mengelola pengguna.")
	if !ok {
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Pengguna tidak ditemukan."})
		return
	}

	if err := h.svc.UndangUlang(role, uint(id)); err != nil {
		if errors.Is(err, service.ErrPenggunaTidakDitemukan) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		var konflikErr *service.PenggunaKonflikError
		if errors.As(err, &konflikErr) {
			c.JSON(http.StatusConflict, domain.ErrorResponse{Message: konflikErr.Pesan})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal mengirim ulang undangan."})
		return
	}
	c.Status(http.StatusNoContent)
}

// ---- 3. Notifikasi ----

// GetRingkasNotifikasi menangani GET /api/notifikasi/ringkas
func (h *PenggunaModulHandler) GetRingkasNotifikasi(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	res, err := h.svc.GetRingkasNotifikasi(role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat ringkasan notifikasi."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// ListNotifikasi menangani GET /api/notifikasi
func (h *PenggunaModulHandler) ListNotifikasi(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	kategori := c.DefaultQuery("kategori", "semua")
	res, err := h.svc.ListNotifikasi(role, kategori, page)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat daftar notifikasi."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// TandaiDibacaSemua menangani POST /api/notifikasi/dibaca-semua
func (h *PenggunaModulHandler) TandaiDibacaSemua(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	var in domain.DibacaSemuaInput
	_ = c.ShouldBindJSON(&in)

	diperbarui, err := h.svc.TandaiDibacaSemua(role, in.Kategori)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memperbarui status notifikasi."})
		return
	}
	c.JSON(http.StatusOK, gin.H{"diperbarui": diperbarui})
}

// TandaiDibaca menangani POST /api/notifikasi/:id/dibaca
func (h *PenggunaModulHandler) TandaiDibaca(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Notifikasi tidak ditemukan."})
		return
	}

	if err := h.svc.TandaiDibaca(role, uint(id)); err != nil {
		if errors.Is(err, service.ErrNotifikasiTidakDitemukan) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menandai notifikasi."})
		return
	}
	c.Status(http.StatusNoContent)
}

// ---- 4. Pembelajaran / LMS ----

// ListKursus menangani GET /api/kursus
func (h *PenggunaModulHandler) ListKursus(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	res, err := h.svc.ListKursus(role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat daftar kursus."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// GetKursusDetail menangani GET /api/kursus/:id
func (h *PenggunaModulHandler) GetKursusDetail(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Kursus tidak ditemukan."})
		return
	}
	res, err := h.svc.GetKursusDetail(role, uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Kursus tidak ditemukan."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// TandaiMateriSelesai menangani PUT /api/kursus/:id/materi/:materi/selesai
func (h *PenggunaModulHandler) TandaiMateriSelesai(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	kursusID, err1 := strconv.Atoi(c.Param("id"))
	materiID, err2 := strconv.Atoi(c.Param("materi"))
	if err1 != nil || err2 != nil || kursusID < 1 || materiID < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Materi tidak ditemukan."})
		return
	}

	res, err := h.svc.TandaiMateriSelesai(role, uint(kursusID), uint(materiID))
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Materi tidak ditemukan."})
		return
	}
	c.JSON(http.StatusOK, res)
}

