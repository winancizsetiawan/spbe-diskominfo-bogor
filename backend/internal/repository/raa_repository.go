package repository

import (
	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

type RaaRepository interface {
	GetTree() ([]domain.NodeRaa, error)
}

type raaRepository struct {
	db *gorm.DB
}

func NewRaaRepository(db *gorm.DB) RaaRepository {
	return &raaRepository{db: db}
}

// GetTree mengambil seluruh pohon hierarki RAA (Level 1, 2, dan 3)
func (r *raaRepository) GetTree() ([]domain.NodeRaa, error) {
	var rootNodes []domain.NodeRaa
	err := r.db.Where("parent_kode IS NULL").
		Preload("Anak", func(db *gorm.DB) *gorm.DB {
			return db.Order("kode ASC")
		}).
		Preload("Anak.Anak", func(db *gorm.DB) *gorm.DB {
			return db.Order("kode ASC")
		}).
		Order("kode ASC").
		Find(&rootNodes).Error

	return rootNodes, err
}

