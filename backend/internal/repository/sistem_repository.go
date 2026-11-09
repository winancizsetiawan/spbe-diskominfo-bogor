package repository

import (
	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

type SistemRepository struct {
	db *gorm.DB
}

func NewSistemRepository(db *gorm.DB) *SistemRepository {
	return &SistemRepository{db: db}
}

func (r *SistemRepository) FindUserByRole(role string) (*domain.User, error) {
	var u domain.User
	err := r.db.Where("role = ?", role).First(&u).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// ---- 1. Audit Trail ----

func (r *SistemRepository) CreateAuditLog(l *domain.AuditLog) error {
	return r.db.Create(l).Error
}

func (r *SistemRepository) FindAllAuditLogs() ([]domain.AuditLog, error) {
	var list []domain.AuditLog
	err := r.db.Preload("User").Order("waktu DESC, id DESC").Find(&list).Error
	return list, err
}

// ---- 2. Backup Database ----

func (r *SistemRepository) FindAllBackups() ([]domain.RiwayatBackup, error) {
	var list []domain.RiwayatBackup
	err := r.db.Order("waktu DESC, id DESC").Find(&list).Error
	return list, err
}

func (r *SistemRepository) HasRunningBackup() bool {
	var count int64
	r.db.Model(&domain.RiwayatBackup{}).Where("status = ?", domain.StatusBackupBerjalan).Count(&count)
	return count > 0
}

func (r *SistemRepository) CreateBackup(b *domain.RiwayatBackup, retensi int) error {
	if err := r.db.Create(b).Error; err != nil {
		return err
	}
	return r.pangkasBackupLama(retensi)
}

func (r *SistemRepository) UpdateBackup(b *domain.RiwayatBackup) error {
	return r.db.Save(b).Error
}

func (r *SistemRepository) pangkasBackupLama(retensi int) error {
	var semua []domain.RiwayatBackup
	if err := r.db.Order("waktu DESC, id DESC").Find(&semua).Error; err != nil {
		return err
	}
	if len(semua) <= retensi {
		return nil
	}
	var idsHapus []uint
	for _, b := range semua[retensi:] {
		idsHapus = append(idsHapus, b.ID)
	}
	return r.db.Where("id IN ?", idsHapus).Delete(&domain.RiwayatBackup{}).Error
}

// ---- 3. Periode Pembaruan Data ----

func (r *SistemRepository) FindAllPeriode() ([]domain.PeriodePembaruan, error) {
	var list []domain.PeriodePembaruan
	err := r.db.Order("tanggal_mulai DESC, id DESC").Find(&list).Error
	return list, err
}

func (r *SistemRepository) FindPeriodeByID(id uint) (*domain.PeriodePembaruan, error) {
	var p domain.PeriodePembaruan
	if err := r.db.First(&p, id).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *SistemRepository) CreatePeriode(p *domain.PeriodePembaruan) error {
	return r.db.Create(p).Error
}

func (r *SistemRepository) UpdatePeriode(p *domain.PeriodePembaruan) error {
	return r.db.Save(p).Error
}

func (r *SistemRepository) DeletePeriode(id uint) error {
	return r.db.Delete(&domain.PeriodePembaruan{}, id).Error
}

func (r *SistemRepository) GetInstansiTertinggal() ([]domain.InstansiTertinggalDTO, error) {
	type row struct {
		Instansi string
		Jumlah   int
	}
	var rows []row
	err := r.db.Table("aplikasi a").
		Select("i.nama as instansi, COUNT(a.id) as jumlah").
		Joins("JOIN instansi i ON i.id = a.instansi_id").
		Where("a.status_validasi <> ?", domain.StatusDisetujui).
		Group("i.id, i.nama").
		Having("COUNT(a.id) > 0").
		Order("jumlah DESC, i.nama ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	res := make([]domain.InstansiTertinggalDTO, 0, len(rows))
	for _, item := range rows {
		res = append(res, domain.InstansiTertinggalDTO{
			Instansi: item.Instansi,
			Jumlah:   item.Jumlah,
		})
	}
	return res, nil
}

// ---- 4. Kritik & Saran ----

func (r *SistemRepository) CreateKritik(k *domain.KritikSaran) error {
	return r.db.Create(k).Error
}

func (r *SistemRepository) FindAllKritik() ([]domain.KritikSaran, error) {
	var list []domain.KritikSaran
	err := r.db.Order("dibuat_pada DESC, id DESC").Find(&list).Error
	return list, err
}

