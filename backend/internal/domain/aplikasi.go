package domain

import (
	"math"
	"strings"
	"time"

	"gorm.io/gorm"
)

type StatusValidasi string

const (
	StatusDraft       StatusValidasi = "draft"
	StatusMenunggu    StatusValidasi = "menunggu"
	StatusDisetujui   StatusValidasi = "disetujui"
	StatusPerluRevisi StatusValidasi = "perlu_revisi"
	StatusDitolak     StatusValidasi = "ditolak"
)

type StatusRaa string

const (
	StatusRaaSesuai          StatusRaa = "sesuai"
	StatusRaaPerluPenyesuaian StatusRaa = "perlu_penyesuaian"
	StatusRaaBelum           StatusRaa = "belum"
)

type KodeRaa struct {
	Level1 *string `json:"level1"`
	Level2 *string `json:"level2"`
	Level3 *string `json:"level3"`
}

// Aplikasi merepresentasikan entitas sistem/aplikasi yang didaftarkan oleh OPD
type Aplikasi struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	InstansiID      uint           `gorm:"not null;index" json:"-"`
	Instansi        Instansi       `gorm:"foreignKey:InstansiID" json:"instansi"`
	Nama            string         `gorm:"size:150;not null" json:"nama"`
	Deskripsi       string         `gorm:"type:text;not null" json:"deskripsi"`
	Kategori        *string        `gorm:"size:100" json:"kategori"`
	RaaLevel1       *string        `gorm:"size:20" json:"-"`
	RaaLevel2       *string        `gorm:"size:20" json:"-"`
	RaaLevel3       *string        `gorm:"size:20" json:"-"`
	Raa             KodeRaa        `gorm:"-" json:"raa"` // Format JSON objek nested sesuai frontend
	StatusValidasi  StatusValidasi `gorm:"size:30;not null;default:'draft'" json:"statusValidasi"`
	StatusRaa       StatusRaa      `gorm:"size:30;not null;default:'belum'" json:"statusRaa"`
	NilaiKesesuaian int            `gorm:"not null;default:0" json:"nilaiKesesuaian"`
	CatatanValidasi *string        `gorm:"type:text" json:"catatanValidasi"`
	DiperbaruiPada  time.Time      `gorm:"autoUpdateTime" json:"diperbaruiPada"`
	CreatedAt       time.Time      `json:"-"`
	UpdatedAt       time.Time      `json:"-"`
}

func (Aplikasi) TableName() string {
	return "aplikasi"
}

// AfterFind otomatis mengisi field nested Raa saat data dibaca dari database
func (a *Aplikasi) AfterFind(tx *gorm.DB) (err error) {
	a.Raa = KodeRaa{
		Level1: a.RaaLevel1,
		Level2: a.RaaLevel2,
		Level3: a.RaaLevel3,
	}
	return nil
}

// HitungKesesuaian menghitung persentase isian (0-100%) dan menentukan status RAA
func (a *Aplikasi) HitungKesesuaian() {
	terisi := 0
	total := 6 // nama, deskripsi, kategori, raa.level1, raa.level2, raa.level3

	if strings.TrimSpace(a.Nama) != "" {
		terisi++
	}
	if strings.TrimSpace(a.Deskripsi) != "" {
		terisi++
	}
	if a.Kategori != nil && strings.TrimSpace(*a.Kategori) != "" {
		terisi++
	}
	if a.RaaLevel1 != nil && strings.TrimSpace(*a.RaaLevel1) != "" {
		terisi++
	}
	if a.RaaLevel2 != nil && strings.TrimSpace(*a.RaaLevel2) != "" {
		terisi++
	}
	if a.RaaLevel3 != nil && strings.TrimSpace(*a.RaaLevel3) != "" {
		terisi++
	}

	a.NilaiKesesuaian = int(math.Round(float64(terisi) / float64(total) * 100))

	// Ambang batas kesesuaian: >=80 Sesuai, 50-79 Perlu Penyesuaian, <50 Belum
	if a.NilaiKesesuaian >= 80 {
		a.StatusRaa = StatusRaaSesuai
	} else if a.NilaiKesesuaian >= 50 {
		a.StatusRaa = StatusRaaPerluPenyesuaian
	} else {
		a.StatusRaa = StatusRaaBelum
	}
}

// AplikasiInput untuk payload request POST / PUT
type AplikasiInput struct {
	Nama       string  `json:"nama" binding:"required,min=3,max=100"`
	Deskripsi  string  `json:"deskripsi" binding:"max=500"`
	Kategori   *string `json:"kategori"`
	Raa        KodeRaa `json:"raa"`
	IDInstansi *uint   `json:"idInstansi"` // Hanya diisi oleh Super Admin jika mendaftarkan OPD lain
}

// RingkasanAplikasi untuk angka statistik di atas tabel
type RingkasanAplikasi struct {
	Total            int64 `json:"total"`
	Sesuai           int64 `json:"sesuai"`
	PerluPenyesuaian int64 `json:"perluPenyesuaian"`
	Belum            int64 `json:"belum"`
}

// AplikasiFilter untuk query parameter pencarian
type AplikasiFilter struct {
	Page           int            `form:"page,default=1"`
	Q              string         `form:"q"`
	StatusValidasi StatusValidasi `form:"statusValidasi"`
	StatusRaa      StatusRaa      `form:"statusRaa"`
	InstansiID     *uint          // Filter internal berdasarkan login / role
}

