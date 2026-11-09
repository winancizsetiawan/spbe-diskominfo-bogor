package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"spbe-backend/internal/domain"
	"spbe-backend/internal/service"

	"github.com/gin-gonic/gin"
)

type ForumHandler struct {
	svc *service.ForumService
}

func NewForumHandler(svc *service.ForumService) *ForumHandler {
	return &ForumHandler{svc: svc}
}

// ekstrakRoleLogin membaca token "Bearer demo.<role>" atau token JWT dari header Authorization.
func ekstrakRoleLogin(c *gin.Context) (sudahLogin bool, role string) {
	auth := strings.TrimSpace(c.GetHeader("Authorization"))
	if !strings.HasPrefix(auth, "Bearer ") {
		return false, ""
	}
	token := strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
	if token == "" {
		return false, ""
	}
	if strings.HasPrefix(token, "demo.") {
		return true, strings.TrimPrefix(token, "demo.")
	}
	return true, string(domain.RoleASN)
}

// GetKategori menangani GET /api/forum/kategori
func (h *ForumHandler) GetKategori(c *gin.Context) {
	sudahLogin, _ := ekstrakRoleLogin(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}

	list, err := h.svc.GetKategori()
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat kategori forum."})
		return
	}
	c.JSON(http.StatusOK, list)
}

// ListThread menangani GET /api/forum/thread
func (h *ForumHandler) ListThread(c *gin.Context) {
	sudahLogin, _ := ekstrakRoleLogin(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	idKategori, _ := strconv.Atoi(c.Query("kategori"))

	res, err := h.svc.ListThread(domain.ThreadFilter{
		Page:       page,
		PerPage:    5,
		IdKategori: uint(idKategori),
		Query:      c.Query("q"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat daftar diskusi."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// BuatThread menangani POST /api/forum/thread
func (h *ForumHandler) BuatThread(c *gin.Context) {
	sudahLogin, role := ekstrakRoleLogin(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}

	var in domain.BuatThreadInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	res, err := h.svc.BuatThread(role, in)
	if err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal membuat thread diskusi."})
		return
	}
	c.JSON(http.StatusCreated, res)
}

// GetThreadDetail menangani GET /api/forum/thread/:id
func (h *ForumHandler) GetThreadDetail(c *gin.Context) {
	sudahLogin, role := ekstrakRoleLogin(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Thread tidak ditemukan."})
		return
	}

	res, err := h.svc.GetThreadDetail(uint(id), role)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Thread tidak ditemukan."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// BuatBalasan menangani POST /api/forum/thread/:id/balasan
func (h *ForumHandler) BuatBalasan(c *gin.Context) {
	sudahLogin, role := ekstrakRoleLogin(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Thread tidak ditemukan."})
		return
	}

	var in domain.BuatBalasanInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	res, err := h.svc.BuatBalasan(uint(id), role, in)
	if err != nil {
		if errors.Is(err, service.ErrThreadTidakDitemukan) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		var konflikErr *service.ForumKonflikError
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
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyimpan balasan."})
		return
	}

	c.JSON(http.StatusCreated, res)
}

// ToggleNilaiBalasan menangani PUT /api/forum/balasan/:id/nilai
func (h *ForumHandler) ToggleNilaiBalasan(c *gin.Context) {
	sudahLogin, role := ekstrakRoleLogin(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Balasan tidak ditemukan."})
		return
	}

	res, err := h.svc.ToggleNilaiBalasan(uint(id), role)
	if err != nil {
		if errors.Is(err, service.ErrBalasanTidakDitemukan) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		var konflikErr *service.ForumKonflikError
		if errors.As(err, &konflikErr) {
			c.JSON(http.StatusConflict, domain.ErrorResponse{Message: konflikErr.Pesan})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memperbarui nilai balasan."})
		return
	}

	c.JSON(http.StatusOK, res)
}

// BuatLaporan menangani POST /api/forum/laporan
func (h *ForumHandler) BuatLaporan(c *gin.Context) {
	sudahLogin, role := ekstrakRoleLogin(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}

	var in domain.LaporanInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	if err := h.svc.BuatLaporan(role, in); err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		if errors.Is(err, service.ErrKontenTidakDitemukan) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		var konflikErr *service.ForumKonflikError
		if errors.As(err, &konflikErr) {
			c.JSON(http.StatusConflict, domain.ErrorResponse{Message: konflikErr.Pesan})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal mengirim laporan."})
		return
	}

	c.Status(http.StatusCreated)
}

// ListModerasi menangani GET /api/moderasi
func (h *ForumHandler) ListModerasi(c *gin.Context) {
	sudahLogin, role := ekstrakRoleLogin(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}
	if role != string(domain.RoleSuperAdmin) {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: "Hanya Super Admin yang dapat memoderasi."})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	tabParam := domain.TabModerasi(c.DefaultQuery("tab", "dilaporkan"))

	res, err := h.svc.ListModerasi(domain.ModerasiFilter{
		Page:    page,
		PerPage: 5,
		Query:   c.Query("q"),
		Tab:     tabParam,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat daftar moderasi."})
		return
	}

	c.JSON(http.StatusOK, res)
}

// TindakanModerasi menangani POST /api/moderasi/tindakan
func (h *ForumHandler) TindakanModerasi(c *gin.Context) {
	sudahLogin, role := ekstrakRoleLogin(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}
	if role != string(domain.RoleSuperAdmin) {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: "Hanya Super Admin yang dapat memoderasi."})
		return
	}

	var in domain.TindakanModerasiInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	res, err := h.svc.TindakanModerasi(in)
	if err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		if errors.Is(err, service.ErrModerasiTargetKosong) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		var konflikErr *service.ForumKonflikError
		if errors.As(err, &konflikErr) {
			c.JSON(http.StatusConflict, domain.ErrorResponse{Message: konflikErr.Pesan})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memproses tindakan moderasi."})
		return
	}

	c.JSON(http.StatusOK, res)
}

