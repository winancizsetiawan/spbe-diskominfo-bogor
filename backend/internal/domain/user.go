package domain

import "time"

type Role string

const (
	RoleASN        Role = "asn"
	RoleAkademisi  Role = "akademisi"
	RoleAdminOPD   Role = "admin_opd"
	RoleSuperAdmin Role = "super_admin"
)

type StatusAkun string

const (
	StatusDiundang StatusAkun = "diundang"
	StatusAktif    StatusAkun = "aktif"
	StatusNonaktif StatusAkun = "nonaktif"
)

// User merepresentasikan akun pengguna sistem SPBE
type User struct {
	ID            uint       `gorm:"primaryKey" json:"id"`
	KeycloakSub   string     `gorm:"size:100;uniqueIndex" json:"-"`
	Nama          string     `gorm:"size:150;not null" json:"nama"`
	Email         string     `gorm:"size:150;not null;uniqueIndex" json:"email"`
	Role          Role       `gorm:"size:30;not null" json:"role"`
	StatusAkun    StatusAkun `gorm:"size:30;not null;default:'aktif'" json:"statusAkun"`
	InstansiID    uint       `gorm:"not null" json:"-"`
	Instansi      Instansi   `gorm:"foreignKey:InstansiID" json:"instansi"`
	LoginTerakhir *time.Time `json:"loginTerakhir,omitempty"`
	CreatedAt     time.Time  `json:"-"`
	UpdatedAt     time.Time  `json:"-"`
}

func (User) TableName() string {
	return "pengguna"
}

