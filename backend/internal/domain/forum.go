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
	Penerima    []ForumPenerima `gorm:"foreignKey:ThreadID;constraint:OnDelete:CASCADE" json:"-"`
	DibuatPada  time.Time     `gorm:"autoCreateTime;index" json:"dibuatPada"`
	UpdatedAt   time.Time     `json:"-"`
}

func (ForumThread) TableName() string {
	return "forum_thread"
}

// ForumPenerima adalah pengguna yang ditugaskan menjawab thread. Bila sebuah thread punya penerima,
// hanya penerima dan pembuat thread yang boleh membalas; pengguna lain hanya dapat membaca.
type ForumPenerima struct {
	ThreadID  uint      `gorm:"primaryKey" json:"-"`
	UserID    uint      `gorm:"primaryKey;index" json:"-"`
	User      User      `gorm:"foreignKey:UserID" json:"-"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"-"`
}

func (ForumPenerima) TableName() string {
	return "forum_thread_penerima"
}

// ForumLampiran adalah gambar atau PDF yang dilampirkan pada thread atau balasan.
// Berkas diunggah lebih dulu (ThreadID dan BalasanID kosong), lalu ditautkan saat thread/balasan dikirim.
type ForumLampiran struct {
	ID           uint      `gorm:"primaryKey" json:"-"`
	NamaBerkas   string    `gorm:"size:64;not null;uniqueIndex" json:"-"`
	NamaAsli     string    `gorm:"size:255;not null" json:"-"`
	Tipe         string    `gorm:"size:50;not null" json:"-"`
	Ukuran       int64     `gorm:"not null" json:"-"`
	PengunggahID uint      `gorm:"not null;index" json:"-"`
	ThreadID     *uint     `gorm:"index" json:"-"`
	BalasanID    *uint     `gorm:"index" json:"-"`
	DibuatPada   time.Time `gorm:"autoCreateTime" json:"-"`
}

func (ForumLampiran) TableName() string {
	return "forum_lampiran"
}

// PenggunaForum adalah ringkasan pengguna untuk pilihan penerima dan tampilan penugasan.
type PenggunaForum struct {
	ID       uint   `json:"id"`
	Nama     string `json:"nama"`
	Instansi string `json:"instansi"`
}

// LampiranDTO dikirim ke FE. Url berupa tautan bertanda yang berlaku sementara.
type LampiranDTO struct {
	ID     string `json:"id"`
	Nama   string `json:"nama"`
	Tipe   string `json:"tipe"`
	Ukuran int64  `json:"ukuran"`
	Url    string `json:"url"`
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
	// Penerima kosong berarti thread terbuka untuk semua pengguna; berisi berarti hanya penerima dan pembuat yang membalas.
	Penerima []PenggunaForum `json:"penerima"`
}

type BalasanResponse struct {
	ID           uint          `json:"id"`
	Konten       string        `json:"konten"`
	Penulis      PenulisForum  `json:"penulis"`
	DibuatPada   time.Time     `json:"dibuatPada"`
	JumlahNilai  int           `json:"jumlahNilai"`
	SudahDinilai bool          `json:"sudahDinilai"`
	Lampiran     []LampiranDTO `json:"lampiran"`
}

type ThreadDetailResponse struct {
	ThreadRingkas
	Konten   string            `json:"konten"`
	Lampiran []LampiranDTO     `json:"lampiran"`
	Balasan  []BalasanResponse `json:"balasan"`
	// BisaMembalas false bila thread ditujukan ke orang lain (hanya baca).
	BisaMembalas bool `json:"bisaMembalas"`
	// BisaMenugaskan true untuk pembuat thread dan Super Admin (boleh mengubah penerima).
	BisaMenugaskan bool `json:"bisaMenugaskan"`
}

type UbahPenerimaInput struct {
	Penerima []uint `json:"penerima"`
}

type ThreadFilter struct {
	Page       int
	PerPage    int
	IdKategori uint
	Query      string
}

type BuatThreadInput struct {
	IdKategori uint   `json:"idKategori"`
	Judul      string   `json:"judul"`
	Konten     string   `json:"konten"`
	Penerima   []uint   `json:"penerima"`
	Lampiran   []string `json:"lampiran"`
}

type BuatBalasanInput struct {
	Konten   string   `json:"konten"`
	Lampiran []string `json:"lampiran"`
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

