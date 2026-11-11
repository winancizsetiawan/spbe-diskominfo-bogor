package repository

import (
	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

// 1. Interface (Buku Menu/Daftar Tugas)
type ValidasiRepository interface {
	FindAll(filter domain.ValidasiFilter, pageSize int) ([]domain.PengajuanValidasi, int64, error)
	FindByID(id uint) (*domain.PengajuanValidasi, error)
	Create(pengajuan *domain.PengajuanValidasi) error
	Update(pengajuan *domain.PengajuanValidasi) error
	GetHitungan() (*domain.HitunganValidasi, error)
	
	// Fungsi pendukung untuk cek & update target yang diajukan
	FindAplikasiByID(id uint) (*domain.Aplikasi, error)
	FindFlowchartByID(id uint) (*domain.Flowchart, error)
	UpdateStatusAplikasi(id uint, status domain.StatusValidasi, catatan *string) error
	UpdateStatusFlowchart(id uint, status domain.StatusValidasi, catatan *string) error
}

// 2. Struct & Constructor (Petugas Gudang & Kuncinya)
type validasiRepository struct {
	db *gorm.DB
}

func NewValidasiRepository(db *gorm.DB) ValidasiRepository {
	return &validasiRepository{db: db}
}

// 3. Implementasi Method-Method Database

// FindAll: Mengambil daftar pengajuan beserta filter dan paginasi
func (r *validasiRepository) FindAll(filter domain.ValidasiFilter, pageSize int) ([]domain.PengajuanValidasi, int64, error) {
	var daftarPengajuan []domain.PengajuanValidasi
	var total int64

	query := r.db.Model(&domain.PengajuanValidasi{})

	// Filter berdasarkan Status (jika dikirim dari frontend)
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	// Filter berdasarkan InstansiID (biasanya untuk OPD yang sedang login)
	if filter.InstansiID != nil {
		query = query.Where("instansi_id = ?", *filter.InstansiID)
	}

	// Hitung total keseluruhan data yang sesuai filter
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if pageSize <= 0 {
		pageSize = 6
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	// Ambil datanya dengan Preload (agar relasinya terbawa) dan batasi jumlahnya (Limit & Offset)
	err := query.Preload("Instansi").
		Preload("Aplikasi").
		Preload("Flowchart").
		Order("tanggal_pengajuan DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&daftarPengajuan).Error

	return daftarPengajuan, total, err
}

// FindByID: Mengambil detail 1 pengajuan secara spesifik
func (r *validasiRepository) FindByID(id uint) (*domain.PengajuanValidasi, error) {
	var p domain.PengajuanValidasi

	err := r.db.Preload("Instansi").
		Preload("Aplikasi").
		Preload("Flowchart").
		First(&p, id).Error

	if err != nil {
		return nil, err
	}
	return &p, nil
}

// Create: Menyimpan pengajuan baru ke database
func (r *validasiRepository) Create(pengajuan *domain.PengajuanValidasi) error {
	return r.db.Create(pengajuan).Error
}

// Update: Memperbarui data pengajuan (misal ketika status berubah jadi disetujui/ditolak)
func (r *validasiRepository) Update(pengajuan *domain.PengajuanValidasi) error {
	return r.db.Save(pengajuan).Error
}

// GetHitungan: Mengambil angka statistik untuk keperluan Dashboard/Card
func (r *validasiRepository) GetHitungan() (*domain.HitunganValidasi, error) {
	hitungan := &domain.HitunganValidasi{}

	// Helper query yang bersih
	baseQuery := func() *gorm.DB {
		return r.db.Model(&domain.PengajuanValidasi{})
	}

	// Hitung Total Semua
	if err := baseQuery().Count(&hitungan.Semua).Error; err != nil {
		return nil, err
	}

	// Hitung berdasarkan masing-masing status
	baseQuery().Where("status = ?", "menunggu").Count(&hitungan.Menunggu)
	baseQuery().Where("status = ?", "disetujui").Count(&hitungan.Disetujui)
	baseQuery().Where("status = ?", "perlu_revisi").Count(&hitungan.PerluRevisi)
	baseQuery().Where("status = ?", "ditolak").Count(&hitungan.Ditolak)

	return hitungan, nil
}

// --- FUNGSI PENDUKUNG (JALAN PINTAS KE TABEL LAIN) ---

// FindAplikasiByID: Mencari data aplikasi (Target)
func (r *validasiRepository) FindAplikasiByID(id uint) (*domain.Aplikasi, error) {
	var app domain.Aplikasi
	err := r.db.Preload("Instansi").First(&app, id).Error
	return &app, err
}

// FindFlowchartByID: Mencari data flowchart (Target)
func (r *validasiRepository) FindFlowchartByID(id uint) (*domain.Flowchart, error) {
	var fc domain.Flowchart
	err := r.db.Preload("Instansi").Preload("Aplikasi").Preload("Riwayat", func(db *gorm.DB) *gorm.DB {
		return db.Order("tanggal DESC")
	}).First(&fc, id).Error
	return &fc, err
}

// UpdateStatusAplikasi: Langsung mengupdate status aplikasi di tabel aslinya
func (r *validasiRepository) UpdateStatusAplikasi(id uint, status domain.StatusValidasi, catatan *string) error {
	// Di tabel aplikasi, nama kolomnya adalah status_validasi
	return r.db.Model(&domain.Aplikasi{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status_validasi":  status,
		"catatan_validasi": catatan,
	}).Error
}

// UpdateStatusFlowchart: Langsung mengupdate status flowchart di tabel aslinya
func (r *validasiRepository) UpdateStatusFlowchart(id uint, status domain.StatusValidasi, catatan *string) error {
	return r.db.Model(&domain.Flowchart{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":           status,
		"catatan_validasi": catatan,
	}).Error
}