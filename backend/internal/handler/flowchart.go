package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"spbe-backend/internal/domain"
	"spbe-backend/internal/service"
)

// 1. Struct Handler
type FlowchartHandler struct {
	flowchartService service.FlowchartService
	aplikasiService  service.AplikasiService
	dokumenService   *service.DokumenService
}

// Constructor
func NewFlowchartHandler(fcService service.FlowchartService, aplService service.AplikasiService, dokService *service.DokumenService) *FlowchartHandler {
	return &FlowchartHandler{
		flowchartService: fcService,
		aplikasiService:  aplService,
		dokumenService:   dokService,
	}
}

// 2. Method-Method Handler HTTP

// GetOpsi mengembalikan pilihan aplikasi (dan SOP) untuk keperluan dropdown di form frontend
func (h *FlowchartHandler) GetOpsi(c *gin.Context) {
	if !wajibPengelola(c) {
		return
	}
	p, terbatas, ok := penggunaSaatIni(c)
	if !ok {
		return
	}
	filterApl := domain.AplikasiFilter{Page: 1}
	if terbatas {
		id := p.InstansiID
		filterApl.InstansiID = &id
	}
	daftarApl, err := h.aplikasiService.GetDaftar(filterApl)
	type OpsiAplikasi struct {
		ID   uint   `json:"id"`
		Nama string `json:"nama"`
	}
	opsiAplikasi := []OpsiAplikasi{}
	if err == nil && daftarApl != nil {
		for _, a := range daftarApl.Items {
			opsiAplikasi = append(opsiAplikasi, OpsiAplikasi{ID: a.ID, Nama: a.Nama})
		}
	}

	type OpsiSop struct {
		ID    uint   `json:"id"`
		Judul string `json:"judul"`
	}
	opsiSop := []OpsiSop{}
	if h.dokumenService != nil {
		daftarSop, errSop := h.dokumenService.List(domain.DokumenFilter{
			Page:       1,
			PerPage:    100,
			Kelompok:   domain.KelompokSOP,
			SudahLogin: true,
		})
		if errSop == nil {
			for _, d := range daftarSop.Items {
				opsiSop = append(opsiSop, OpsiSop{ID: d.ID, Judul: d.Judul})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"aplikasi": opsiAplikasi,
		"sop":      opsiSop,
	})
}

// GetDaftar mengambil daftar flowchart beserta filter dan paginasi
func (h *FlowchartHandler) GetDaftar(c *gin.Context) {
	if !wajibPengelola(c) {
		return
	}
	var filter domain.FlowchartFilter

	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("Format query tidak valid", nil))
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
	res, err := h.flowchartService.GetDaftar(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("Gagal mengambil data flowchart", nil))
		return
	}

	c.JSON(http.StatusOK, res)
}

// GetDetail mengambil 1 data spesifik berdasarkan ID
func (h *FlowchartHandler) GetDetail(c *gin.Context) {
	if !wajibPengelola(c) {
		return
	}
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("ID flowchart tidak valid", nil))
		return
	}

	p, terbatas, ok := penggunaSaatIni(c)
	if !ok {
		return
	}
	fc, err := h.flowchartService.GetDetail(uint(id))
	if err != nil || (terbatas && fc.InstansiID != p.InstansiID) {
		c.JSON(http.StatusNotFound, domain.NewErrorResponse("Flowchart tidak ditemukan", nil))
		return
	}

	c.JSON(http.StatusOK, fc)
}

// Create menangani penambahan data flowchart baru
func (h *FlowchartHandler) Create(c *gin.Context) {
	if !wajibPengelola(c) {
		return
	}
	var input domain.FlowchartInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("Input tidak valid", map[string]string{
			"error": err.Error(),
		}))
		return
	}

	// Instansi dan nama pembuat diambil dari pengguna yang sedang masuk.
	p, _, ok := penggunaSaatIni(c)
	if !ok {
		return
	}
	fc, err := h.flowchartService.Create(input, p.InstansiID, p.Nama)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("Gagal menyimpan flowchart", nil))
		return
	}

	c.JSON(http.StatusCreated, fc)
}

// Update menangani pembaruan data flowchart yang sudah ada
func (h *FlowchartHandler) Update(c *gin.Context) {
	if !wajibPengelola(c) {
		return
	}
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("ID flowchart tidak valid", nil))
		return
	}

	var input domain.FlowchartInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("Input tidak valid", map[string]string{
			"error": err.Error(),
		}))
		return
	}

	p, terbatas, ok := penggunaSaatIni(c)
	if !ok {
		return
	}
	if terbatas {
		ada, errD := h.flowchartService.GetDetail(uint(id))
		if errD != nil || ada.InstansiID != p.InstansiID {
			c.JSON(http.StatusNotFound, domain.NewErrorResponse("Flowchart tidak ditemukan", nil))
			return
		}
	}
	fc, err := h.flowchartService.Update(uint(id), input, p.Nama)
	if err != nil {
		if strings.Contains(err.Error(), "menunggu validasi") {
			c.JSON(http.StatusConflict, domain.NewErrorResponse(err.Error(), nil))
			return
		}
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse(err.Error(), nil))
		return
	}

	c.JSON(http.StatusOK, fc)
}