package domain

import "time"

type JenisInstansi string

const (
	JenisOPD             JenisInstansi = "OPD"
	JenisPemprov         JenisInstansi = "Pemprov"
	JenisKementerian     JenisInstansi = "Kementerian"
	JenisPerguruanTinggi JenisInstansi = "Perguruan Tinggi"
)

// Instansi merepresentasikan tabel master instansi / OPD Pemerintah Kota Bogor
type Instansi struct {
	ID        uint          `gorm:"primaryKey" json:"id"`
	Nama      string        `gorm:"size:150;not null;uniqueIndex" json:"nama"`
	Jenis     JenisInstansi `gorm:"size:50;not null;default:'OPD'" json:"jenis"`
	CreatedAt time.Time     `json:"-"`
	UpdatedAt time.Time     `json:"-"`
}

func (Instansi) TableName() string {
	return "instansi"
}

