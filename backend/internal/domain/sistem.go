package domain

import "time"

// ---- 1. Audit Trail & Aktivitas ----

type AksiAktivitas string

const (
	AksiLogin          AksiAktivitas = "login"
	AksiUnduh          AksiAktivitas = "unduh"
	AksiThread         AksiAktivitas = "thread"
	AksiBalasan        AksiAktivitas = "balasan"
	AksiLaporan        AksiAktivitas = "laporan"
	AksiUbahProfil     AksiAktivitas = "ubah_profil"
	AksiUbahPreferensi AksiAktivitas = "ubah_preferensi"
	AksiKelolaPengguna AksiAktivitas = "kelola_pengguna"
	AksiAksesDitolak   AksiAktivitas = "akses_ditolak"
	AksiModerasi       AksiAktivitas = "moderasi"
	AksiDokumen        AksiAktivitas = "dokumen"
	AksiAplikasi       AksiAktivitas = "aplikasi"
	AksiFlowchart      AksiAktivitas = "flowchart"
	AksiValidasi       AksiAktivitas = "validasi"
	AksiBackup         AksiAktivitas = "backup"
	AksiPeriode        AksiAktivitas = "periode"
)

type HasilAudit string

const (
	HasilBerhasil HasilAudit = "berhasil"
	HasilGagal    HasilAudit = "gagal"
)

type KategoriAudit string

const (
	KategoriAuditAktivitas KategoriAudit = "aktivitas"
	KategoriAuditKeamanan  KategoriAudit = "keamanan"
)

// TentukanKategoriAudit menentukan apakah sebuah log masuk kategori keamanan atau aktivitas.
func TentukanKategoriAudit(aksi AksiAktivitas, hasil HasilAudit) KategoriAudit {
	if aksi == AksiAksesDitolak || (aksi == AksiLogin && hasil == HasilGagal) {
		return KategoriAuditKeamanan
	}
	return KategoriAuditAktivitas
}

type AuditLog struct {
	ID        uint          `gorm:"primaryKey" json:"id"`
	UserID    *uint         `gorm:"index" json:"-"`
	User      *User         `gorm:"foreignKey:UserID" json:"-"`
	Aksi      AksiAktivitas `gorm:"size:30;not null;index" json:"aksi"`
	Hasil     HasilAudit    `gorm:"size:20;not null;default:'berhasil';index" json:"hasil"`
	Deskripsi string        `gorm:"size:500;not null" json:"deskripsi"`
	IpAddress *string       `gorm:"size:60" json:"ipAddress"`
	Waktu     time.Time     `gorm:"autoCreateTime;index" json:"waktu"`
}

func (AuditLog) TableName() string {
	return "audit_log"
}

type PenggunaAuditDTO struct {
	Nama  string `json:"nama"`
	Email string `json:"email"`
	Role  Role   `json:"role"`
}

type AuditLogResponse struct {
	ID        uint              `json:"id"`
	Waktu     time.Time         `json:"waktu"`
	Pengguna  *PenggunaAuditDTO `json:"pengguna"`
	Kategori  KategoriAudit     `json:"kategori"`
	Aksi      AksiAktivitas     `json:"aksi"`
	Hasil     HasilAudit        `json:"hasil"`
	Deskripsi string            `json:"deskripsi"`
	IpAddress *string           `json:"ipAddress"`
}

type DaftarAuditResponse struct {
	Items      []AuditLogResponse `json:"items"`
	Page       int                `json:"page"`
	TotalPages int                `json:"totalPages"`
	Total      int                `json:"total"`
	Hitungan   map[string]int     `json:"hitungan"`
}

type AuditFilter struct {
	Page     int
	PerPage  int
	Kategori string
	Aksi     string
	Hasil    string
	Query    string
	Dari     string
	Sampai   string
}

// ---- 2. Backup Database ----

type TipeBackup string

const (
	BackupOtomatis TipeBackup = "otomatis"
	BackupManual   TipeBackup = "manual"
)

type StatusBackup string

const (
	StatusBackupBerjalan StatusBackup = "berjalan"
	StatusBackupBerhasil StatusBackup = "berhasil"
	StatusBackupGagal    StatusBackup = "gagal"
)

type RiwayatBackup struct {
	ID         uint         `gorm:"primaryKey" json:"id"`
	Tipe       TipeBackup   `gorm:"size:20;not null" json:"tipe"`
	Status     StatusBackup `gorm:"size:20;not null;index" json:"status"`
	UkuranMb   *float64     `gorm:"type:numeric(8,2)" json:"ukuranMb"`
	Oleh       *string      `gorm:"size:120" json:"oleh"`
	Waktu      time.Time    `gorm:"autoCreateTime;index" json:"waktu"`
	PesanGagal *string      `gorm:"size:255" json:"pesanGagal"`
}

func (RiwayatBackup) TableName() string {
	return "riwayat_backup"
}

type DaftarBackupResponse struct {
	Items            []RiwayatBackup `json:"items"`
	Jadwal           string          `json:"jadwal"`
	Retensi          int             `json:"retensi"`
	TerakhirBerhasil *time.Time      `json:"terakhirBerhasil"`
}

// ---- 3. Periode Pembaruan Data ----

type StatusPeriode string

const (
	StatusPeriodeAkanDatang StatusPeriode = "akan_datang"
	StatusPeriodeBerjalan   StatusPeriode = "berjalan"
	StatusPeriodeSelesai    StatusPeriode = "selesai"
)

type PeriodePembaruan struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Nama         string    `gorm:"size:100;not null;uniqueIndex" json:"nama"`
	TanggalMulai string    `gorm:"size:10;not null;index" json:"tanggalMulai"`
	Tenggat      string    `gorm:"size:10;not null;index" json:"tenggat"`
	DibuatOleh   string    `gorm:"size:120;not null" json:"dibuatOleh"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"-"`
	UpdatedAt    time.Time `json:"-"`
}

func (PeriodePembaruan) TableName() string {
	return "periode_pembaruan"
}

type PengingatPeriodeDTO struct {
	HariSebelum int    `json:"hariSebelum"`
	Tanggal     string `json:"tanggal"`
	Terkirim    bool   `json:"terkirim"`
}

type PeriodeResponse struct {
	ID           uint                  `json:"id"`
	Nama         string                `json:"nama"`
	TanggalMulai string                `json:"tanggalMulai"`
	Tenggat      string                `json:"tenggat"`
	Status       StatusPeriode         `json:"status"`
	Pengingat    []PengingatPeriodeDTO `json:"pengingat"`
	DibuatOleh   string                `json:"dibuatOleh"`
}

type InstansiTertinggalDTO struct {
	Instansi string `json:"instansi"`
	Jumlah   int    `json:"jumlah"`
}

type DaftarPeriodeResponse struct {
	Items      []PeriodeResponse       `json:"items"`
	Tertinggal []InstansiTertinggalDTO `json:"tertinggal"`
}

type PeriodeInput struct {
	Nama         string `json:"nama"`
	TanggalMulai string `json:"tanggalMulai"`
	Tenggat      string `json:"tenggat"`
}

// ---- 4. Kritik & Saran ----

type KritikSaran struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Nama       string    `gorm:"size:100;not null" json:"nama"`
	Email      string    `gorm:"size:150;not null" json:"email"`
	Pesan      string    `gorm:"type:text;not null" json:"pesan"`
	DibuatPada time.Time `gorm:"autoCreateTime;index" json:"dibuatPada"`
}

func (KritikSaran) TableName() string {
	return "kritik_saran"
}

type KritikInput struct {
	Nama  string `json:"nama"`
	Email string `json:"email"`
	Pesan string `json:"pesan"`
}
