package domain

import "time"

type StatusThread string

const (
	StatusThreadAktif       StatusThread = "aktif"
	StatusThreadTerkunci    StatusThread = "terkunci"
	StatusThreadTersembunyi StatusThread = "tersembunyi"
)

type TargetTipeModerasi string

const (
	TargetThread  TargetTipeModerasi = "thread"
	TargetBalasan TargetTipeModerasi = "balasan"
)

type StatusLaporan string

const (
	StatusLaporanBaru     StatusLaporan = "baru"
	StatusLaporanDitindak StatusLaporan = "ditindak"
	StatusLaporanDitolak  StatusLaporan = "ditolak"
)

type TindakanModerasi string

const (
	TindakanAbaikan     TindakanModerasi = "abaikan"
	TindakanKunci       TindakanModerasi = "kunci"
	TindakanSembunyikan TindakanModerasi = "sembunyikan"
)

type TabModerasi string

const (
	TabModerasiSemua      TabModerasi = "semua"
	TabModerasiDilaporkan TabModerasi = "dilaporkan"
	TabModerasiSelesai    TabModerasi = "selesai"
)

// KategoriForum merepresentasikan kategori topik diskusi di forum.
type KategoriForum struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Nama string `gorm:"size:100;not null;uniqueIndex" json:"nama"`
}

func (KategoriForum) TableName() string {
	return "kategori_forum"
}

// PenulisForum adalah DTO informasi pembuat thread/balasan yang dikirim ke frontend.
type PenulisForum struct {
	Nama     string `json:"nama"`
	Instansi string `json:"instansi"`
}

// ForumThread merepresentasikan topik diskusi di forum SPBE.
type ForumThread struct {
	ID          uint          `gorm:"primaryKey" json:"id"`
	IdKategori  uint          `gorm:"not null;index" json:"-"`
	Kategori    KategoriForum `gorm:"foreignKey:IdKategori" json:"kategori"`
	Judul       string        `gorm:"size:150;not null" json:"judul"`
	Konten      string        `gorm:"type:text;not null" json:"konten"`
	PenulisID   uint          `gorm:"not null;index" json:"-"`
	PenulisUser User          `gorm:"foreignKey:PenulisID" json:"-"`
	Dilihat     int           `gorm:"not null;default:0" json:"dilihat"`
	Status      StatusThread  `gorm:"size:20;not null;default:'aktif';index" json:"status"`
	DibuatPada  time.Time     `gorm:"autoCreateTime;index" json:"dibuatPada"`
	UpdatedAt   time.Time     `json:"-"`
}

func (ForumThread) TableName() string {
	return "forum_thread"
}

// ForumBalasan merepresentasikan komentar/balasan pada sebuah thread forum.
type ForumBalasan struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	ThreadID    uint           `gorm:"not null;index" json:"threadId"`
	Thread      ForumThread    `gorm:"foreignKey:ThreadID;constraint:OnDelete:CASCADE" json:"-"`
	Konten      string         `gorm:"type:text;not null" json:"konten"`
	PenulisID   uint           `gorm:"not null;index" json:"-"`
	PenulisUser User           `gorm:"foreignKey:PenulisID" json:"-"`
	Tersembunyi bool           `gorm:"not null;default:false;index" json:"-"`
	Penilai     []ForumNilai   `gorm:"foreignKey:BalasanID;constraint:OnDelete:CASCADE" json:"-"`
	DibuatPada  time.Time      `gorm:"autoCreateTime;index" json:"dibuatPada"`
	UpdatedAt   time.Time      `json:"-"`
}

func (ForumBalasan) TableName() string {
	return "forum_balasan"
}

// ForumNilai mencatat pengguna yang memberikan apresiasi/nilai pada suatu balasan.
type ForumNilai struct {
	BalasanID uint      `gorm:"primaryKey" json:"balasanId"`
	UserID    uint      `gorm:"primaryKey" json:"userId"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"-"`
}

func (ForumNilai) TableName() string {
	return "forum_balasan_nilai"
}

// ForumLaporan merepresentasikan laporan pelanggaran konten thread atau balasan.
type ForumLaporan struct {
	ID         uint               `gorm:"primaryKey" json:"id"`
	TargetTipe TargetTipeModerasi `gorm:"size:20;not null;index:idx_target_laporan" json:"targetTipe"`
	TargetID   uint               `gorm:"not null;index:idx_target_laporan" json:"targetId"`
	PelaporID  uint               `gorm:"not null;index" json:"-"`
	Pelapor    string             `gorm:"size:120;not null" json:"pelapor"`
	Alasan     string             `gorm:"size:500;not null" json:"alasan"`
	Status     StatusLaporan      `gorm:"size:20;not null;default:'baru';index" json:"status"`
	DibuatPada time.Time          `gorm:"autoCreateTime;index" json:"dibuatPada"`
}

func (ForumLaporan) TableName() string {
	return "forum_laporan"
}

// --- DTO & Response Structs ---

type ThreadRingkas struct {
	ID            uint          `json:"id"`
	Judul         string        `json:"judul"`
	Kategori      KategoriForum `json:"kategori"`
	Penulis       PenulisForum  `json:"penulis"`
	DibuatPada    time.Time     `json:"dibuatPada"`
	JumlahBalasan int           `json:"jumlahBalasan"`
	Dilihat       int           `json:"dilihat"`
	Status        StatusThread  `json:"status"`
}

type BalasanResponse struct {
	ID           uint         `json:"id"`
	Konten       string       `json:"konten"`
	Penulis      PenulisForum `json:"penulis"`
	DibuatPada   time.Time    `json:"dibuatPada"`
	JumlahNilai  int          `json:"jumlahNilai"`
	SudahDinilai bool         `json:"sudahDinilai"`
}

type ThreadDetailResponse struct {
	ThreadRingkas
	Konten  string            `json:"konten"`
	Balasan []BalasanResponse `json:"balasan"`
}

type ThreadFilter struct {
	Page       int
	PerPage    int
	IdKategori uint
	Query      string
}

type BuatThreadInput struct {
	IdKategori uint   `json:"idKategori"`
	Judul      string `json:"judul"`
	Konten     string `json:"konten"`
}

type BuatBalasanInput struct {
	Konten string `json:"konten"`
}

type NilaiBalasanResponse struct {
	JumlahNilai  int  `json:"jumlahNilai"`
	SudahDinilai bool `json:"sudahDinilai"`
}

type LaporanInput struct {
	TargetTipe TargetTipeModerasi `json:"targetTipe"`
	TargetID   uint               `json:"targetId"`
	Alasan     string             `json:"alasan"`
}

// --- DTO Moderasi Admin ---

type LaporanItemDTO struct {
	ID         uint          `json:"id"`
	Pelapor    string        `json:"pelapor"`
	Alasan     string        `json:"alasan"`
	DibuatPada time.Time     `json:"dibuatPada"`
	Status     StatusLaporan `json:"status"`
}

type ItemModerasi struct {
	TargetTipe  TargetTipeModerasi `json:"targetTipe"`
	TargetID    uint               `json:"targetId"`
	ThreadID    uint               `json:"threadId"`
	JudulThread string             `json:"judulThread"`
	Kategori    string             `json:"kategori"`
	Konten      string             `json:"konten"`
	Penulis     PenulisForum       `json:"penulis"`
	DibuatPada  time.Time          `json:"dibuatPada"`
	Status      StatusThread       `json:"status"`
	Laporan     []LaporanItemDTO   `json:"laporan"`
	LaporanBaru int                `json:"laporanBaru"`
}

type HitunganModerasi struct {
	Semua      int `json:"semua"`
	Dilaporkan int `json:"dilaporkan"`
	Selesai    int `json:"selesai"`
}

type DaftarModerasiResponse struct {
	Items      []ItemModerasi   `json:"items"`
	Page       int              `json:"page"`
	TotalPages int              `json:"totalPages"`
	Total      int              `json:"total"`
	Hitungan   HitunganModerasi `json:"hitungan"`
}

type ModerasiFilter struct {
	Page    int
	PerPage int
	Query   string
	Tab     TabModerasi
}

type TindakanModerasiInput struct {
	TargetTipe TargetTipeModerasi `json:"targetTipe"`
	TargetID   uint               `json:"targetId"`
	Tindakan   TindakanModerasi   `json:"tindakan"`
	Alasan     string             `json:"alasan"`
}

