package domain

import "time"

type JenisDokumen string

const (
	JenisRegulasi   JenisDokumen = "regulasi"
	JenisPedoman    JenisDokumen = "pedoman"
	JenisLaporan    JenisDokumen = "laporan"
	JenisPresentasi JenisDokumen = "presentasi"
	JenisTemplate   JenisDokumen = "template"
	JenisSOP        JenisDokumen = "sop"
	JenisPanduan    JenisDokumen = "panduan"
	JenisLainnya    JenisDokumen = "lainnya"
)

type TipeBerkas string

const (
	TipePDF  TipeBerkas = "pdf"
	TipeDOCX TipeBerkas = "docx"
	TipeXLSX TipeBerkas = "xlsx"
	TipePPTX TipeBerkas = "pptx"
)

type StatusDokumen string

const (
	StatusDokDraft   StatusDokumen = "draft"
	StatusDokReview  StatusDokumen = "review"
	StatusDokBerlaku StatusDokumen = "berlaku"
	StatusDokArsip   StatusDokumen = "arsip"
)

type Visibilitas string

const (
	VisibilitasPublik   Visibilitas = "publik"
	VisibilitasInternal Visibilitas = "internal"
)

type KelompokDokumen string

const (
	KelompokDokumenUmum KelompokDokumen = "dokumen"
	KelompokSOP         KelompokDokumen = "sop"
)

// KategoriDokumen merepresentasikan kategori pengelompokan SOP.
type KategoriDokumen struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Nama string `gorm:"size:100;not null;uniqueIndex" json:"nama"`
}

func (KategoriDokumen) TableName() string {
	return "kategori_dokumen"
}

// Dokumen merepresentasikan berkas dokumen SPBE maupun SOP di repositori.
type Dokumen struct {
	ID            uint             `gorm:"primaryKey" json:"id"`
	Jenis         JenisDokumen     `gorm:"size:30;not null;index" json:"jenis"`
	Judul         string           `gorm:"size:150;not null" json:"judul"`
	Deskripsi     string           `gorm:"type:text;not null" json:"deskripsi"`
	TipeBerkas    TipeBerkas       `gorm:"size:10;not null" json:"tipeBerkas"`
	UkuranMb      float64          `gorm:"type:numeric(6,2);not null" json:"ukuranMb"`
	Versi         string           `gorm:"size:20;not null" json:"versi"`
	Sumber        *string          `gorm:"size:100" json:"sumber"`
	Status        StatusDokumen    `gorm:"size:20;not null;default:'draft';index" json:"status"`
	Visibilitas   Visibilitas      `gorm:"size:20;not null;default:'internal';index" json:"visibilitas"`
	JumlahUnduhan int              `gorm:"not null;default:0" json:"jumlahUnduhan"`
	IdKategori    *uint            `gorm:"index" json:"-"`
	Kategori      *KategoriDokumen `gorm:"foreignKey:IdKategori" json:"kategori"`
	PathBerkas    string           `gorm:"size:255" json:"-"`
	TanggalRilis  time.Time        `gorm:"autoCreateTime;index" json:"tanggalRilis"`
	UpdatedAt     time.Time        `json:"-"`
}

func (Dokumen) TableName() string {
	return "dokumen"
}

// RingkasanDokumen untuk kartu statistik di halaman Dokumen & SOP.
type RingkasanDokumen struct {
	Total        int64 `json:"total"`
	Berlaku      int64 `json:"berlaku"`
	Review       int64 `json:"review"`
	TotalUnduhan int64 `json:"totalUnduhan"`
}

// HitunganStatusDokumen untuk tab filter status di halaman Admin Repositori.
type HitunganStatusDokumen struct {
	Semua   int64 `json:"semua"`
	Draft   int64 `json:"draft"`
	Review  int64 `json:"review"`
	Berlaku int64 `json:"berlaku"`
	Arsip   int64 `json:"arsip"`
}

// AdminDokumenPagedResponse sesuai ekspektasi GET /api/admin/dokumen di frontend.
type AdminDokumenPagedResponse struct {
	Items      []Dokumen             `json:"items"`
	Page       int                   `json:"page"`
	TotalPages int                   `json:"totalPages"`
	Total      int64                 `json:"total"`
	Hitungan   HitunganStatusDokumen `json:"hitungan"`
}

// DokumenFilter adalah parameter query untuk GET /api/dokumen.
type DokumenFilter struct {
	Page            int
	PerPage         int
	Kelompok        KelompokDokumen
	Query           string
	Jenis           string
	IdKategori      uint
	UrutPopuler     bool
	SudahLogin      bool
	IsSuperAdmin    bool
}

// AdminDokumenFilter adalah parameter query untuk GET /api/admin/dokumen.
type AdminDokumenFilter struct {
	Page    int
	PerPage int
	Query   string
	Status  string
}

// MetadataDokumenInput adalah payload metadata saat mulai mengunggah dokumen.
type MetadataDokumenInput struct {
	Jenis       JenisDokumen `json:"jenis"`
	IdKategori  *uint        `json:"idKategori"`
	Judul       string       `json:"judul"`
	Deskripsi   string       `json:"deskripsi"`
	Versi       string       `json:"versi"`
	Sumber      *string      `json:"sumber"`
	Visibilitas Visibilitas  `json:"visibilitas"`
}

// MulaiUnggahInput adalah request body untuk POST /api/dokumen/unggah/mulai.
type MulaiUnggahInput struct {
	Nama        string               `json:"nama"`
	TipeBerkas  TipeBerkas           `json:"tipeBerkas"`
	UkuranBytes int64                `json:"ukuranBytes"`
	Metadata    MetadataDokumenInput `json:"metadata"`
}

// SesiUnggahResponse adalah response dari POST /api/dokumen/unggah/mulai.
type SesiUnggahResponse struct {
	IdSesi    string            `json:"idSesi"`
	UrlUnggah string            `json:"urlUnggah"`
	Fields    map[string]string `json:"fields"`
}

// SelesaiUnggahInput adalah request body untuk POST /api/dokumen/unggah/selesai.
type SelesaiUnggahInput struct {
	IdSesi string `json:"idSesi"`
}

// UbahStatusDokumenInput adalah request body untuk PATCH /api/dokumen/:id.
type UbahStatusDokumenInput struct {
	Status StatusDokumen `json:"status"`
}

// UnduhDokumenResponse adalah response dari GET /api/dokumen/:id/unduh.
type UnduhDokumenResponse struct {
	URL        string `json:"url"`
	NamaBerkas string `json:"namaBerkas"`
}

