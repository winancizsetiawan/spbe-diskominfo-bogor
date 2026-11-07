package repository

import (
	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

type InstansiRepository interface {
	GetAll() ([]domain.Instansi, error)
	GetByID(id uint) (*domain.Instansi, error)
}

type instansiRepository struct {
	db *gorm.DB
}

func NewInstansiRepository(db *gorm.DB) InstansiRepository {
	return &instansiRepository{db: db}
}

func (r *instansiRepository) GetAll() ([]domain.Instansi, error) {
	var list []domain.Instansi
	err := r.db.Order("id ASC").Find(&list).Error
	return list, err
}

func (r *instansiRepository) GetByID(id uint) (*domain.Instansi, error) {
	var instansi domain.Instansi
	err := r.db.First(&instansi, id).Error
	if err != nil {
		return nil, err
	}
	return &instansi, nil
}

