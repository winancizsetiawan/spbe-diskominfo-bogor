package handler

import (
	"errors"
	"net/http"
	"strconv"

	"spbe-backend/internal/domain"
	"spbe-backend/internal/service"

	"github.com/gin-gonic/gin"
)

type SistemHandler struct {
	svc *service.SistemService
}

func NewSistemHandler(svc *service.SistemService) *SistemHandler {
	return &SistemHandler{svc: svc}
}

func wajibSuperAdmin(c *gin.Context, pesanForbidden string) (role string, ok bool) {
	sudahLogin, r := ekstrakRoleLogin(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return "", false
	}
	if r != string(domain.RoleSuperAdmin) {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: pesanForbidden})
		return "", false
	}
	return r, true
}

// ---- 1. Audit Trail ----

// ListAudit menangani GET /api/audit
func (h *SistemHandler) ListAudit(c *gin.Context) {
	if _, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat membuka halaman ini."); !ok {
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	res, err := h.svc.ListAudit(domain.AuditFilter{
		Page:     page,
		PerPage:  10,
		Kategori: c.DefaultQuery("kategori", "semua"),
		Aksi:     c.Query("aksi"),
		Hasil:    c.Query("hasil"),
		Query:    c.Query("q"),
		Dari:     c.Query("dari"),
		Sampai:   c.Query("sampai"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat log audit."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// ---- 2. Backup Database ----

// GetBackup menangani GET /api/backup
func (h *SistemHandler) GetBackup(c *gin.Context) {
	if _, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat membuka halaman ini."); !ok {
		return
	}

	res, err := h.svc.GetBackup()
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat riwayat backup."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// MulaiBackup menangani POST /api/backup
func (h *SistemHandler) MulaiBackup(c *gin.Context) {
	role, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat membuka halaman ini.")
	if !ok {
		return
	}

	res, err := h.svc.MulaiBackupManual(role)
	if err != nil {
		var konflikErr *service.SistemKonflikError
		if errors.As(err, &konflikErr) {
			c.JSON(http.StatusConflict, domain.ErrorResponse{Message: konflikErr.Pesan})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memulai backup manual."})
		return
	}
	c.JSON(http.StatusCreated, res)
}

// ---- 3. Periode Pembaruan Data ----

// GetPeriode menangani GET /api/periode
func (h *SistemHandler) GetPeriode(c *gin.Context) {
	if _, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat membuka halaman ini."); !ok {
		return
	}

	res, err := h.svc.GetPeriode()
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat daftar periode."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// BuatPeriode menangani POST /api/periode
func (h *SistemHandler) BuatPeriode(c *gin.Context) {
	role, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat membuka halaman ini.")
	if !ok {
		return
	}

	var in domain.PeriodeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	res, err := h.svc.BuatPeriode(role, in)
	if err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal membuat periode pembaruan."})
		return
	}
	c.JSON(http.StatusCreated, res)
}

// UbahPeriode menangani PUT /api/periode/:id
func (h *SistemHandler) UbahPeriode(c *gin.Context) {
	role, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat membuka halaman ini.")
	if !ok {
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Periode tidak ditemukan."})
		return
	}

	var in domain.PeriodeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	res, err := h.svc.UbahPeriode(uint(id), role, in)
	if err != nil {
		if errors.Is(err, service.ErrPeriodeTidakDitemukan) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		var konflikErr *service.SistemKonflikError
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
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal mengubah periode pembaruan."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// HapusPeriode menangani DELETE /api/periode/:id
func (h *SistemHandler) HapusPeriode(c *gin.Context) {
	role, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat membuka halaman ini.")
	if !ok {
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Periode tidak ditemukan."})
		return
	}

	if err := h.svc.HapusPeriode(uint(id), role); err != nil {
		if errors.Is(err, service.ErrPeriodeTidakDitemukan) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		var konflikErr *service.SistemKonflikError
		if errors.As(err, &konflikErr) {
			c.JSON(http.StatusConflict, domain.ErrorResponse{Message: konflikErr.Pesan})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menghapus periode pembaruan."})
		return
	}

	c.Status(http.StatusNoContent)
}

// ---- 4. Kritik & Saran ----

// KirimKritik menangani POST /api/kritik (Publik)
func (h *SistemHandler) KirimKritik(c *gin.Context) {
	var in domain.KritikInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	if err := h.svc.KirimKritik(in); err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal mengirim kritik dan saran."})
		return
	}

	c.Status(http.StatusCreated)
}

// ListKritik menangani GET /api/kritik (Super Admin)
func (h *SistemHandler) ListKritik(c *gin.Context) {
	if _, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat membaca kritik dan saran."); !ok {
		return
	}

	list, err := h.svc.ListKritik()
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat daftar kritik dan saran."})
		return
	}
	c.JSON(http.StatusOK, list)
}

