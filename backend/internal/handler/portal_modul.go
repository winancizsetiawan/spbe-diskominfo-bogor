package handler

import (
	"errors"
	"net/http"
	"strconv"

	"spbe-backend/internal/auth"
	"spbe-backend/internal/domain"
	"spbe-backend/internal/service"

	"github.com/gin-gonic/gin"
)

type PortalModulHandler struct {
	svc *service.PortalModulService
}

func NewPortalModulHandler(svc *service.PortalModulService) *PortalModulHandler {
	return &PortalModulHandler{svc: svc}
}

// ---- 1. Konten (Berita, Artikel, & Bantuan) ----

// ListArtikel menangani GET /api/artikel
func (h *PortalModulHandler) ListArtikel(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	jenis := c.Query("jenis")
	sudahLogin, kunci := ekstrakRoleLogin(c)
	res, err := h.svc.ListArtikel(jenis, page, sudahLogin, kunci)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat daftar artikel."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// GetArtikelDetail menangani GET /api/artikel/:id
func (h *PortalModulHandler) GetArtikelDetail(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Artikel tidak ditemukan."})
		return
	}
	sudahLogin, _ := ekstrakRoleLogin(c)
	res, err := h.svc.GetArtikelDetail(uint(id), sudahLogin)
	if errors.Is(err, service.ErrArtikelButuhLogin) {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: err.Error()})
		return
	}
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Artikel tidak ditemukan."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// BuatArtikel menangani POST /api/artikel (Super Admin).
func (h *PortalModulHandler) BuatArtikel(c *gin.Context) {
	if _, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat menambah berita atau artikel."); !ok {
		return
	}
	var in service.ArtikelInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Permintaan tidak valid."})
		return
	}
	a, err := h.svc.BuatArtikel(in)
	if err != nil {
		var invalid *service.ArtikelInvalidError
		if errors.As(err, &invalid) {
			c.JSON(http.StatusUnprocessableEntity, domain.NewErrorResponse(service.ErrArtikelTidakValid.Error(), invalid.Errors))
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyimpan tulisan."})
		return
	}
	c.JSON(http.StatusCreated, a)
}

// UbahArtikel menangani PUT /api/artikel/:id (Super Admin memperbaiki tulisan & mengajukan ulang).
func (h *PortalModulHandler) UbahArtikel(c *gin.Context) {
	if _, ok := wajibSuperAdmin(c, "Hanya Super Admin yang dapat mengubah berita atau artikel."); !ok {
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Artikel tidak ditemukan."})
		return
	}
	var in service.ArtikelInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Permintaan tidak valid."})
		return
	}
	a, err := h.svc.UbahArtikel(uint(id), in)
	if err != nil {
		if errors.Is(err, service.ErrArtikelTidakDitemukan) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		var invalid *service.ArtikelInvalidError
		if errors.As(err, &invalid) {
			c.JSON(http.StatusUnprocessableEntity, domain.NewErrorResponse(service.ErrArtikelTidakValid.Error(), invalid.Errors))
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memperbarui tulisan."})
		return
	}
	c.JSON(http.StatusOK, a)
}

// ListVerifikasiArtikel menangani GET /api/artikel/verifikasi (Verifikator & Super Admin).
func (h *PortalModulHandler) ListVerifikasiArtikel(c *gin.Context) {
	kunci, ok := wajibLogin(c)
	if !ok {
		return
	}
	peran := auth.PeranDari(kunci)
	if peran != string(domain.RoleVerifikator) && peran != string(domain.RoleSuperAdmin) {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: "Hanya Verifikator atau Super Admin yang dapat mengakses verifikasi konten."})
		return
	}
	res, err := h.svc.ListVerifikasiArtikel()
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat daftar verifikasi konten."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// VerifikasiArtikel menangani POST /api/artikel/:id/verifikasi (Verifikator & Super Admin).
func (h *PortalModulHandler) VerifikasiArtikel(c *gin.Context) {
	kunci, ok := wajibLogin(c)
	if !ok {
		return
	}
	peran := auth.PeranDari(kunci)
	if peran != string(domain.RoleVerifikator) && peran != string(domain.RoleSuperAdmin) {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: "Hanya Verifikator atau Super Admin yang dapat memverifikasi berita atau artikel."})
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Artikel tidak ditemukan."})
		return
	}
	var in domain.VerifikasiArtikelInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}
	a, err := h.svc.VerifikasiArtikel(kunci, uint(id), in)
	if err != nil {
		if errors.Is(err, service.ErrArtikelTidakDitemukan) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		var invalid *service.ArtikelInvalidError
		if errors.As(err, &invalid) {
			c.JSON(http.StatusUnprocessableEntity, domain.NewErrorResponse(service.ErrArtikelTidakValid.Error(), invalid.Errors))
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyimpan keputusan verifikasi."})
		return
	}
	c.JSON(http.StatusOK, a)
}

// GetBantuan menangani GET /api/bantuan
func (h *PortalModulHandler) GetBantuan(c *gin.Context) {
	c.JSON(http.StatusOK, service.DataBantuanStatis())
}

// ---- 2. Beranda ----

// GetBerandaPublik menangani GET /api/beranda/publik
func (h *PortalModulHandler) GetBerandaPublik(c *gin.Context) {
	res, err := h.svc.GetBerandaPublik()
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat beranda publik."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// GetBeranda menangani GET /api/beranda
func (h *PortalModulHandler) GetBeranda(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	res, err := h.svc.GetBeranda(role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat data beranda."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// ---- 3. Dasbor Instansi & Embed ----

// GetDasborInstansi menangani GET /api/dasbor/instansi
func (h *PortalModulHandler) GetDasborInstansi(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}
	if auth.PeranDari(role) != string(domain.RoleAdminOPD) && auth.PeranDari(role) != string(domain.RoleSuperAdmin) {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: "Peran Anda tidak memiliki akses ke dasbor ini."})
		return
	}

	idInstansi, _ := strconv.Atoi(c.Query("idInstansi"))
	res, err := h.svc.GetDasborInstansi(role, uint(idInstansi))
	if err != nil {
		if errors.Is(err, service.ErrInstansiTidakDitemukan) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat dasbor instansi."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// GetDasborEmbed menangani GET /api/dasbor/embed
func (h *PortalModulHandler) GetDasborEmbed(c *gin.Context) {
	role, ok := wajibLogin(c)
	if !ok {
		return
	}

	jenis := c.Query("jenis")
	if jenis != "instansi" && jenis != "analitik" {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Jenis dasbor tidak dikenal."})
		return
	}
	if jenis == "instansi" && auth.PeranDari(role) != string(domain.RoleAdminOPD) && auth.PeranDari(role) != string(domain.RoleSuperAdmin) {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: "Peran Anda tidak memiliki akses ke dasbor ini."})
		return
	}

	idInstansi, _ := strconv.Atoi(c.Query("idInstansi"))
	res, err := h.svc.GetDasborEmbed(role, jenis, uint(idInstansi))
	if err != nil {
		var konflikErr *service.PortalKonflikError
		if errors.As(err, &konflikErr) {
			c.JSON(http.StatusConflict, domain.ErrorResponse{Message: konflikErr.Pesan})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat embed dasbor."})
		return
	}
	c.JSON(http.StatusOK, res)
}

// ---- 4. Pencarian Global ----

// Cari menangani GET /api/cari
func (h *PortalModulHandler) Cari(c *gin.Context) {
	sudahLogin, role := ekstrakRoleLogin(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	tipe := c.DefaultQuery("tipe", "semua")
	q := c.Query("q")

	res, err := h.svc.Cari(sudahLogin, role, q, tipe, page)
	if err != nil {
		var valErr *service.ValidationError
		if errors.As(err, &valErr) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{
				Message: "Periksa kembali isian Anda.",
				Errors:  valErr.Errors,
			})
			return
		}
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memproses pencarian."})
		return
	}
	c.JSON(http.StatusOK, res)
}

