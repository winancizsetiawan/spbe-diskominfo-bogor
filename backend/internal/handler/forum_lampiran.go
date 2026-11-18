package handler

import (
	"crypto/hmac"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"spbe-backend/internal/domain"
	"spbe-backend/internal/service"

	"github.com/gin-gonic/gin"
)

const (
	batasLampiranForum = 5 << 20 // 5 MB per berkas
	masaTautanLampiran = 30 * time.Minute
)

// Tipe yang diterima, ditentukan dari isi berkas (bukan nama atau header kiriman klien).
var ekstensiLampiran = map[string]string{
	"image/png":       "png",
	"image/jpeg":      "jpg",
	"image/webp":      "webp",
	"application/pdf": "pdf",
}

func folderLampiranForum() string { return filepath.Join("uploads", "forum") }

// tandaiLampiran menambahkan tanda tangan berumur pendek ke URL lampiran, sehingga <img> dan
// tautan unduh dapat dibuka tanpa header Authorization. Hak baca sudah diperiksa sebelum URL dibuat.
func tandaiLampiran(list []domain.LampiranDTO) {
	exp := time.Now().Add(masaTautanLampiran).Unix()
	for i := range list {
		nama := path.Base(list[i].Url)
		list[i].Url = fmt.Sprintf("%s?e=%d&s=%s", list[i].Url, exp, tandaTautan("forum/"+nama, exp))
	}
}

func tandaiThread(t *domain.ThreadDetailResponse) {
	tandaiLampiran(t.Lampiran)
	for i := range t.Balasan {
		tandaiLampiran(t.Balasan[i].Lampiran)
	}
}

// namaAsliAman membuang path dan karakter kontrol dari nama berkas kiriman klien (hanya untuk tampilan).
func namaAsliAman(nama string) string {
	nama = filepath.Base(strings.ReplaceAll(nama, "\\", "/"))
	nama = strings.Map(func(r rune) rune {
		if r < 0x20 || r == 0x7f || r == '"' {
			return -1
		}
		return r
	}, nama)
	if nama == "" || nama == "." || nama == "/" {
		nama = "lampiran"
	}
	for utf8.RuneCountInString(nama) > 200 {
		r := []rune(nama)
		nama = string(r[:200])
	}
	return nama
}

// UnggahLampiran menangani POST /api/forum/lampiran (multipart, field "file").
// Semua pengguna yang login boleh mengunggah gambar (PNG/JPG/WEBP) atau PDF maksimal 5 MB.
func (h *ForumHandler) UnggahLampiran(c *gin.Context) {
	sudahLogin, role := ekstrakRoleLogin(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, batasLampiranForum+(1<<20))
	fh, err := c.FormFile("file")
	if err != nil {
		var terlalu *http.MaxBytesError
		if errors.As(err, &terlalu) {
			c.JSON(http.StatusRequestEntityTooLarge, domain.ErrorResponse{Message: "Ukuran lampiran maksimal 5 MB."})
			return
		}
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Berkas tidak ditemukan."})
		return
	}
	if fh.Size <= 0 {
		c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{Message: "Berkas kosong."})
		return
	}
	if fh.Size > batasLampiranForum {
		c.JSON(http.StatusRequestEntityTooLarge, domain.ErrorResponse{Message: "Ukuran lampiran maksimal 5 MB."})
		return
	}

	f, err := fh.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Berkas tidak dapat dibaca."})
		return
	}
	awal := make([]byte, 512)
	n, _ := io.ReadFull(f, awal)
	_ = f.Close()
	tipe := http.DetectContentType(awal[:n])
	ext, ok := ekstensiLampiran[tipe]
	if !ok {
		c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{Message: "Lampiran harus berupa gambar (PNG, JPG, WEBP) atau PDF."})
		return
	}

	acak := make([]byte, 16)
	if _, err := rand.Read(acak); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyimpan lampiran."})
		return
	}
	nama := hex.EncodeToString(acak) + "." + ext
	if err := os.MkdirAll(folderLampiranForum(), 0o750); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyiapkan ruang penyimpanan."})
		return
	}
	lokal := filepath.Join(folderLampiranForum(), nama)
	if err := c.SaveUploadedFile(fh, lokal); err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyimpan lampiran."})
		return
	}

	dto, err := h.svc.CatatLampiran(role, nama, namaAsliAman(fh.Filename), tipe, fh.Size)
	if err != nil {
		_ = os.Remove(lokal)
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal menyimpan lampiran."})
		return
	}
	list := []domain.LampiranDTO{*dto}
	tandaiLampiran(list)
	c.JSON(http.StatusCreated, list[0])
}

// LampiranUnduh menangani GET /api/forum/lampiran/:nama?e=&s= (tautan bertanda dari detail thread).
func (h *ForumHandler) LampiranUnduh(c *gin.Context) {
	nama := c.Param("nama")
	if !service.NamaLampiranSah(nama) {
		c.Status(http.StatusNotFound)
		return
	}
	exp, err := strconv.ParseInt(c.Query("e"), 10, 64)
	sah := err == nil && time.Now().Unix() <= exp &&
		hmac.Equal([]byte(c.Query("s")), []byte(tandaTautan("forum/"+nama, exp)))
	if !sah {
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: "Tautan lampiran kedaluwarsa. Muat ulang halaman diskusi."})
		return
	}
	l, err := h.svc.LampiranAda(nama)
	lokal := filepath.Join(folderLampiranForum(), nama)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	if _, err := os.Stat(lokal); err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	// Gambar ditampilkan langsung; PDF selalu diunduh agar tidak dijalankan di origin aplikasi.
	disposisi := "inline"
	if l.Tipe == "application/pdf" {
		disposisi = "attachment"
	}
	c.Header("Content-Type", l.Tipe)
	c.Header("Content-Disposition", fmt.Sprintf(`%s; filename="%s"; filename*=UTF-8''%s`, disposisi, nama, url.PathEscape(l.NamaAsli)))
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Content-Security-Policy", "default-src 'none'; sandbox")
	c.Header("Cache-Control", "private, max-age=600")
	c.File(lokal)
}

// CariPengguna menangani GET /api/forum/pengguna?q= (pilihan penerima thread).
func (h *ForumHandler) CariPengguna(c *gin.Context) {
	sudahLogin, role := ekstrakRoleLogin(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}
	q := c.Query("q")
	if utf8.RuneCountInString(q) > 100 {
		q = string([]rune(q)[:100])
	}
	list, err := h.svc.CariPengguna(role, q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: "Gagal memuat daftar pengguna."})
		return
	}
	c.JSON(http.StatusOK, list)
}

// UbahPenerima menangani PUT /api/forum/thread/:id/penerima (penugasan ulang).
func (h *ForumHandler) UbahPenerima(c *gin.Context) {
	sudahLogin, role := ekstrakRoleLogin(c)
	if !sudahLogin {
		c.JSON(http.StatusUnauthorized, domain.ErrorResponse{Message: "Sesi tidak valid."})
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id < 1 {
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: "Diskusi tidak ditemukan."})
		return
	}
	var in domain.UbahPenerimaInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, domain.ErrorResponse{Message: "Format data tidak valid."})
		return
	}
	res, err := h.svc.UbahPenerima(uint(id), role, in)
	if err != nil {
		jawabGalatForum(c, err, "Gagal memperbarui penugasan.")
		return
	}
	c.JSON(http.StatusOK, gin.H{"penerima": res})
}

// jawabGalatForum memetakan galat layanan forum ke status HTTP.
func jawabGalatForum(c *gin.Context, err error, pesanUmum string) {
	var valErr *service.ValidationError
	var konflikErr *service.ForumKonflikError
	switch {
	case errors.Is(err, service.ErrThreadTidakDitemukan), errors.Is(err, service.ErrBalasanTidakDitemukan):
		c.JSON(http.StatusNotFound, domain.ErrorResponse{Message: err.Error()})
	case errors.Is(err, service.ErrForumBukanPenerima), errors.Is(err, service.ErrForumBukanPembuat):
		c.JSON(http.StatusForbidden, domain.ErrorResponse{Message: err.Error()})
	case errors.As(err, &konflikErr):
		c.JSON(http.StatusConflict, domain.ErrorResponse{Message: konflikErr.Pesan})
	case errors.As(err, &valErr):
		c.JSON(http.StatusUnprocessableEntity, domain.ErrorResponse{Message: "Periksa kembali isian Anda.", Errors: valErr.Errors})
	default:
		c.JSON(http.StatusInternalServerError, domain.ErrorResponse{Message: pesanUmum})
	}
}
