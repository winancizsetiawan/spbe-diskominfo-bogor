package domain

import "time"

// ---- 1. Profil & Preferensi Pengguna ----

type ProfilPengguna struct {
	UserID      uint    `gorm:"primaryKey" json:"userId"`
	NIP         string  `gorm:"size:50" json:"nip"`
	Jabatan     string  `gorm:"size:100" json:"jabatan"`
	Golongan    string  `gorm:"size:50" json:"golongan"`
	SatkerInduk string  `gorm:"size:150" json:"satkerInduk"`
	NoTelepon   *string `gorm:"size:30" json:"noTelepon"`
	KanalEmail  bool    `gorm:"not null;default:true" json:"kanalEmail"`
}

func (ProfilPengguna) TableName() string {
	return "profil_pengguna"
}

type StatistikProfil struct {
	DokumenDiunduh int `json:"dokumenDiunduh"`
	DiskusiForum   int `json:"diskusiForum"`
}

type InstansiRingkas struct {
	ID   uint   `json:"id"`
	Nama string `json:"nama"`
}

type ProfilSayaResponse struct {
	Nama        string          `json:"nama"`
	Email       string          `json:"email"`
	NIP         string          `json:"nip"`
	Jabatan     string          `json:"jabatan"`
	Golongan    string          `json:"golongan"`
	SatkerInduk string          `json:"satkerInduk"`
	NoTelepon   *string         `json:"noTelepon"`
	Instansi    InstansiRingkas `json:"instansi"`
	Role        Role            `json:"role"`
	Statistik   StatistikProfil `json:"statistik"`
}

type UbahTeleponInput struct {
	NoTelepon *string `json:"noTelepon"`
}

type UbahPreferensiInput struct {
	KanalEmail bool `json:"kanalEmail"`
}

type PreferensiResponse struct {
	KanalEmail bool `json:"kanalEmail"`
}

// ---- 2. Manajemen Pengguna (Admin) ----

type PenggunaDTO struct {
	ID            uint            `json:"id"`
	Nama          string          `json:"nama"`
	Email         string          `json:"email"`
	Role          Role            `json:"role"`
	StatusAkun    StatusAkun      `json:"statusAkun"`
	Instansi      InstansiRingkas `json:"instansi"`
	LoginTerakhir *time.Time      `json:"loginTerakhir,omitempty"`
}

type HitunganRolePengguna struct {
	Semua      int `json:"semua"`
	ASN        int `json:"asn"`
	Akademisi  int `json:"akademisi"`
	AdminOPD   int `json:"admin_opd"`
	SuperAdmin int `json:"super_admin"`
}

type DaftarPenggunaResponse struct {
	Items      []PenggunaDTO        `json:"items"`
	Page       int                  `json:"page"`
	TotalPages int                  `json:"totalPages"`
	Total      int                  `json:"total"`
	Hitungan   HitunganRolePengguna `json:"hitungan"`
}

type PenggunaFilter struct {
	Page    int
	PerPage int
	Role    string
	Query   string
}

type UndangInput struct {
	Nama       string `json:"nama"`
	Email      string `json:"email"`
	Role       Role   `json:"role"`
	IdInstansi uint   `json:"idInstansi"`
}

type UbahPenggunaInput struct {
	Role       *Role       `json:"role"`
	IdInstansi *uint       `json:"idInstansi"`
	StatusAkun *StatusAkun `json:"statusAkun"`
}

// ---- 3. Notifikasi ----

type KategoriNotifikasi string

const (
	KategoriNotifDokumen      KategoriNotifikasi = "dokumen"
	KategoriNotifForum        KategoriNotifikasi = "forum"
	KategoriNotifValidasi     KategoriNotifikasi = "validasi"
	KategoriNotifSistem       KategoriNotifikasi = "sistem"
	KategoriNotifPembelajaran KategoriNotifikasi = "pembelajaran"
)

type Notifikasi struct {
	ID          uint               `gorm:"primaryKey" json:"id"`
	UserID      uint               `gorm:"not null;index" json:"-"`
	Kategori    KategoriNotifikasi `gorm:"size:30;not null;index" json:"kategori"`
	Judul       string             `gorm:"size:150;not null" json:"judul"`
	Pesan       string             `gorm:"size:500;not null" json:"pesan"`
	UrlTujuan   string             `gorm:"size:255;not null" json:"urlTujuan"`
	SudahDibaca bool               `gorm:"not null;default:false;index" json:"sudahDibaca"`
	DibuatPada  time.Time          `gorm:"autoCreateTime;index" json:"dibuatPada"`
}

func (Notifikasi) TableName() string {
	return "notifikasi"
}

type NotifikasiDTO struct {
	ID          uint               `json:"id"`
	Kategori    KategoriNotifikasi `json:"kategori"`
	Judul       string             `json:"judul"`
	Pesan       string             `json:"pesan"`
	UrlTujuan   string             `json:"urlTujuan"`
	SudahDibaca bool               `json:"sudahDibaca"`
	DibuatPada  time.Time          `json:"dibuatPada"`
}

type DaftarNotifikasiResponse struct {
	Items       []NotifikasiDTO `json:"items"`
	Page        int             `json:"page"`
	TotalPages  int             `json:"totalPages"`
	Total       int             `json:"total"`
	BelumDibaca map[string]int  `json:"belumDibaca"`
}

type RingkasNotifikasiResponse struct {
	BelumDibaca int `json:"belumDibaca"`
}

type DibacaSemuaInput struct {
	Kategori string `json:"kategori"`
}

// ---- 4. Pembelajaran / LMS ----

type TingkatKursus string

const (
	TingkatDasar    TingkatKursus = "dasar"
	TingkatMenengah TingkatKursus = "menengah"
	TingkatLanjutan TingkatKursus = "lanjutan"
)

type TipeMediaKursus string

const (
	TipeMediaVideo   TipeMediaKursus = "video"
	TipeMediaDokumen TipeMediaKursus = "dokumen"
	TipeMediaAudio   TipeMediaKursus = "audio"
	TipeMediaTautan  TipeMediaKursus = "tautan"
)

type Kursus struct {
	ID            uint            `gorm:"primaryKey" json:"id"`
	Judul         string          `gorm:"size:150;not null" json:"judul"`
	Deskripsi     string          `gorm:"type:text;not null" json:"deskripsi"`
	Kategori      string          `gorm:"size:100;not null" json:"kategori"`
	Tingkat       TingkatKursus   `gorm:"size:30;not null" json:"tingkat"`
	DurasiJam     int             `gorm:"not null;default:1" json:"durasiJam"`
	AdaSertifikat bool            `gorm:"not null;default:true" json:"adaSertifikat"`
	Materi        []MateriKursus  `gorm:"foreignKey:KursusID;constraint:OnDelete:CASCADE" json:"materi,omitempty"`
	CreatedAt     time.Time       `gorm:"autoCreateTime" json:"-"`
}

func (Kursus) TableName() string {
	return "kursus"
}

type MateriKursus struct {
	ID       uint            `gorm:"primaryKey" json:"id"`
	KursusID uint            `gorm:"not null;index" json:"kursusId"`
	Judul    string          `gorm:"size:150;not null" json:"judul"`
	Tipe     TipeMediaKursus `gorm:"size:20;not null;default:'video'" json:"tipe"`
	URL      string          `gorm:"size:255;not null" json:"url"`
	Urutan   int             `gorm:"not null;default:1" json:"urutan"`
}

func (MateriKursus) TableName() string {
	return "kursus_materi"
}

type KursusProgres struct {
	UserID      uint      `gorm:"primaryKey" json:"userId"`
	MateriID    uint      `gorm:"primaryKey" json:"materiId"`
	KursusID    uint      `gorm:"not null;index" json:"kursusId"`
	SelesaiPada time.Time `gorm:"autoCreateTime" json:"selesaiPada"`
}

func (KursusProgres) TableName() string {
	return "kursus_progres"
}

type SertifikatDTO struct {
	Nomor          string    `json:"nomor"`
	Kursus         string    `json:"kursus"`
	DiterbitkanPada time.Time `json:"diterbitkanPada"`
}

type KursusSertifikat struct {
	UserID          uint      `gorm:"primaryKey" json:"userId"`
	KursusID        uint      `gorm:"primaryKey" json:"kursusId"`
	Nomor           string    `gorm:"size:100;not null;uniqueIndex" json:"nomor"`
	KursusJudul     string    `gorm:"size:150;not null" json:"kursusJudul"`
	DiterbitkanPada time.Time `gorm:"autoCreateTime" json:"diterbitkanPada"`
}

func (KursusSertifikat) TableName() string {
	return "kursus_sertifikat"
}

type KursusRingkasDTO struct {
	ID            uint          `json:"id"`
	Judul         string        `json:"judul"`
	Deskripsi     string        `json:"deskripsi"`
	Kategori      string        `json:"kategori"`
	Tingkat       TingkatKursus `json:"tingkat"`
	DurasiJam     int           `json:"durasiJam"`
	AdaSertifikat bool          `json:"adaSertifikat"`
	JumlahMateri  int           `json:"jumlahMateri"`
	MateriSelesai int           `json:"materiSelesai"`
	Persen        int           `json:"persen"`
}

type MateriDetailDTO struct {
	ID      uint            `json:"id"`
	Judul   string          `json:"judul"`
	Tipe    TipeMediaKursus `json:"tipe"`
	URL     string          `json:"url"`
	Selesai bool            `json:"selesai"`
}

type KursusDetailDTO struct {
	KursusRingkasDTO
	Materi     []MateriDetailDTO `json:"materi"`
	Sertifikat *SertifikatDTO    `json:"sertifikat"`
}

type DaftarKursusResponse struct {
	Items      []KursusRingkasDTO `json:"items"`
	Sertifikat []SertifikatDTO    `json:"sertifikat"`
}

