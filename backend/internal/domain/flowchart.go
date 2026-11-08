package domain

import "time"

type KategoriProses string

const (
	KategoriUtama     KategoriProses = "utama"
	KategoriPendukung KategoriProses = "pendukung"
	KategoriManajemen KategoriProses = "manajemen"
	KategoriSub       KategoriProses = "sub"
)

type JenisProses string

const (
	JenisAsIs JenisProses = "as_is"
	JenisToBe JenisProses = "to_be"
)

type Flowchart struct {
	ID              uint               `gorm:"primaryKey" json:"id"`
	Kode            string             `gorm:"size:30;not null;uniqueIndex" json:"kode"`
	Nama            string             `gorm:"size:150;not null" json:"nama"`
	Deskripsi       string             `gorm:"type:text" json:"deskripsi"`
	Kategori        KategoriProses     `gorm:"size:30;not null" json:"kategori"`
	Jenis           JenisProses        `gorm:"size:20;not null" json:"jenis"`
	Versi           string             `gorm:"size:20;not null;default:'1.0'" json:"versi"`
	Pic             string             `gorm:"size:100;not null" json:"pic"`
	InstansiID      uint               `gorm:"not null;index" json:"-"`
	Instansi        Instansi           `gorm:"foreignKey:InstansiID" json:"instansi"`
	Status          StatusValidasi     `gorm:"size:30;not null;default:'draft'" json:"status"`
	CatatanValidasi *string            `gorm:"type:text" json:"catatanValidasi"`
	BpmnXml         string             `gorm:"type:text" json:"bpmnXml,omitempty"`
	DiperbaruiPada  time.Time          `gorm:"autoUpdateTime" json:"diperbaruiPada"`
	Aplikasi        []Aplikasi         `gorm:"many2many:flowchart_aplikasi;" json:"aplikasi"`
	Riwayat         []FlowchartRiwayat `gorm:"foreignKey:FlowchartID" json:"riwayat,omitempty"`
}

func (Flowchart) TableName() string {
	return "flowchart"
}

type FlowchartRiwayat struct {
	ID          uint      `gorm:"primaryKey" json:"-"`
	FlowchartID uint      `gorm:"not null;index" json:"-"`
	Versi       string    `gorm:"size:20" json:"versi"`
	Catatan     string    `gorm:"size:300" json:"catatan"`
	Oleh        string    `gorm:"size:150" json:"oleh"`
	Tanggal     time.Time `gorm:"autoCreateTime" json:"tanggal"`
}

func (FlowchartRiwayat) TableName() string {
	return "flowchart_riwayat"
}

// FlowchartInput digunakan untuk menerima data request dari frontend (saat form tambah/edit flowchart)
type FlowchartInput struct {
	Nama          string         `json:"nama" binding:"required,min=5,max=100"`
	Deskripsi     string         `json:"deskripsi" binding:"max=300"`
	Kategori      KategoriProses `json:"kategori" binding:"required"`
	Jenis         JenisProses    `json:"jenis" binding:"required"`
	Pic           string         `json:"pic" binding:"required,min=2,max=100"`
	IDAplikasi    []uint         `json:"idAplikasi"`
	IDSop         []uint         `json:"idSop"`
	BpmnXml       string         `json:"bpmnXml" binding:"required"`
	CatatanRevisi string         `json:"catatanRevisi"`
}

// HitunganFlowchart digunakan untuk mengirimkan data statistik dashboard ke frontend
type HitunganFlowchart struct {
	Total          int64            `json:"total"`
	Dipublikasikan int64            `json:"dipublikasikan"`
	Menunggu       int64            `json:"menunggu"`
	Draft          int64            `json:"draft"`
	PerKategori    map[string]int64 `json:"perKategori"`
}

// FlowchartFilter digunakan untuk menangkap query param dari URL (page, q, kategori, status)
type FlowchartFilter struct {
	Page       int                   `form:"page,default=1"`
	Q          string                `form:"q"`
	Kategori   KategoriProses        `form:"kategori"`
	Status     StatusValidasi        `form:"status"`
	InstansiID *uint                 // Filter internal berdasarkan OPD yang login
}

type DaftarFlowchartResponse struct {
	Items      []Flowchart        `json:"items"`
	Page       int                `json:"page"`
	TotalPages int                `json:"totalPages"`
	Total      int                `json:"total"`
	Hitungan   *HitunganFlowchart `json:"hitungan"`
}

