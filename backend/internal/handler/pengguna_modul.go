package handler

import (
	"errors"
	"net/http"
	"strconv"

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

