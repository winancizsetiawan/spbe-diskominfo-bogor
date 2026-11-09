package repository

import (
	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

type PortalModulRepository struct {
	db *gorm.DB
}

func NewPortalModulRepository(db *gorm.DB) *PortalModulRepository {
	return &PortalModulRepository{db: db}
}

func (r *PortalModulRepository) FindUserByRole(role string) (*domain.User, error) {
	var u domain.User
	err := r.db.Preload("Instansi").Where("role = ?", role).Order("id ASC").First(&u).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// ---- 1. Artikel & Berita ----

func (r *PortalModulRepository) FindAllArtikel(jenis string) ([]domain.Artikel, error) {
	var list []domain.Artikel
	q := r.db.Model(&domain.Artikel{})
	if jenis != "" && jenis != "semua" {
		q = q.Where("jenis = ?", jenis)
	}
	err := q.Order("tanggal DESC, id DESC").Find(&list).Error
	return list, err
}

func (r *PortalModulRepository) FindArtikelByID(id uint) (*domain.Artikel, error) {
	var a domain.Artikel
	if err := r.db.First(&a, id).Error; err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *PortalModulRepository) IncrementArtikelViews(id uint) error {
	return r.db.Model(&domain.Artikel{}).
		Where("id = ?", id).
		UpdateColumn("views", gorm.Expr("views + 1")).Error
}

// ---- 2. Data Lintas Modul (Beranda, Dasbor, Pencarian) ----

func (r *PortalModulRepository) FindAllDokumen() ([]domain.Dokumen, error) {
	var list []domain.Dokumen
	err := r.db.Preload("Kategori").Order("tanggal_rilis DESC, id DESC").Find(&list).Error
	return list, err
}

func (r *PortalModulRepository) FindAllThreads() ([]domain.ForumThread, error) {
	var list []domain.ForumThread
	err := r.db.Preload("Kategori").Preload("PenulisUser.Instansi").Order("dibuat_pada DESC, id DESC").Find(&list).Error
	return list, err
}

func (r *PortalModulRepository) FindAllBalasan() ([]domain.ForumBalasan, error) {
	var list []domain.ForumBalasan
	err := r.db.Order("dibuat_pada DESC, id DESC").Find(&list).Error
	return list, err
}

func (r *PortalModulRepository) FindAllAplikasi() ([]domain.Aplikasi, error) {
	var list []domain.Aplikasi
	err := r.db.Preload("Instansi").Order("diperbarui_pada DESC, id DESC").Find(&list).Error
	for i := range list {
		list[i].HitungKesesuaian()
	}
	return list, err
}

func (r *PortalModulRepository) FindAllFlowchart() ([]domain.Flowchart, error) {
	var list []domain.Flowchart
	err := r.db.Preload("Instansi").Order("diperbarui_pada DESC, id DESC").Find(&list).Error
	return list, err
}

func (r *PortalModulRepository) FindAllPengajuanValidasi() ([]domain.PengajuanValidasi, error) {
	var list []domain.PengajuanValidasi
	err := r.db.Find(&list).Error
	return list, err
}

func (r *PortalModulRepository) FindAllLaporanForum() ([]domain.ForumLaporan, error) {
	var list []domain.ForumLaporan
	err := r.db.Find(&list).Error
	return list, err
}

func (r *PortalModulRepository) FindAllAuditLogs() ([]domain.AuditLog, error) {
	var list []domain.AuditLog
	err := r.db.Find(&list).Error
	return list, err
}

func (r *PortalModulRepository) FindAllInstansi() ([]domain.Instansi, error) {
	var list []domain.Instansi
	err := r.db.Order("id ASC").Find(&list).Error
	return list, err
}

func (r *PortalModulRepository) FindAllInstansiOPD() ([]domain.Instansi, error) {
	var list []domain.Instansi
	err := r.db.Where("jenis = ?", domain.JenisOPD).Order("id ASC").Find(&list).Error
	return list, err
}

func (r *PortalModulRepository) FindAllUsers() ([]domain.User, error) {
	var list []domain.User
	err := r.db.Find(&list).Error
	return list, err
}

func (r *PortalModulRepository) FindAllKursus() ([]domain.Kursus, error) {
	var list []domain.Kursus
	err := r.db.Order("id ASC").Find(&list).Error
	return list, err
}

func (r *PortalModulRepository) FindNotifikasiUser(userID uint) ([]domain.Notifikasi, error) {
	var list []domain.Notifikasi
	err := r.db.Where("user_id = ?", userID).Order("dibuat_pada DESC, id DESC").Find(&list).Error
	return list, err
}
