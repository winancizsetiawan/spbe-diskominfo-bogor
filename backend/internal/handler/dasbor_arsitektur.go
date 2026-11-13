package handler

import (
	"errors"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"spbe-backend/internal/domain"

	"github.com/gin-gonic/gin"
)

// DasborArsitekturHandler menyajikan Dasbor Publik dan Dasbor Analitik (arsitektur SPBE, tujuh domain).
//
// Datanya bukan dari database: dua berkas JSON dibuat oleh frontend/scripts/excel_dasbor_publik.py dari matriks
// Excel arsitektur SPBE dan ditaruh di folder DASBOR_DATA_DIR (bawaan ./data/dasbor):
//   - dasborPublik.json   : sudah dibatasi untuk umum (tanpa risiko layanan, detail teknis aplikasi, perangkat
//     infrastruktur, kerentanan/insiden/audit keamanan, dan nominal anggaran).
//   - dasborInternal.json : lengkap tanpa batasan, hanya untuk pengguna yang sudah masuk.
//
// Batasan publik ditegakkan dengan berkas terpisah: berkas internal tidak pernah dikirim ke endpoint publik.
// Kontrak lengkap: frontend/docs/kontrak-api-dasbor.md.
type DasborArsitekturHandler struct {
	dir   string
	mu    sync.Mutex
	cache map[string]berkasDasbor
}

type berkasDasbor struct {
	isi    []byte
	diubah time.Time
	ukuran int64
}

const (
	berkasPublik   = "dasborPublik.json"
	berkasInternal = "dasborInternal.json"
)

func NewDasborArsitekturHandler(dir string) *DasborArsitekturHandler {
	return &DasborArsitekturHandler{dir: dir, cache: map[string]berkasDasbor{}}
}

// muat membaca berkas dan menyimpannya di memori; dibaca ulang hanya bila berkasnya berubah,
// jadi data baru dari skrip konversi langsung terpakai tanpa restart server.
func (h *DasborArsitekturHandler) muat(nama string) ([]byte, error) {
	path := filepath.Join(h.dir, nama)
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if c, ada := h.cache[nama]; ada && c.diubah.Equal(info.ModTime()) && c.ukuran == info.Size() {
		return c.isi, nil
	}
	isi, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	h.cache[nama] = berkasDasbor{isi: isi, diubah: info.ModTime(), ukuran: info.Size()}
	return isi, nil
}

func (h *DasborArsitekturHandler) kirim(c *gin.Context, nama string) {
	isi, err := h.muat(nama)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			// FE membaca 404 sebagai "data dasbor belum tersedia", bukan galat sistem.
			c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Data dasbor belum tersedia."})
			return
		}
		log.Printf("[dasbor] gagal membaca %s: %v", nama, err)
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat data dasbor."})
		return
	}
	// Data jarang berubah; boleh disimpan sebentar oleh peramban. Versi internal tidak boleh disimpan proksi bersama.
	if nama == berkasInternal {
		c.Header("Cache-Control", "private, max-age=300")
	} else {
		c.Header("Cache-Control", "public, max-age=300")
	}
	c.Data(http.StatusOK, "application/json; charset=utf-8", isi)
}

// GetPublik menangani GET /api/dasbor/publik (tanpa login).
func (h *DasborArsitekturHandler) GetPublik(c *gin.Context) {
	h.kirim(c, berkasPublik)
}

// GetAnalitik menangani GET /api/dasbor/analitik (semua role yang sudah masuk; tanpa token -> 401).
func (h *DasborArsitekturHandler) GetAnalitik(c *gin.Context) {
	if _, ok := wajibLogin(c); !ok {
		return
	}
	h.kirim(c, berkasInternal)
}
