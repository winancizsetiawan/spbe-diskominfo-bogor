package handler

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"spbe-backend/internal/domain"
	"spbe-backend/internal/service"

	"github.com/gin-gonic/gin"
)

const (
	awalanURLBerkas = "/api/dokumen/berkas/"
	masaTautanUnduh = 2 * time.Minute
)

var (
	// Nama berkas tersimpan selalu 32 hex acak + ekstensi yang sudah divalidasi. Pola ketat
	// menutup path traversal dan permintaan ke berkas lain di folder yang sama.
	polaNamaBerkas = regexp.MustCompile(`^[a-f0-9]{32}\.(pdf|docx|xlsx|pptx)$`)
	polaIDSesi     = regexp.MustCompile(`^[a-f0-9]{32}$`)

	// Kunci penanda tautan unduh. Dibuat acak tiap server menyala: tautan lama otomatis tidak berlaku
	// setelah restart, dan tidak ada rahasia yang perlu disimpan.
	kunciUnduh = func() []byte {
		k := make([]byte, 32)
		_, _ = rand.Read(k)
		return k
	}()

	// Isi awal berkas yang wajib cocok dengan ekstensinya (pemeriksaan "magic bytes").
	tandaBerkas = map[domain.TipeBerkas][]byte{
		domain.TipePDF:  []byte("%PDF-"),
		domain.TipeDOCX: {'P', 'K', 3, 4},
		domain.TipeXLSX: {'P', 'K', 3, 4},
		domain.TipePPTX: {'P', 'K', 3, 4},
	}

	jenisIsi = map[string]string{
		".pdf":  "application/pdf",
		".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	}
)

func tandaTautan(nama string, kedaluwarsa int64) string {
	m := hmac.New(sha256.New, kunciUnduh)
	fmt.Fprintf(m, "%s|%d", nama, kedaluwarsa)
	return hex.EncodeToString(m.Sum(nil))
}

// tautanUnduhBertanda menambahkan token pendek ke URL berkas. Hak akses sudah diperiksa
// sebelum tautan dibuat (lihat Unduh); token ini hanya membuktikan hal itu kepada endpoint berkas.
// Token terikat ke satu nama berkas dan kedaluwarsa dalam beberapa menit. Ini bukan token sesi.
func tautanUnduhBertanda(urlBerkas string) string {
	if !strings.HasPrefix(urlBerkas, awalanURLBerkas) {
		return urlBerkas
	}
	nama := path.Base(urlBerkas)
	exp := time.Now().Add(masaTautanUnduh).Unix()
	return fmt.Sprintf("%s?e=%d&s=%s", urlBerkas, exp, tandaTautan(nama, exp))
}

// BerkasUnduh menangani GET /api/dokumen/berkas/:nama (tautan bertanda dari /dokumen/:id/unduh).
func (h *DokumenHandler) BerkasUnduh(c *gin.Context) {
	nama := c.Param("nama")
	if !polaNamaBerkas.MatchString(nama) {
		c.Status(http.StatusNotFound)
		return
	}
	exp, err := strconv.ParseInt(c.Query("e"), 10, 64)
	sah := err == nil && time.Now().Unix() <= exp &&
		hmac.Equal([]byte(c.Query("s")), []byte(tandaTautan(nama, exp)))
	if !sah {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: "Tautan unduhan tidak valid atau sudah kedaluwarsa. Buka ulang dari halaman dokumen."})
		return
	}
	lokal := filepath.Join("uploads", "dokumen", nama)
	if _, err := os.Stat(lokal); err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	c.Header("Content-Type", jenisIsi[filepath.Ext(nama)])
	c.Header("Content-Disposition", `attachment; filename="`+nama+`"`)
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Cache-Control", "private, no-store")
	c.File(lokal)
}

// UnggahBerkas menangani POST /api/dokumen/unggah/berkas/:idSesi.
// Hanya Super Admin. Tipe berkas diambil dari sesi yang sudah divalidasi pada tahap "mulai",
// bukan dari nama berkas kiriman klien; ukuran dan isi awal berkas diperiksa ulang di sini.
func (h *DokumenHandler) UnggahBerkas(c *gin.Context) {
	sudahLogin, isSuperAdmin := ekstrakPeranRequest(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}
	if !isSuperAdmin {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: "Hanya Super Admin yang dapat mengelola repositori."})
		return
	}

	idSesi := c.Param("idSesi")
	if !polaIDSesi.MatchString(idSesi) {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: service.ErrSesiUnggahKedaluwarsa.Error()})
		return
	}
	tipe, err := h.svc.TipeSesi(idSesi)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
		return
	}

	// Batas keras sebelum body dibaca: ukuran maksimal + sedikit ruang untuk pembungkus multipart.
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, service.BatasUnggahBytes+(1<<20))
	fileHeader, err := c.FormFile("file")
	if err != nil {
		var terlalu *http.MaxBytesError
		if errors.As(err, &terlalu) {
			c.JSON(http.StatusRequestEntityTooLarge, domain.ErrorResponse{Message: "Ukuran maksimal 10 MB."})
			return
		}
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Berkas tidak ditemukan."})
		return
	}
	if fileHeader.Size <= 0 {
		c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{Message: "Berkas kosong."})
		return
	}
	if fileHeader.Size > service.BatasUnggahBytes {
		c.JSON(http.StatusRequestEntityTooLarge, domain.ErrorResponse{Message: "Ukuran maksimal 10 MB."})
		return
	}

	f, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Berkas tidak dapat dibaca."})
		return
	}
	awal := make([]byte, 8)
	n, _ := io.ReadFull(f, awal)
	_ = f.Close()
	tanda := tandaBerkas[tipe]
	if tanda == nil || n < len(tanda) || string(awal[:len(tanda)]) != string(tanda) {
		c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{Message: "Isi berkas tidak sesuai dengan tipenya."})
		return
	}

	folder := filepath.Join("uploads", "dokumen")
	if err := os.MkdirAll(folder, 0o750); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyiapkan ruang penyimpanan."})
		return
	}
	nama := idSesi + "." + string(tipe)
	lokal := filepath.Join(folder, nama)
	if err := c.SaveUploadedFile(fileHeader, lokal); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyimpan berkas."})
		return
	}
	if err := h.svc.SimpanBerkasSesi(idSesi, awalanURLBerkas+nama); err != nil {
		_ = os.Remove(lokal)
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
