package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"spbe-backend/internal/domain"
	"spbe-backend/internal/service"
)

type ValidasiHandler struct {
	validasiService service.ValidasiService
}

func NewValidasiHandler(validasiService service.ValidasiService) *ValidasiHandler {
	return &ValidasiHandler{validasiService: validasiService}
}

// GetDaftar mengambil daftar antrean pengajuan berhalaman beserta tab statistik
func (h *ValidasiHandler) GetDaftar(c *gin.Context) {
	var filter domain.ValidasiFilter

	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("Format query parameter tidak valid", nil))
		return
	}

	if inst := c.Query("instansi"); inst != "" {
		if id, err := strconv.ParseUint(inst, 10, 32); err == nil {
			uID := uint(id)
			filter.InstansiID = &uID
		}
	}

	res, err := h.validasiService.GetDaftar(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("Gagal mengambil daftar validasi", nil))
		return
	}

	c.JSON(http.StatusOK, res)
}

// GetDetail mengambil 1 data pengajuan lengkap beserta objek target yang ditinjau
func (h *ValidasiHandler) GetDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("ID pengajuan tidak valid", nil))
		return
	}

	detail, err := h.validasiService.GetDetail(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, domain.NewErrorResponse("Pengajuan tidak ditemukan", nil))
		return
	}

	c.JSON(http.StatusOK, detail)
}

// Ajukan menangani pengajuan data aplikasi/flowchart dari OPD ke Diskominfo
func (h *ValidasiHandler) Ajukan(c *gin.Context) {
	var input domain.AjukanInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("Format data pengajuan tidak valid", map[string]string{
			"error": err.Error(),
		}))
		return
	}

	// Pengguna default pemohon: Admin OPD Dinas Kesehatan (instansiID: 2)
	currentUser := domain.User{
		ID:         3,
		Nama:       "Ajri Dalae",
		Role:       domain.RoleAdminOPD,
		InstansiID: 2,
	}

	hasil, err := h.validasiService.Ajukan(input, currentUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("Gagal memproses pengajuan data", nil))
		return
	}

	c.JSON(http.StatusOK, hasil)
}

// Putuskan menangani persetujuan/penolakan oleh Super Admin Diskominfo
func (h *ValidasiHandler) Putuskan(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("ID pengajuan tidak valid", nil))
		return
	}

	var input domain.KeputusanInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("Data keputusan tidak valid", map[string]string{
			"error": err.Error(),
		}))
		return
	}

	validator := "Derto (Super Admin Diskominfo)"
	detail, err := h.validasiService.Putuskan(uint(id), input, validator)
	if err != nil {
		if strings.Contains(err.Error(), "sudah pernah diputuskan") {
			c.JSON(http.StatusConflict, domain.NewErrorResponse(err.Error(), nil))
			return
		}
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse(err.Error(), nil))
		return
	}

	c.JSON(http.StatusOK, detail)
}

