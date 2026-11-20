package handler

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"spbe-backend/internal/auth"
	"spbe-backend/internal/dasbor"
	"spbe-backend/internal/domain"

	"github.com/gin-gonic/gin"
)

const (
	batasExcelDasbor = 30 << 20 // 30 MB
	masaDrafDasbor   = 30 * time.Minute
	maksDrafDasbor   = 5
)

// PencatatAudit menyimpan jejak audit (dipasang dari SistemService.CatatAktivitas).
type PencatatAudit func(userID *uint, aksi domain.AksiAktivitas, deskripsi string, hasil domain.HasilAudit)

// DataDasborHandler: Super Admin memperbarui data Dasbor Publik dan Analitik dari Excel matriks arsitektur.
// Alur: unggah Excel -> pratinjau ringkasan (draf disimpan di memori) -> terapkan. Versi lama diarsipkan
// dan dapat dipulihkan.
type DataDasborHandler struct {
	simpan *dasbor.Penyimpanan
	audit  PencatatAudit
	mu     sync.Mutex
	draf   map[string]drafDasbor
}

type drafDasbor struct {
	hasil      *dasbor.Hasil
	namaBerkas string
	pemilik    uint
	dibuat     time.Time
}

func NewDataDasborHandler(dir string, audit PencatatAudit) *DataDasborHandler {
	return &DataDasborHandler{
		simpan: &dasbor.Penyimpanan{Dir: dir, Simpan: 5},
		audit:  audit,
		draf:   map[string]drafDasbor{},
	}
}

func wajibSuperAdminDasbor(c *gin.Context) (*domain.User, bool) {
	if !wajibPeran(c, "Hanya Super Admin yang dapat memperbarui data dasbor.", auth.RoleSuperAdmin) {
		return nil, false
	}
	u, _, ok := penggunaSaatIni(c)
	return u, ok
}

type statusDataDasbor struct {
	Aktif   *dasbor.Versi  `json:"aktif"`
	Riwayat []dasbor.Versi `json:"riwayat"`
}

func (h *DataDasborHandler) status() (*statusDataDasbor, error) {
	aktif, err := h.simpan.Aktif()
	if err != nil {
		return nil, err
	}
	riwayat, err := h.simpan.Riwayat()
	if err != nil {
		return nil, err
	}
	return &statusDataDasbor{Aktif: aktif, Riwayat: riwayat}, nil
}

// GetStatus menangani GET /api/dasbor/data.
func (h *DataDasborHandler) GetStatus(c *gin.Context) {
	if _, ok := wajibSuperAdminDasbor(c); !ok {
		return
	}
	s, err := h.status()
	if err != nil {
		log.Printf("[dasbor] gagal membaca status: %v", err)
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal membaca data dasbor."})
		return
	}
	c.JSON(http.StatusOK, s)
}

// Pratinjau menangani POST /api/dasbor/data/pratinjau (multipart, field "file").
// Excel diolah tetapi belum diterapkan; hasilnya disimpan sebagai draf selama 30 menit.
func (h *DataDasborHandler) Pratinjau(c *gin.Context) {
	u, ok := wajibSuperAdminDasbor(c)
	if !ok {
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, batasExcelDasbor+(1<<20))
	fh, err := c.FormFile("file")
	if err != nil {
		var terlalu *http.MaxBytesError
		if errors.As(err, &terlalu) {
			c.JSON(http.StatusRequestEntityTooLarge, domain.ErrorResponse{Message: "Ukuran Excel maksimal 30 MB."})
			return
		}
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Berkas tidak ditemukan."})
		return
	}
	if fh.Size <= 0 || fh.Size > batasExcelDasbor {
		c.JSON(http.StatusRequestEntityTooLarge, domain.ErrorResponse{Message: "Ukuran Excel maksimal 30 MB."})
		return
	}
	if !strings.HasSuffix(strings.ToLower(fh.Filename), ".xlsx") {
		c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{Message: "Unggah berkas Excel berformat .xlsx."})
		return
	}
	f, err := fh.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Berkas tidak dapat dibaca."})
		return
	}
	isi, err := io.ReadAll(f)
	f.Close()
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Berkas tidak dapat dibaca."})
		return
	}

	hasil, err := dasbor.Konversi(bytes.NewReader(isi), int64(len(isi)), time.Now())
	if err != nil {
		var ef *dasbor.ErrFormat
		if errors.As(err, &ef) {
			c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{Message: ef.Pesan})
			return
		}
		log.Printf("[dasbor] konversi gagal: %v", err)
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal mengolah Excel."})
		return
	}

	acak := make([]byte, 16)
	_, _ = rand.Read(acak)
	id := hex.EncodeToString(acak)
	nama := namaAsliAman(fh.Filename)

	h.mu.Lock()
	for k, d := range h.draf {
		if time.Since(d.dibuat) > masaDrafDasbor {
			delete(h.draf, k)
		}
	}
	for len(h.draf) >= maksDrafDasbor { // buang draf tertua
		var tertua string
		for k, d := range h.draf {
			if tertua == "" || d.dibuat.Before(h.draf[tertua].dibuat) {
				tertua = k
			}
		}
		delete(h.draf, tertua)
	}
	h.draf[id] = drafDasbor{hasil: hasil, namaBerkas: nama, pemilik: u.ID, dibuat: time.Now()}
	h.mu.Unlock()

	var lama *dasbor.Ringkasan
	if aktif, _ := h.simpan.Aktif(); aktif != nil {
		lama = aktif.Ringkasan
	}
	peringatan := dasbor.Peringatan(hasil.Ringkasan, lama)
	if peringatan == nil {
		peringatan = []string{}
	}
	c.JSON(http.StatusOK, gin.H{
		"idDraf":        id,
		"namaBerkas":    nama,
		"ringkasan":     hasil.Ringkasan,
		"sebelumnya":    lama,
		"peringatan":    peringatan,
		"berlakuHingga": time.Now().Add(masaDrafDasbor),
	})
}

// Terapkan menangani POST /api/dasbor/data/terapkan {idDraf}.
func (h *DataDasborHandler) Terapkan(c *gin.Context) {
	u, ok := wajibSuperAdminDasbor(c)
	if !ok {
		return
	}
	var in struct {
		IDDraf string `json:"idDraf"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}
	h.mu.Lock()
	d, ada := h.draf[in.IDDraf]
	if ada && (d.pemilik != u.ID || time.Since(d.dibuat) > masaDrafDasbor) {
		ada = false
	}
	if ada {
		delete(h.draf, in.IDDraf)
	}
	h.mu.Unlock()
	if !ada {
		c.JSON(http.StatusConflict, domain.ErrorResponse{Message: "Pratinjau sudah kedaluwarsa. Unggah ulang Excel-nya."})
		return
	}

	m := dasbor.Meta{NamaBerkas: d.namaBerkas, DiunggahOleh: u.Nama, DiterapkanPada: time.Now()}
	if err := h.simpan.Terapkan(d.hasil.Publik, d.hasil.Internal, d.hasil.Relasi, m); err != nil {
		log.Printf("[dasbor] gagal menerapkan: %v", err)
		h.catat(u.ID, "Gagal memperbarui data dasbor dari "+d.namaBerkas, domain.HasilGagal)
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyimpan data dasbor."})
		return
	}
	r := d.hasil.Ringkasan
	h.catat(u.ID, fmt.Sprintf("Memperbarui data dasbor dari %s (%d proses bisnis, %d layanan, %d data, %d aplikasi)",
		d.namaBerkas, r.ProsesBisnis, r.Layanan, r.Data, r.Aplikasi), domain.HasilBerhasil)
	h.jawabStatus(c)
}

// Pulihkan menangani POST /api/dasbor/data/pulihkan {versi}.
func (h *DataDasborHandler) Pulihkan(c *gin.Context) {
	u, ok := wajibSuperAdminDasbor(c)
	if !ok {
		return
	}
	var in struct {
		Versi string `json:"versi"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}
	if _, err := h.simpan.Pulihkan(in.Versi, u.Nama, time.Now()); err != nil {
		if errors.Is(err, dasbor.ErrVersiTidakAda) {
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Versi data dasbor tidak ditemukan."})
			return
		}
		log.Printf("[dasbor] gagal memulihkan %s: %v", in.Versi, err)
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memulihkan data dasbor."})
		return
	}
	h.catat(u.ID, "Memulihkan data dasbor ke versi "+in.Versi, domain.HasilBerhasil)
	h.jawabStatus(c)
}

func (h *DataDasborHandler) jawabStatus(c *gin.Context) {
	s, err := h.status()
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal membaca data dasbor."})
		return
	}
	c.JSON(http.StatusOK, s)
}

func (h *DataDasborHandler) catat(userID uint, deskripsi string, hasil domain.HasilAudit) {
	if h.audit != nil {
		h.audit(&userID, domain.AksiDasbor, deskripsi, hasil)
	}
}
