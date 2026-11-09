package domain

import "time"

type JenisData string

const (
	JenisDataAplikasi JenisData = "aplikasi"
	JenisDataRaa      JenisData = "raa"
	JenisDataProses   JenisData = "proses" // Flowchart proses bisnis
)

type Keputusan string

const (
	KeputusanDisetujui   Keputusan = "disetujui"
	KeputusanPerluRevisi Keputusan = "perlu_revisi"
	KeputusanDitolak     Keputusan = "ditolak"
)

type PengajuanValidasi struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	JenisData        JenisData      `gorm:"size:20;not null" json:"jenisData"`
	Status           StatusValidasi `gorm:"size:30;not null;default:'menunggu'" json:"status"`
	InstansiID       uint           `gorm:"not null;index" json:"-"`
	Instansi         Instansi       `gorm:"foreignKey:InstansiID" json:"instansi"`
	AplikasiID       *uint          `gorm:"index" json:"-"`
	Aplikasi         *Aplikasi      `gorm:"foreignKey:AplikasiID" json:"-"`
	FlowchartID      *uint          `gorm:"index" json:"-"`
	Flowchart        *Flowchart     `gorm:"foreignKey:FlowchartID" json:"-"`
	Pengaju          string         `gorm:"size:150;not null" json:"pengaju"`
	TanggalPengajuan time.Time      `gorm:"autoCreateTime" json:"tanggalPengajuan"`
	TanggalPutusan   *time.Time     `json:"tanggalPutusan"`
	Catatan          *string        `gorm:"type:text" json:"catatan"`
	CreatedAt        time.Time      `json:"-"`
	UpdatedAt        time.Time      `json:"-"`
}

func (PengajuanValidasi) TableName() string {
	return "pengajuan_validasi"
}

type TargetRingkas struct {
	ID   uint   `json:"id"`
	Nama string `json:"nama"`
}

type PengajuanItemResponse struct {
	ID               uint           `json:"id"`
	JenisData        JenisData      `json:"jenisData"`
	Status           StatusValidasi `json:"status"`
	Aplikasi         TargetRingkas  `json:"aplikasi"` // Menyimpan target { id, nama }
	Instansi         Instansi       `json:"instansi"`
	Pengaju          string         `json:"pengaju"`
	TanggalPengajuan time.Time      `json:"tanggalPengajuan"`
	TanggalPutusan   *time.Time     `json:"tanggalPutusan"`
	Catatan          *string        `json:"catatan"`
}

type PengajuanDetailResponse struct {
	PengajuanItemResponse
	Data   *Aplikasi  `json:"data"`   // Terisi jika jenisnya aplikasi atau raa
	Proses *Flowchart `json:"proses"` // Terisi jika jenisnya proses (flowchart)
}

// AjukanInput untuk payload POST /api/validasi
type AjukanInput struct {
	JenisData JenisData `json:"jenisData" binding:"required"`
	TargetIDs []uint    `json:"targetIds" binding:"required,min=1"`
}

type ItemDilewati struct {
	ID     uint   `json:"id"`
	Nama   string `json:"nama"`
	Alasan string `json:"alasan"`
}

type HasilAjukanResponse struct {
	Berhasil []uint         `json:"berhasil"`
	Dilewati []ItemDilewati `json:"dilewati"`
}

// KeputusanInput untuk payload POST /api/validasi/:id/keputusan
type KeputusanInput struct {
	Keputusan Keputusan `json:"keputusan" binding:"required"`
	Catatan   string    `json:"catatan"`
}

type HitunganValidasi struct {
	Semua       int64 `json:"semua"`
	Menunggu    int64 `json:"menunggu"`
	Disetujui   int64 `json:"disetujui"`
	PerluRevisi int64 `json:"perlu_revisi"`
	Ditolak     int64 `json:"ditolak"`
}

type DaftarPengajuanResponse struct {
	Items      []PengajuanItemResponse `json:"items"`
	Page       int                     `json:"page"`
	TotalPages int                     `json:"totalPages"`
	Total      int                     `json:"total"`
	Hitungan   *HitunganValidasi       `json:"hitungan"`
}

type ValidasiFilter struct {
	Page       int            `form:"page,default=1"`
	Q          string         `form:"q"`
	Status     StatusValidasi `form:"status"`
	InstansiID *uint          // Filter internal berdasarkan OPD yang login
}
