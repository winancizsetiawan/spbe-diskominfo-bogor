package repository

import (
	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

type AplikasiRepository interface {
	FindAll(filter domain.AplikasiFilter, pageSize int) ([]domain.Aplikasi, int64, error)
	FindByID(id uint) (*domain.Aplikasi, error)
	Create(aplikasi *domain.Aplikasi) error
	Update(aplikasi *domain.Aplikasi) error
	GetRingkasan(instansiID *uint) (*domain.RingkasanAplikasi, error)
	FindSiapDiajukan(instansiID *uint) ([]domain.Aplikasi, error)
}

type aplikasiRepository struct {
	db *gorm.DB
}

func NewAplikasiRepository(db *gorm.DB) AplikasiRepository {
	return &aplikasiRepository{db: db}
}

func (r *aplikasiRepository) applyFilter(tx *gorm.DB, filter domain.AplikasiFilter) *gorm.DB {
	if filter.InstansiID != nil {
		tx = tx.Where("instansi_id = ?", *filter.InstansiID)
	}
	if filter.Q != "" {
		pola := "%" + filter.Q + "%"
		tx = tx.Where("nama ILIKE ? OR deskripsi ILIKE ?", pola, pola)
	}
	if filter.StatusValidasi != "" {
		tx = tx.Where("status_validasi = ?", filter.StatusValidasi)
	}
	if filter.StatusRaa != "" {
		tx = tx.Where("status_raa = ?", filter.StatusRaa)
	}
	return tx
}

func (r *aplikasiRepository) FindAll(filter domain.AplikasiFilter, pageSize int) ([]domain.Aplikasi, int64, error) {
	var list []domain.Aplikasi
	var total int64

	countQuery := r.applyFilter(r.db.Model(&domain.Aplikasi{}), filter)
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if pageSize <= 0 {
		pageSize = 10
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	dataQuery := r.applyFilter(r.db.Model(&domain.Aplikasi{}), filter).
		Preload("Instansi").
		Order("id DESC").
		Limit(pageSize).
		Offset(offset)

	if err := dataQuery.Find(&list).Error; err != nil {
		return nil, 0, err
	}

	return list, total, nil
}

func (r *aplikasiRepository) FindByID(id uint) (*domain.Aplikasi, error) {
	var apl domain.Aplikasi
	err := r.db.Preload("Instansi").First(&apl, id).Error
	if err != nil {
		return nil, err
	}
	return &apl, nil
}

func (r *aplikasiRepository) Create(aplikasi *domain.Aplikasi) error {
	return r.db.Create(aplikasi).Error
}

func (r *aplikasiRepository) Update(aplikasi *domain.Aplikasi) error {
	return r.db.Save(aplikasi).Error
}

func (r *aplikasiRepository) GetRingkasan(instansiID *uint) (*domain.RingkasanAplikasi, error) {
	ringkasan := &domain.RingkasanAplikasi{}
	tx := r.db.Model(&domain.Aplikasi{})
	if instansiID != nil {
		tx = tx.Where("instansi_id = ?", *instansiID)
	}

	if err := tx.Count(&ringkasan.Total).Error; err != nil {
		return nil, err
	}

	txSesuai := r.db.Model(&domain.Aplikasi{}).Where("status_raa = ?", domain.StatusRaaSesuai)
	if instansiID != nil {
		txSesuai = txSesuai.Where("instansi_id = ?", *instansiID)
	}
	if err := txSesuai.Count(&ringkasan.Sesuai).Error; err != nil {
		return nil, err
	}

	txPenyesuaian := r.db.Model(&domain.Aplikasi{}).Where("status_raa = ?", domain.StatusRaaPerluPenyesuaian)
	if instansiID != nil {
		txPenyesuaian = txPenyesuaian.Where("instansi_id = ?", *instansiID)
	}
	if err := txPenyesuaian.Count(&ringkasan.PerluPenyesuaian).Error; err != nil {
		return nil, err
	}

	txBelum := r.db.Model(&domain.Aplikasi{}).Where("status_raa = ?", domain.StatusRaaBelum)
	if instansiID != nil {
		txBelum = txBelum.Where("instansi_id = ?", *instansiID)
	}
	if err := txBelum.Count(&ringkasan.Belum).Error; err != nil {
		return nil, err
	}

	return ringkasan, nil
}

func (r *aplikasiRepository) FindSiapDiajukan(instansiID *uint) ([]domain.Aplikasi, error) {
	var list []domain.Aplikasi
	tx := r.db.Model(&domain.Aplikasi{}).Where("status_validasi IN ?", []domain.StatusValidasi{
		domain.StatusDraft,
		domain.StatusPerluRevisi,
	})

	if instansiID != nil {
		tx = tx.Where("instansi_id = ?", *instansiID)
	}

	err := tx.Order("nama ASC").Find(&list).Error
	return list, err
}

