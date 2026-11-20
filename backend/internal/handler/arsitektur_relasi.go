package handler

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"spbe-backend/internal/dasbor"
	"spbe-backend/internal/domain"

	"github.com/gin-gonic/gin"
)

// Relasi antar-domain dari Excel matriks arsitektur (relasiArsitektur.json, dibuat saat data dasbor diterapkan).
// Dipakai halaman Buat Diagram Alur untuk menyusun diagram otomatis dari proses bisnis yang dipilih.

type cacheRelasi struct {
	data   *dasbor.Relasi
	diubah time.Time
	ukuran int64
}

func (h *DasborArsitekturHandler) muatRelasi() (*dasbor.Relasi, error) {
	path := filepath.Join(h.dir, dasbor.BerkasRelasi)
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if c := h.relasi; c != nil && c.diubah.Equal(info.ModTime()) && c.ukuran == info.Size() {
		return c.data, nil
	}
	isi, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var r dasbor.Relasi
	if err := json.Unmarshal(isi, &r); err != nil {
		return nil, err
	}
	h.relasi = &cacheRelasi{data: &r, diubah: info.ModTime(), ukuran: info.Size()}
	return &r, nil
}

// relasiAtauGalat mengirim respons galat dan mengembalikan nil bila relasi tidak dapat dipakai.
func (h *DasborArsitekturHandler) relasiAtauGalat(c *gin.Context) *dasbor.Relasi {
	r, err := h.muatRelasi()
	if err == nil {
		return r
	}
	if errors.Is(err, fs.ErrNotExist) {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Data arsitektur belum tersedia. Super Admin perlu mengunggah Excel matriks arsitektur di Dasbor Analitik."})
		return nil
	}
	log.Printf("[arsitektur] gagal membaca relasi: %v", err)
	c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat data arsitektur."})
	return nil
}

type ringkasProbis struct {
	ID             string `json:"id"`
	Nama           string `json:"nama"`
	Uraian         string `json:"uraian,omitempty"`
	Unit           string `json:"unit"`
	Jenis          string `json:"jenis"`
	StatusBpmnAsIs string `json:"statusBpmnAsIs,omitempty"`
	StatusBpmnToBe string `json:"statusBpmnToBe,omitempty"`
}

// DaftarProsesBisnis menangani GET /api/arsitektur/proses-bisnis.
func (h *DasborArsitekturHandler) DaftarProsesBisnis(c *gin.Context) {
	if _, ok := wajibLogin(c); !ok {
		return
	}
	r := h.relasiAtauGalat(c)
	if r == nil {
		return
	}
	items := make([]ringkasProbis, 0, len(r.ProsesBisnis))
	for _, p := range r.ProsesBisnis {
		items = append(items, ringkasProbis{ID: p.ID, Nama: p.Nama, Uraian: p.Uraian, Unit: strings.TrimSpace(p.Unit), Jenis: p.Jenis,
			StatusBpmnAsIs: p.StatusBpmnAsIs, StatusBpmnToBe: p.StatusBpmnToBe})
	}
	c.Header("Cache-Control", "private, max-age=300")
	c.JSON(http.StatusOK, gin.H{"items": items})
}

// RantaiProsesBisnis menangani GET /api/arsitektur/rantai?id=<ID Proses Bisnis>.
func (h *DasborArsitekturHandler) RantaiProsesBisnis(c *gin.Context) {
	if _, ok := wajibLogin(c); !ok {
		return
	}
	id := strings.TrimSpace(c.Query("id"))
	if id == "" {
		c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{Message: "Pilih proses bisnis."})
		return
	}
	r := h.relasiAtauGalat(c)
	if r == nil {
		return
	}
	hasil, ok := r.Rantai(id)
	if !ok {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Proses bisnis tidak ditemukan di data arsitektur."})
		return
	}
	c.Header("Cache-Control", "private, max-age=300")
	c.JSON(http.StatusOK, hasil)
}
