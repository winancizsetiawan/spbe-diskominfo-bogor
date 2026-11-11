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
	nodes, err := h.aplikasiService.GetTreeRaa()
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("Gagal mengambil referensi RAA", nil))
		return
	}
	c.JSON(http.StatusOK, nodes)
}

// GetRingkasan mengembalikan ringkasan statistik (total, sesuai, perlu penyesuaian, belum)
func (h *KatalogHandler) GetRingkasan(c *gin.Context) {
	var instansiID *uint
	if inst := c.Query("instansi"); inst != "" {
		if id, err := strconv.ParseUint(inst, 10, 32); err == nil {
			uID := uint(id)
			instansiID = &uID
		}
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

	res, err := h.aplikasiService.GetDaftar(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("Gagal mengambil daftar aplikasi", nil))
		return
	}
	c.JSON(http.StatusOK, res)
}

// GetDetail mengembalikan detail 1 aplikasi
func (h *KatalogHandler) GetDetail(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("ID aplikasi tidak valid", nil))
		return
	}

	apl, err := h.aplikasiService.GetDetail(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, domain.NewErrorResponse("Aplikasi tidak ditemukan", nil))
		return
	}
	c.JSON(http.StatusOK, apl)
}

// GetSiapDiajukan mengembalikan daftar aplikasi yang berstatus draft/perlu revisi
func (h *KatalogHandler) GetSiapDiajukan(c *gin.Context) {
	var instansiID *uint
	if inst := c.Query("instansi"); inst != "" {
		if id, err := strconv.ParseUint(inst, 10, 32); err == nil {
			uID := uint(id)
			instansiID = &uID
		}
	}

	list, err := h.aplikasiService.GetSiapDiajukan(instansiID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("Gagal mengambil aplikasi siap diajukan", nil))
		return
	}

	// Format ringkas sesuai frontend: Pick<Aplikasi, 'id' | 'nama'>[]
	type Ringkas struct {
		ID   uint   `json:"id"`
		Nama string `json:"nama"`
	}
	ringkasList := make([]Ringkas, len(list))
	for i, apl := range list {
		ringkasList[i] = Ringkas{ID: apl.ID, Nama: apl.Nama}
	}

	c.JSON(http.StatusOK, ringkasList)
}

// Create menambah aplikasi baru
func (h *KatalogHandler) Create(c *gin.Context) {
	var input domain.AplikasiInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("Isian formulir tidak valid", map[string]string{
			"error": err.Error(),
		}))
		return
	}

	// Default instansi: 2 (Dinas Kesehatan) jika belum ada token auth
	defaultInstansiID := uint(2)
	apl, err := h.aplikasiService.Create(input, defaultInstansiID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("Gagal menyimpan aplikasi baru", nil))
		return
	}

	c.JSON(http.StatusCreated, apl)
}

// Update mengubah data aplikasi
func (h *KatalogHandler) Update(c *gin.Context) {
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

	apl, err := h.aplikasiService.Update(uint(id), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse(err.Error(), nil))
		return
	}

	c.JSON(http.StatusOK, apl)
}

