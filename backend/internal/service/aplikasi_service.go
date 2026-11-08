package service

import (
	"errors"
	"math"

	"spbe-backend/internal/domain"
	"spbe-backend/internal/repository"
)

type AplikasiService interface {
	GetTreeRaa() ([]domain.NodeRaa, error)
	GetRingkasan(instansiID *uint) (*domain.RingkasanAplikasi, error)
	GetDaftar(filter domain.AplikasiFilter) (*domain.PagedResponse[domain.Aplikasi], error)
	GetDetail(id uint) (*domain.Aplikasi, error)
	Create(input domain.AplikasiInput, defaultInstansiID uint) (*domain.Aplikasi, error)
	Update(id uint, input domain.AplikasiInput) (*domain.Aplikasi, error)
	GetSiapDiajukan(instansiID *uint) ([]domain.Aplikasi, error)
}

type aplikasiService struct {
	aplikasiRepo repository.AplikasiRepository
	raaRepo      repository.RaaRepository
}

func NewAplikasiService(aplikasiRepo repository.AplikasiRepository, raaRepo repository.RaaRepository) AplikasiService {
	return &aplikasiService{
		aplikasiRepo: aplikasiRepo,
		raaRepo:      raaRepo,
	}
}

func (s *aplikasiService) GetTreeRaa() ([]domain.NodeRaa, error) {
	return s.raaRepo.GetTree()
}

func (s *aplikasiService) GetRingkasan(instansiID *uint) (*domain.RingkasanAplikasi, error) {
	return s.aplikasiRepo.GetRingkasan(instansiID)
}

func (s *aplikasiService) GetDaftar(filter domain.AplikasiFilter) (*domain.PagedResponse[domain.Aplikasi], error) {
	pageSize := 10
	if filter.Page <= 0 {
		filter.Page = 1
	}

	items, total, err := s.aplikasiRepo.FindAll(filter, pageSize)
	if err != nil {
		return nil, err
	}

	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(pageSize)))
	}

	return &domain.PagedResponse[domain.Aplikasi]{
		Items:      items,
		Page:       filter.Page,
		TotalPages: totalPages,
		Total:      int(total),
	}, nil
}

func (s *aplikasiService) GetDetail(id uint) (*domain.Aplikasi, error) {
	return s.aplikasiRepo.FindByID(id)
}

func (s *aplikasiService) Create(input domain.AplikasiInput, defaultInstansiID uint) (*domain.Aplikasi, error) {
	instansiID := defaultInstansiID
	if input.IDInstansi != nil && *input.IDInstansi > 0 {
		instansiID = *input.IDInstansi
	}

	apl := &domain.Aplikasi{
		InstansiID:     instansiID,
		Nama:           input.Nama,
		Deskripsi:      input.Deskripsi,
		Kategori:       input.Kategori,
		RaaLevel1:      input.Raa.Level1,
		RaaLevel2:      input.Raa.Level2,
		RaaLevel3:      input.Raa.Level3,
		StatusValidasi: domain.StatusDraft,
	}

	// Hitung otomatis skor kesesuaian dan status RAA
	apl.HitungKesesuaian()

	if err := s.aplikasiRepo.Create(apl); err != nil {
		return nil, err
	}

	return s.aplikasiRepo.FindByID(apl.ID)
}

func (s *aplikasiService) Update(id uint, input domain.AplikasiInput) (*domain.Aplikasi, error) {
	apl, err := s.aplikasiRepo.FindByID(id)
	if err != nil {
		return nil, errors.New("aplikasi tidak ditemukan")
	}

	apl.Nama = input.Nama
	apl.Deskripsi = input.Deskripsi
	apl.Kategori = input.Kategori
	apl.RaaLevel1 = input.Raa.Level1
	apl.RaaLevel2 = input.Raa.Level2
	apl.RaaLevel3 = input.Raa.Level3

	// Aturan bisnis: ketika data aplikasi diubah, status validasi kembali menjadi Draft
	apl.StatusValidasi = domain.StatusDraft

	// Hitung ulang kesesuaian
	apl.HitungKesesuaian()

	if err := s.aplikasiRepo.Update(apl); err != nil {
		return nil, err
	}

	return s.aplikasiRepo.FindByID(apl.ID)
}

func (s *aplikasiService) GetSiapDiajukan(instansiID *uint) ([]domain.Aplikasi, error) {
	return s.aplikasiRepo.FindSiapDiajukan(instansiID)
}

