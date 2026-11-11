package domain

// NodeRaa merepresentasikan pohon hierarki Referensi Arsitektur Aplikasi (RAA)
// Level 1: Domain Layanan (misal: "1" Layanan Publik)
// Level 2: Area Layanan (misal: "1.1" Kesehatan)
// Level 3: Fungsi Layanan (misal: "1.1.1" Pelayanan Kesehatan Dasar)
type NodeRaa struct {
	Kode       string    `gorm:"primaryKey;size:20" json:"kode"`
	Nama       string    `gorm:"size:200;not null" json:"nama"`
	ParentKode *string   `gorm:"size:20;index" json:"-"`
	Level      int       `gorm:"not null" json:"-"`
	Anak       []NodeRaa `gorm:"foreignKey:ParentKode;references:Kode" json:"anak,omitempty"`
}

func (NodeRaa) TableName() string {
	return "node_raa"
}

