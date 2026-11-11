package handler

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"spbe-backend/internal/domain"
	"spbe-backend/internal/service"

	"github.com/gin-gonic/gin"
)

type DokumenHandler struct {
	svc *service.DokumenService
}

func NewDokumenHandler(svc *service.DokumenService) *DokumenHandler {
	return &DokumenHandler{svc: svc}
}

// ekstrakPeranRequest membaca header Authorization (misal "Bearer demo.super_admin")
// untuk menentukan apakah pengguna sudah login dan apakah dia super_admin.
func ekstrakPeranRequest(c *gin.Context) (sudahLogin bool, isSuperAdmin bool) {
	auth := strings.TrimSpace(c.GetHeader("Authorization"))
	if auth == "" {
		return false, false
	}
	if strings.HasPrefix(auth, "Bearer ") {
		token := strings.TrimPrefix(auth, "Bearer ")
		if token == "" {
			return false, false
		}
		if strings.HasSuffix(token, "super_admin") {
			return true, true
		}
		return true, false
	}
	return false, false
}

func kelompokDariQuery(v string) domain.KelompokDokumen {
	if v == "sop" {
		return domain.KelompokSOP
	}
	return domain.KelompokDokumenUmum
}

// GetRingkasan menangani GET /api/dokumen/ringkasan
func (h *DokumenHandler) GetRingkasan(c *gin.Context) {
	sudahLogin, _ := ekstrakPeranRequest(c)
	kelompok := kelompokDariQuery(c.Query("kelompok"))

	res, err := h.svc.GetRingkasan(kelompok, sudahLogin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{
			Message: "Gagal memuat ringkasan dokumen.",
		})
		return
	}
	c.JSON(http.StatusOK, res)
}

// GetKategori menangani GET /api/dokumen/kategori
func (h *DokumenHandler) GetKategori(c *gin.Context) {
	kelompok := kelompokDariQuery(c.Query("kelompok"))
	list, err := h.svc.GetKategori(kelompok)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{
			Message: "Gagal memuat kategori dokumen.",
		})
		return
	}
	c.JSON(http.StatusOK, list)
}

// List menangani GET /api/dokumen
func (h *DokumenHandler) List(c *gin.Context) {
	sudahLogin, isSuperAdmin := ekstrakPeranRequest(c)
	kelompok := kelompokDariQuery(c.Query("kelompok"))

	// SOP hanya untuk pengguna login
	if kelompok == domain.KelompokSOP && !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{
			Message: "Masuk untuk melihat daftar SOP.",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	idKategori, _ := strconv.Atoi(c.Query("kategori"))

	filter := domain.DokumenFilter{
		Page:         page,
		PerPage:      6,
		Kelompok:     kelompok,
		Query:        c.Query("q"),
		Jenis:        c.Query("jenis"),
		IdKategori:   uint(idKategori),
		UrutPopuler:  c.Query("urut") == "populer",
		SudahLogin:   sudahLogin,
		IsSuperAdmin: isSuperAdmin,
	}

	res, err := h.svc.List(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{
			Message: "Gagal memuat daftar dokumen.",
		})
		return
	}
	c.JSON(http.StatusOK, res)
}

// GetByID menangani GET /api/dokumen/:id
func (h *DokumenHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{
			Message: "Dokumen tidak ditemukan.",
		})
		return
	}

	sudahLogin, isSuperAdmin := ekstrakPeranRequest(c)
	dok, err := h.svc.GetByID(uint(id), sudahLogin, isSuperAdmin)
	if err != nil {
		if errors.Is(err, service.ErrDokumenButuhLogin) {
			c.JSON(http.StatusUnauthorized, domain.ErrorResponse{
				Message: err.Error(),
			})
			return
		}
		c.JSON(http.StatusNotFound, domain.ErrorResponse{
			Message: "Dokumen tidak ditemukan.",
		})
		return
	}

	c.JSON(http.StatusOK, dok)
}

// Unduh menangani GET /api/dokumen/:id/unduh
func (h *DokumenHandler) Unduh(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{
			Message: "Dokumen tidak ditemukan.",
		})
		return
	}

	sudahLogin, isSuperAdmin := ekstrakPeranRequest(c)
	res, err := h.svc.Unduh(uint(id), sudahLogin, isSuperAdmin)
	if err != nil {
		if errors.Is(err, service.ErrDokumenButuhLogin) {
			c.JSON(http.StatusUnauthorized, domain.ErrorResponse{
				Message: err.Error(),
			})
			return
		}
		c.JSON(http.StatusNotFound, domain.ErrorResponse{
			Message: "Dokumen tidak ditemukan.",
		})
		return
	}

	c.JSON(http.StatusOK, res)
}

// ListAdmin menangani GET /api/admin/dokumen
func (h *DokumenHandler) ListAdmin(c *gin.Context) {
	sudahLogin, isSuperAdmin := ekstrakPeranRequest(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{
			Message: "Sesi tidak valid.",
		})
		return
	}
	if !isSuperAdmin {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{
			Message: "Hanya Super Admin yang dapat mengelola repositori.",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	filter := domain.AdminDokumenFilter{
		Page:    page,
		PerPage: 6,
		Query:   c.Query("q"),
		Status:  c.Query("status"),
	}

	res, err := h.svc.ListAdmin(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{
			Message: "Gagal memuat daftar dokumen repositori.",
		})
		return
	}
	c.JSON(http.StatusOK, res)
}

// MulaiUnggah menangani POST /api/dokumen/unggah/mulai
func (h *DokumenHandler) MulaiUnggah(c *gin.Context) {
	sudahLogin, isSuperAdmin := ekstrakPeranRequest(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}
	if !isSuperAdmin {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: "Hanya Super Admin yang dapat mengelola repositori."})
		return
	}

	var in domain.MulaiUnggahInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	res, err := h.svc.MulaiUnggah(in)
	if err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyiapkan sesi unggahan."})
		return
	}

	c.JSON(http.StatusOK, res)
}

// UnggahBerkas menangani POST /api/dokumen/unggah/berkas/:idSesi
func (h *DokumenHandler) UnggahBerkas(c *gin.Context) {
	idSesi := c.Param("idSesi")
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Berkas tidak ditemukan."})
		return
	}

	folderUnggah := filepath.Join("uploads", "dokumen")
	if err := os.MkdirAll(folderUnggah, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyiapkan ruang penyimpanan."})
		return
	}

	ext := filepath.Ext(fileHeader.Filename)
	namaSimpan := fmt.Sprintf("%s%s", idSesi, ext)
	pathLokal := filepath.Join(folderUnggah, namaSimpan)

	if err := c.SaveUploadedFile(fileHeader, pathLokal); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyimpan berkas."})
		return
	}

	urlPublik := "/api/dokumen/berkas/" + namaSimpan
	if err := h.svc.SimpanBerkasSesi(idSesi, urlPublik); err != nil {
		_ = os.Remove(pathLokal)
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// SelesaiUnggah menangani POST /api/dokumen/unggah/selesai
func (h *DokumenHandler) SelesaiUnggah(c *gin.Context) {
	sudahLogin, isSuperAdmin := ekstrakPeranRequest(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}
	if !isSuperAdmin {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: "Hanya Super Admin yang dapat mengelola repositori."})
		return
	}

	var in domain.SelesaiUnggahInput
	if err := c.ShouldBindJSON(&in); err != nil || strings.TrimSpace(in.IdSesi) == "" {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "ID sesi unggahan wajib diisi."})
		return
	}

	dok, err := h.svc.SelesaiUnggah(in.IdSesi)
	if err != nil {
		if errors.Is(err, service.ErrSesiUnggahKedaluwarsa) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyimpan dokumen."})
		return
	}

	c.JSON(http.StatusCreated, dok)
}

// UbahStatus menangani PATCH /api/dokumen/:id
func (h *DokumenHandler) UbahStatus(c *gin.Context) {
	sudahLogin, isSuperAdmin := ekstrakPeranRequest(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}
	if !isSuperAdmin {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: "Hanya Super Admin yang dapat mengelola repositori."})
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Dokumen tidak ditemukan."})
		return
	}

	var in domain.UbahStatusDokumenInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}

	dok, err := h.svc.UbahStatus(uint(id), in.Status)
	if err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		var konflikErr *service.TransisiStatusKonflikError
		if errors.As(err, &konflikErr) {
			c.JSON(http.StatusConflict, domain.ErrorResponse{Message: konflikErr.Pesan})
			return
		}
		if errors.Is(err, service.ErrDokumenTidakDitemukan) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal mengubah status dokumen."})
		return
	}

	c.JSON(http.StatusOK, dok)
}

