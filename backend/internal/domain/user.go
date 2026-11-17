package domain

import (
	"strings"
	"time"
)

type Role string

const (
	RoleASN         Role = "asn"
	RoleAkademisi   Role = "akademisi"
	RoleVerifikator Role = "verifikator"
	RoleAdminOPD    Role = "admin_opd"
	RoleSuperAdmin  Role = "super_admin"
)

type StatusAkun string

const (
	StatusDiundang StatusAkun = "diundang"
	StatusAktif    StatusAkun = "aktif"
	StatusNonaktif StatusAkun = "nonaktif"
)

const (
	SumberLokal = "lokal"
	SumberTND   = "tnd"
)

// User merepresentasikan akun pengguna sistem SPBE
type User struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	KeycloakSub     *string    `gorm:"size:100;uniqueIndex" json:"-"`
	Nama            string     `gorm:"size:150;not null" json:"nama"`
	Email           string     `gorm:"size:150;not null;uniqueIndex" json:"email"`
	Role            Role       `gorm:"size:30;not null" json:"role"`
	DaftarPeranRaw  string     `gorm:"column:daftar_peran;size:255" json:"-"`
	StatusAkun      StatusAkun `gorm:"size:30;not null;default:'aktif'" json:"statusAkun"`
	InstansiID      uint       `gorm:"not null" json:"-"`
	Instansi        Instansi   `gorm:"foreignKey:InstansiID" json:"instansi"`
	LoginTerakhir   *time.Time `json:"loginTerakhir,omitempty"`
	GagalLogin      int        `gorm:"not null;default:0" json:"gagalLogin"`
	TerkunciHingga  *time.Time `json:"terkunciHingga,omitempty"`
	KataSandi       *string    `gorm:"size:255" json:"-"`
	SandiDiubahPada *time.Time `json:"sandiDiubahPada,omitempty"`
	// Nip terisi untuk ASN yang masuk lewat akun TND Pemkot Bogor.
	Nip *string `gorm:"size:30;uniqueIndex" json:"-"`
	// SumberAkun: "lokal" (kata sandi di portal) atau "tnd" (kata sandi dikelola TND, tidak disimpan di portal).
	SumberAkun string    `gorm:"size:20;not null;default:'lokal'" json:"-"`
	CreatedAt  time.Time `json:"-"`
	UpdatedAt  time.Time `json:"-"`
}

func (User) TableName() string {
	return "pengguna"
}

// DaftarPeran mengembalikan seluruh peran yang dimiliki pengguna (Multi-Role).
func (u User) DaftarPeran() []Role {
	seen := make(map[Role]bool)
	var hasil []Role
	tambah := func(r Role) {
		if r != "" && !seen[r] {
			seen[r] = true
			hasil = append(hasil, r)
		}
	}

	if strings.TrimSpace(u.DaftarPeranRaw) != "" {
		for _, bagian := range strings.Split(u.DaftarPeranRaw, ",") {
			tambah(Role(strings.TrimSpace(bagian)))
		}
	} else if u.Role == RoleASN {
		// ASN memiliki pilihan peran ASN & Akademisi; Verifikator hanya bila diberikan Super Admin.
		tambah(RoleASN)
		tambah(RoleAkademisi)
	}

	tambah(u.Role)
	return SaringPeran(hasil)
}

// SaringPeran menegakkan aturan: Verifikator bukan peran berdiri sendiri, hanya peran tambahan
// untuk pengguna yang juga ASN. Daftar tidak pernah kosong.
func SaringPeran(peran []Role) []Role {
	adaASN := false
	for _, r := range peran {
		if r == RoleASN {
			adaASN = true
		}
	}
	out := make([]Role, 0, len(peran))
	for _, r := range peran {
		if r == RoleVerifikator && !adaASN {
			continue
		}
		out = append(out, r)
	}
	if len(out) == 0 {
		out = append(out, RoleASN)
	}
	return out
}

// SetDaftarPeran menyimpan daftar peran unik ke kolom daftar_peran.
func (u *User) SetDaftarPeran(peran []Role) {
	seen := make(map[Role]bool)
	var str []string
	for _, r := range peran {
		if r != "" && !seen[r] {
			seen[r] = true
			str = append(str, string(r))
		}
	}
	if u.Role != "" && !seen[u.Role] {
		str = append([]string{string(u.Role)}, str...)
	}
	u.DaftarPeranRaw = strings.Join(str, ",")
}

// PunyaPeran memeriksa apakah pengguna berhak beralih ke peran target.
func (u User) PunyaPeran(target Role) bool {
	for _, r := range u.DaftarPeran() {
		if r == target {
			return true
		}
	}
	return false
}
