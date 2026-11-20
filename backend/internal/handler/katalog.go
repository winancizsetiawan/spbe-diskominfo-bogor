package handler

import (
	"net/http"
	"strconv"

	"spbe-backend/internal/domain"
	"spbe-backend/internal/service"

	"github.com/gin-gonic/gin"
)

type KatalogHandler struct {
	aplikasiService service.AplikasiService
}

func NewKatalogHandler(aplikasiService service.AplikasiService) *KatalogHandler {
	return &KatalogHandler{aplikasiService: aplikasiService}
}

// GetReferensiRaa mengembalikan pohon hierarki RAA (Level 1, 2, 3)
func (h *KatalogHandler) GetReferensiRaa(c *gin.Context) {
	if !wajibPengelola(c) {
		return
	}
	nodes, err := h.aplikasiService.GetTreeRaa()
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("Gagal mengambil referensi RAA", nil))
		return
	}
	c.JSON(http.StatusOK, nodes)
}

// GetRingkasan mengembalikan ringkasan statistik (total, sesuai, perlu penyesuaian, belum)
func (h *KatalogHandler) GetRingkasan(c *gin.Context) {
	if !wajibPengelola(c) {
		return
	}
	var instansiID *uint
	if inst := c.Query("instansi"); inst != "" {
		if id, err := strconv.ParseUint(inst, 10, 32); err == nil {
			uID := uint(id)
			instansiID = &uID
		}
	}

	p, terbatas, ok := penggunaSaatIni(c)
	if !ok {
		return
	}
	if terbatas {
		id := p.InstansiID
		instansiID = &id // Admin OPD hanya melihat instansinya sendiri
	}
	ringkasan, err := h.aplikasiService.GetRingkasan(instansiID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("Gagal mengambil ringkasan aplikasi", nil))
		return
	}
	c.JSON(http.StatusOK, ringkasan)
}

// GetDaftar mengembalikan daftar aplikasi berhalaman dengan filter
func (h *KatalogHandler) GetDaftar(c *gin.Context) {
	if !wajibPengelola(c) {
		return
	}
	var filter domain.AplikasiFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("Parameter kueri tidak valid", nil))
		return
	}

	if inst := c.Query("instansi"); inst != "" {
		if id, err := strconv.ParseUint(inst, 10, 32); err == nil {
			uID := uint(id)
			filter.InstansiID = &uID
		}
	}

	p, terbatas, ok := penggunaSaatIni(c)
	if !ok {
		return
	}
	if terbatas {
		id := p.InstansiID
		filter.InstansiID = &id
	}
	res, err := h.aplikasiService.GetDaftar(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("Gagal mengambil daftar aplikasi", nil))
		return
	}
	c.JSON(http.StatusOK, res)
}

// GetDetail mengembalikan detail 1 aplikasi
func (h *KatalogHandler) GetDetail(c *gin.Context) {
	if !wajibPengelola(c) {
		return
	}
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("ID aplikasi tidak valid", nil))
		return
	}

	p, terbatas, ok := penggunaSaatIni(c)
	if !ok {
		return
	}
	apl, err := h.aplikasiService.GetDetail(uint(id))
	// Milik instansi lain dijawab "tidak ditemukan" agar keberadaannya tidak terungkap.
	if err != nil || (terbatas && apl.InstansiID != p.InstansiID) {
		c.JSON(http.StatusNotFound, domain.NewErrorResponse("Aplikasi tidak ditemukan", nil))
		return
	}
	c.JSON(http.StatusOK, apl)
}

// Create menambah aplikasi baru
func (h *KatalogHandler) Create(c *gin.Context) {
	if !wajibPengelola(c) {
		return
	}
	var input domain.AplikasiInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("Isian formulir tidak valid", map[string]string{
			"error": err.Error(),
		}))
		return
	}

	// Admin OPD hanya mendaftarkan untuk instansinya sendiri. Super Admin boleh menyebut idInstansi,
	// bila tidak, dipakai instansi miliknya.
	p, terbatas, ok := penggunaSaatIni(c)
	if !ok {
		return
	}
	if terbatas {
		input.IDInstansi = nil
	}
	apl, err := h.aplikasiService.Create(input, p.InstansiID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("Gagal menyimpan aplikasi baru", nil))
		return
	}

	c.JSON(http.StatusCreated, apl)
}

// Update mengubah data aplikasi
func (h *KatalogHandler) Update(c *gin.Context) {
	if !wajibPengelola(c) {
		return
	}
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("ID aplikasi tidak valid", nil))
		return
	}

	var input domain.AplikasiInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("Isian formulir tidak valid", map[string]string{
			"error": err.Error(),
		}))
		return
	}

	p, terbatas, ok := penggunaSaatIni(c)
	if !ok {
		return
	}
	if terbatas {
		ada, errD := h.aplikasiService.GetDetail(uint(id))
		if errD != nil || ada.InstansiID != p.InstansiID {
			c.JSON(http.StatusNotFound, domain.NewErrorResponse("Aplikasi tidak ditemukan", nil))
			return
		}
		input.IDInstansi = nil
	}
	apl, err := h.aplikasiService.Update(uint(id), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse(err.Error(), nil))
		return
	}

	c.JSON(http.StatusOK, apl)
}

