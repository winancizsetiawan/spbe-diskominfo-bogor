package repository

import (
	"spbe-backend/internal/domain"
	"gorm.io/gorm"
)

type FlowchartRepository interface {
	FindAll(filter domain.FlowchartFilter, pageSize int) ([]domain.Flowchart, int64, error)
	FindByID(id uint) (*domain.Flowchart, error)
	Create(fc *domain.Flowchart, idAplikasi []uint) error
	Update(fc *domain.Flowchart, idAplikasi []uint) error
	GetHitungan(instansiID *uint) (*domain.HitunganFlowchart, error)
	GetNextSequence() (int64, error)
}

type flowchartRepository struct {
	db *gorm.DB
}

func NewFlowchartRepository(db *gorm.DB) FlowchartRepository {
	return &flowchartRepository{db: db}
}

// 1. FindAll
func (r *flowchartRepository) FindAll(filter domain.FlowchartFilter, pageSize int) ([]domain.Flowchart, int64, error) {
	var flowcharts []domain.Flowchart
	var total int64

	query := r.db.Model(&domain.Flowchart{})

	// Filter InstansiID (jika tidak nil)
	if filter.InstansiID != nil {
		query = query.Where("instansi_id = ?", *filter.InstansiID)
	}

	// Filter Pencarian (Q) pada nama, kode, atau PIC
	if filter.Q != "" {
		q := "%" + filter.Q + "%"
		query = query.Where("nama ILIKE ? OR kode ILIKE ? OR pic ILIKE ?", q, q, q)
	}

	// Filter Kategori
	if filter.Kategori != "" {
		query = query.Where("kategori = ?", filter.Kategori)
	}

	// Filter Status
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	// Hitung Total Data secara keseluruhan berdasarkan filter di atas
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

	// Eksekusi Query dengan Preload, Order, Limit, dan Offset
	err := query.Preload("Instansi").
		Preload("Aplikasi").
		Order("diperbarui_pada DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&flowcharts).Error

	return flowcharts, total, err
}

// 2. FindByID
func (r *flowchartRepository) FindByID(id uint) (*domain.Flowchart, error) {
	var fc domain.Flowchart

	err := r.db.Preload("Instansi").
		Preload("Aplikasi").
		Preload("Riwayat", func(db *gorm.DB) *gorm.DB {
			return db.Order("tanggal DESC") // Mengurutkan riwayat dari yang terbaru
		}).
		First(&fc, id).Error

	if err != nil {
		return nil, err
	}

	return &fc, nil
}

// 3. Create
func (r *flowchartRepository) Create(fc *domain.Flowchart, idAplikasi []uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Simpan flowchart ke tabel utama
		if err := tx.Create(fc).Error; err != nil {
			return err
		}

		// Jika ada relasi Aplikasi, simpan ke tabel pivot (many-to-many)
		if len(idAplikasi) > 0 {
			var apps []domain.Aplikasi
			if err := tx.Where("id IN ?", idAplikasi).Find(&apps).Error; err != nil {
				return err
			}
			if err := tx.Model(fc).Association("Aplikasi").Replace(apps); err != nil {
				return err
			}
		}

		return nil
	})
}

// 4. Update
func (r *flowchartRepository) Update(fc *domain.Flowchart, idAplikasi []uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Perbarui data flowchart
		if err := tx.Save(fc).Error; err != nil {
			return err
		}

		// Perbarui relasi aplikasi
		var apps []domain.Aplikasi
		if len(idAplikasi) > 0 {
			if err := tx.Where("id IN ?", idAplikasi).Find(&apps).Error; err != nil {
				return err
			}
		}
		
		// Replace akan otomatis sinkronisasi: menambah yang baru dan menghapus yang tidak ada di list
		if err := tx.Model(fc).Association("Aplikasi").Replace(apps); err != nil {
			return err
		}

		return nil
	})
}

// 5. GetHitungan
func (r *flowchartRepository) GetHitungan(instansiID *uint) (*domain.HitunganFlowchart, error) {
	// Karena interface meminta pointer (*), kita inisialisasi menggunakan pointer (&)
	hitungan := &domain.HitunganFlowchart{
		PerKategori: make(map[string]int64),
	}

	baseQuery := func() *gorm.DB {
		q := r.db.Model(&domain.Flowchart{})
		if instansiID != nil {
			q = q.Where("instansi_id = ?", *instansiID)
		}
		return q
	}

	if err := baseQuery().Count(&hitungan.Total).Error; err != nil {
		return nil, err
	}
	hitungan.PerKategori["semua"] = hitungan.Total

	baseQuery().Where("status = ?", "disetujui").Count(&hitungan.Dipublikasikan)
	baseQuery().Where("status = ?", "menunggu").Count(&hitungan.Menunggu)
	baseQuery().Where("status IN ?", []string{"draft", "perlu_revisi"}).Count(&hitungan.Draft)

	kategoriList := []string{"utama", "pendukung", "manajemen", "sub"}
	for _, k := range kategoriList {
		var count int64
		baseQuery().Where("kategori = ?", k).Count(&count)
		hitungan.PerKategori[k] = count
	}

	return hitungan, nil
}

// 6. GetNextSequence
func (r *flowchartRepository) GetNextSequence() (int64, error) {
	var count int64
	err := r.db.Model(&domain.Flowchart{}).Count(&count).Error
	return count, err
}