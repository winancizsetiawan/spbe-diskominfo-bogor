package domain

import "time"

// ---- 1. Konten (Berita, Artikel, & Bantuan) ----

type JenisArtikel string

const (
	JenisArtikelBerita  JenisArtikel = "berita"
	JenisArtikelEdukasi JenisArtikel = "artikel"
)

type Artikel struct {
	ID        uint         `gorm:"primaryKey" json:"id"`
	Jenis     JenisArtikel `gorm:"size:20;not null;index" json:"jenis"`
	Judul     string       `gorm:"size:200;not null" json:"judul"`
	Ringkasan string       `gorm:"size:500;not null" json:"ringkasan"`
	Penulis   string       `gorm:"size:120;not null" json:"penulis"`
	Tanggal   time.Time    `gorm:"autoCreateTime;index" json:"tanggal"`
	Views     int          `gorm:"not null;default:0" json:"views"`
	Konten    string       `gorm:"type:text;not null" json:"konten"`
}

func (Artikel) TableName() string {
	return "artikel"
}

type ArtikelRingkasDTO struct {
	ID        uint         `json:"id"`
	Jenis     JenisArtikel `json:"jenis"`
	Judul     string       `json:"judul"`
	Ringkasan string       `json:"ringkasan"`
	Penulis   string       `json:"penulis"`
	Tanggal   time.Time    `json:"tanggal"`
	Views     int          `json:"views"`
}

type FAQItemDTO struct {
	ID         uint   `json:"id"`
	Pertanyaan string `json:"pertanyaan"`
	Jawaban    string `json:"jawaban"`
}

type PanduanItemDTO struct {
	ID    uint   `json:"id"`
	Judul string `json:"judul"`
	Isi   string `json:"isi"`
}

type VideoBantuanDTO struct {
	ID    uint   `json:"id"`
	Judul string `json:"judul"`
	URL   string `json:"url"`
}

type BantuanResponse struct {
	FAQ     []FAQItemDTO      `json:"faq"`
	Panduan []PanduanItemDTO  `json:"panduan"`
	Video   []VideoBantuanDTO `json:"video"`
}

// ---- 2. Beranda (Publik & Role-Based) ----

type BerandaPublikResponse struct {
	DokumenPublik  int       `json:"dokumenPublik"`
	SopBerlaku     int       `json:"sopBerlaku"`
	Instansi       int       `json:"instansi"`
	Diskusi        int       `json:"diskusi"`
	DokumenPopuler []Dokumen `json:"dokumenPopuler"`
}

type BerandaInternalResponse struct {
	Tipe           string          `json:"tipe"`
	DokumenTerbaru []Dokumen       `json:"dokumenTerbaru"`
	ThreadPopuler  []ThreadRingkas `json:"threadPopuler"`
	Notifikasi     []NotifikasiDTO `json:"notifikasi"`
	BelumDibaca    int             `json:"belumDibaca"`
}

type PembaruanMingguanDTO struct {
	Minggu              string `json:"minggu"`
	AplikasiDiperbarui  int    `json:"aplikasiDiperbarui"`
	FlowchartDiperbarui int    `json:"flowchartDiperbarui"`
}

type ProgresFlowchartDTO struct {
	Kategori       KategoriProses `json:"kategori"`
	Dipublikasikan int            `json:"dipublikasikan"`
	Total          int            `json:"total"`
}

type RingkasanAdminOpdDTO struct {
	TotalAplikasi           int `json:"totalAplikasi"`
	SudahDiklasifikasi      int `json:"sudahDiklasifikasi"`
	FlowchartDipublikasikan int `json:"flowchartDipublikasikan"`
	TotalFlowchart          int `json:"totalFlowchart"`
	KepatuhanRaa            int `json:"kepatuhanRaa"`
}

type StatusRaaRingkasDTO struct {
	Sesuai           int `json:"sesuai"`
	PerluPenyesuaian int `json:"perluPenyesuaian"`
	Belum            int `json:"belum"`
}

type BerandaAdminOpdResponse struct {
	Tipe             string                 `json:"tipe"`
	Instansi         InstansiRingkas        `json:"instansi"`
	Ringkasan        RingkasanAdminOpdDTO   `json:"ringkasan"`
	StatusRaa        StatusRaaRingkasDTO    `json:"statusRaa"`
	Tren             []PembaruanMingguanDTO `json:"tren"`
	AplikasiTerbaru  []Aplikasi             `json:"aplikasiTerbaru"`
	ProgresFlowchart []ProgresFlowchartDTO  `json:"progresFlowchart"`
	Notifikasi       []NotifikasiDTO        `json:"notifikasi"`
	BelumDibaca      int                    `json:"belumDibaca"`
}

type AktivitasHarianDTO struct {
	Tanggal  string `json:"tanggal"`
	Login    int    `json:"login"`
	Validasi int    `json:"validasi"`
	Unggahan int    `json:"unggahan"`
	Forum    int    `json:"forum"`
}

type RingkasanSuperAdminDTO struct {
	TotalPengguna     int `json:"totalPengguna"`
	InstansiTerdaftar int `json:"instansiTerdaftar"`
	TotalDokumen      int `json:"totalDokumen"`
	MenungguValidasi  int `json:"menungguValidasi"`
	ThreadForum       int `json:"threadForum"`
	LaporanBaru       int `json:"laporanBaru"`
}

type StatusValidasiRingkasDTO struct {
	Menunggu    int `json:"menunggu"`
	Disetujui   int `json:"disetujui"`
	PerluRevisi int `json:"perlu_revisi"`
	Ditolak     int `json:"ditolak"`
}

type BerandaSuperAdminResponse struct {
	Tipe           string                   `json:"tipe"`
	Ringkasan      RingkasanSuperAdminDTO   `json:"ringkasan"`
	StatusValidasi StatusValidasiRingkasDTO `json:"statusValidasi"`
	Aktivitas      []AktivitasHarianDTO     `json:"aktivitas"`
	Notifikasi     []NotifikasiDTO          `json:"notifikasi"`
	BelumDibaca    int                      `json:"belumDibaca"`
}

// ---- 3. Dasbor Perbandingan & Analitik ----

type IndikatorPerbandinganDTO struct {
	Kunci      string `json:"kunci"`
	Label      string `json:"label"`
	Keterangan string `json:"keterangan"`
	Instansi   int    `json:"instansi"`
	Kota       int    `json:"kota"`
	Pembilang  int    `json:"pembilang"`
	Penyebut   int    `json:"penyebut"`
}

type CakupanDasborDTO struct {
	Proses   int  `json:"proses"`
	Aplikasi int  `json:"aplikasi"`
	Layanan  *int `json:"layanan"`
	Data     *int `json:"data"`
}

type DasborInstansiResponse struct {
	Instansi  InstansiRingkas            `json:"instansi"`
	Indikator []IndikatorPerbandinganDTO `json:"indikator"`
	Cakupan   CakupanDasborDTO           `json:"cakupan"`
}

type EmbedDasborResponse struct {
	URL            string  `json:"url"`
	Kedaluwarsa    string  `json:"kedaluwarsa"`
	FilterTerkunci *string `json:"filterTerkunci"`
}

// ---- 4. Pencarian Global ----

type HasilCariItem struct {
	Tipe     string `json:"tipe"`
	ID       uint   `json:"id"`
	Judul    string `json:"judul"`
	Cuplikan string `json:"cuplikan"`
	Meta     string `json:"meta"`
	URL      string `json:"url"`
}

type DaftarCariResponse struct {
	Items      []HasilCariItem `json:"items"`
	Page       int             `json:"page"`
	TotalPages int             `json:"totalPages"`
	Total      int             `json:"total"`
	Hitungan   map[string]int  `json:"hitungan"`
	Fallback   bool            `json:"fallback"`
}

