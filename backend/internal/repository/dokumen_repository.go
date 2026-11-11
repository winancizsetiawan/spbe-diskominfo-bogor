package repository

import (
	"strings"

	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

type DokumenRepository struct {
	db *gorm.DB
}

func NewDokumenRepository(db *gorm.DB) *DokumenRepository {
	return &DokumenRepository{db: db}
}

// terapkanFilterVisibilitas menerapkan aturan akses dokumen di sisi pengguna:
// - Anonim: hanya status 'berlaku' dan visibilitas 'publik'
// - Pengguna login: status 'berlaku' atau 'review'
func terapkanFilterVisibilitas(q *gorm.DB, sudahLogin bool) *gorm.DB {
	if !sudahLogin {
		return q.Where("status = ? AND visibilitas = ?", domain.StatusDokBerlaku, domain.VisibilitasPublik)
	}
	return q.Where("status IN ?", []domain.StatusDokumen{domain.StatusDokBerlaku, domain.StatusDokReview})
}

// terapkanFilterKelompok memisahkan dokumen umum (bukan SOP) dan SOP.
func terapkanFilterKelompok(q *gorm.DB, kelompok domain.KelompokDokumen) *gorm.DB {
	if kelompok == domain.KelompokSOP {
		return q.Where("jenis = ?", domain.JenisSOP)
	}
	return q.Where("jenis <> ?", domain.JenisSOP)
}

func (r *DokumenRepository) FindAllKategoriSOP() ([]domain.KategoriDokumen, error) {
	var list []domain.KategoriDokumen
	err := r.db.Order("id ASC").Find(&list).Error
	return list, err
}

func (r *DokumenRepository) ExistsKategori(id uint) bool {
	var count int64
	r.db.Model(&domain.KategoriDokumen{}).Where("id = ?", id).Count(&count)
	return count > 0
}

func (r *DokumenRepository) GetRingkasan(kelompok domain.KelompokDokumen, sudahLogin bool) (domain.RingkasanDokumen, error) {
	var res domain.RingkasanDokumen

	baseQuery := func() *gorm.DB {
		q := r.db.Model(&domain.Dokumen{})
		q = terapkanFilterKelompok(q, kelompok)
		q = terapkanFilterVisibilitas(q, sudahLogin)
		return q
	}

	if err := baseQuery().Count(&res.Total).Error; err != nil {
		return res, err
	}
	if err := baseQuery().Where("status = ?", domain.StatusDokBerlaku).Count(&res.Berlaku).Error; err != nil {
		return res, err
	}
	if err := baseQuery().Where("status = ?", domain.StatusDokReview).Count(&res.Review).Error; err != nil {
		return res, err
	}
	if err := baseQuery().Select("COALESCE(SUM(jumlah_unduhan), 0)").Scan(&res.TotalUnduhan).Error; err != nil {
		return res, err
	}

	return res, nil
}

func (r *DokumenRepository) FindAll(f domain.DokumenFilter) ([]domain.Dokumen, int64, error) {
	var items []domain.Dokumen
	var total int64

	query := r.db.Model(&domain.Dokumen{}).Preload("Kategori")
	query = terapkanFilterKelompok(query, f.Kelompok)
	query = terapkanFilterVisibilitas(query, f.SudahLogin)

	if f.Jenis != "" {
		query = query.Where("jenis = ?", f.Jenis)
	}
	if f.IdKategori > 0 {
		query = query.Where("id_kategori = ?", f.IdKategori)
	}
	if strings.TrimSpace(f.Query) != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(f.Query)) + "%"
		query = query.Where("LOWER(judul) LIKE ? OR LOWER(deskripsi) LIKE ?", like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if f.UrutPopuler {
		query = query.Order("jumlah_unduhan DESC, tanggal_rilis DESC")
	} else {
		query = query.Order("tanggal_rilis DESC, id DESC")
	}

	offset := (f.Page - 1) * f.PerPage
	if err := query.Limit(f.PerPage).Offset(offset).Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *DokumenRepository) FindByID(id uint) (*domain.Dokumen, error) {
	var dok domain.Dokumen
	err := r.db.Preload("Kategori").First(&dok, id).Error
	if err != nil {
		return nil, err
	}
	return &dok, nil
}

func (r *DokumenRepository) IncrementUnduhan(id uint) error {
	return r.db.Model(&domain.Dokumen{}).
		Where("id = ?", id).
		UpdateColumn("jumlah_unduhan", gorm.Expr("jumlah_unduhan + 1")).Error
}

func (r *DokumenRepository) GetHitunganStatusAdmin() (domain.HitunganStatusDokumen, error) {
	var h domain.HitunganStatusDokumen
	if err := r.db.Model(&domain.Dokumen{}).Count(&h.Semua).Error; err != nil {
		return h, err
	}

	type row struct {
		Status domain.StatusDokumen
		Jumlah int64
	}
	var rows []row
	if err := r.db.Model(&domain.Dokumen{}).
		Select("status, COUNT(*) as jumlah").
		Group("status").
		Scan(&rows).Error; err != nil {
		return h, err
	}

	for _, item := range rows {
		switch item.Status {
		case domain.StatusDokDraft:
			h.Draft = item.Jumlah
		case domain.StatusDokReview:
			h.Review = item.Jumlah
		case domain.StatusDokBerlaku:
			h.Berlaku = item.Jumlah
		case domain.StatusDokArsip:
			h.Arsip = item.Jumlah
		}
	}
	return h, nil
}

func (r *DokumenRepository) FindAllAdmin(f domain.AdminDokumenFilter) ([]domain.Dokumen, int64, domain.HitunganStatusDokumen, error) {
	var items []domain.Dokumen
	var total int64

	hitungan, err := r.GetHitunganStatusAdmin()
	if err != nil {
		return nil, 0, hitungan, err
	}

	query := r.db.Model(&domain.Dokumen{}).Preload("Kategori")
	if f.Status != "" {
		query = query.Where("status = ?", f.Status)
	}
	if strings.TrimSpace(f.Query) != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(f.Query)) + "%"
		query = query.Where("LOWER(judul) LIKE ?", like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, hitungan, err
	}

	offset := (f.Page - 1) * f.PerPage
	if err := query.Order("tanggal_rilis DESC, id DESC").Limit(f.PerPage).Offset(offset).Find(&items).Error; err != nil {
		return nil, 0, hitungan, err
	}

	return items, total, hitungan, nil
}

func (r *DokumenRepository) Create(dok *domain.Dokumen) error {
	if err := r.db.Create(dok).Error; err != nil {
		return err
	}
	return r.db.Preload("Kategori").First(dok, dok.ID).Error
}

func (r *DokumenRepository) UpdateStatus(id uint, status domain.StatusDokumen) (*domain.Dokumen, error) {
	if err := r.db.Model(&domain.Dokumen{}).Where("id = ?", id).Update("status", status).Error; err != nil {
		return nil, err
	}
	return r.FindByID(id)
}

