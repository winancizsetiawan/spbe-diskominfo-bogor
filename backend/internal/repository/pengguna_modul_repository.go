package repository

import (
	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

type PenggunaModulRepository struct {
	db *gorm.DB
}

func NewPenggunaModulRepository(db *gorm.DB) *PenggunaModulRepository {
	return &PenggunaModulRepository{db: db}
}

// ---- 1. Auth & Profil ----

func (r *PenggunaModulRepository) FindUserByRole(role string) (*domain.User, error) {
	var u domain.User
	err := r.db.Preload("Instansi").Where("role = ?", role).Order("id ASC").First(&u).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *PenggunaModulRepository) FindUserByID(id uint) (*domain.User, error) {
	var u domain.User
	err := r.db.Preload("Instansi").First(&u, id).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *PenggunaModulRepository) FindOrCreateProfil(userID uint) (*domain.ProfilPengguna, error) {
	var p domain.ProfilPengguna
	err := r.db.Where("user_id = ?", userID).First(&p).Error
	if err == gorm.ErrRecordNotFound {
		p = domain.ProfilPengguna{
			UserID:      userID,
			NIP:         "198805122015041001",
			Jabatan:     "Pranata Komputer Ahli Muda",
			Golongan:    "III/c",
			SatkerInduk: "Pemerintah Kota Bogor",
			KanalEmail:  true,
		}
		if createErr := r.db.Create(&p).Error; createErr != nil {
			return nil, createErr
		}
		return &p, nil
	}
	return &p, err
}

func (r *PenggunaModulRepository) UpdateNoTelepon(userID uint, noTelp *string) error {
	_, _ = r.FindOrCreateProfil(userID)
	return r.db.Model(&domain.ProfilPengguna{}).Where("user_id = ?", userID).Update("no_telepon", noTelp).Error
}

func (r *PenggunaModulRepository) UpdateKanalEmail(userID uint, aktif bool) error {
	_, _ = r.FindOrCreateProfil(userID)
	return r.db.Model(&domain.ProfilPengguna{}).Where("user_id = ?", userID).Update("kanal_email", aktif).Error
}

func (r *PenggunaModulRepository) HitungStatistikProfil(userID uint) (int, int) {
	var unduh int64
	r.db.Model(&domain.AuditLog{}).Where("user_id = ? AND aksi = ?", userID, domain.AksiUnduh).Count(&unduh)

	var jmlThread int64
	r.db.Model(&domain.ForumThread{}).Where("penulis_id = ?", userID).Count(&jmlThread)

	var jmlBalasan int64
	r.db.Model(&domain.ForumBalasan{}).Where("penulis_id = ?", userID).Count(&jmlBalasan)

	return int(unduh), int(jmlThread + jmlBalasan)
}

func (r *PenggunaModulRepository) FindAktivitasByUser(userID uint) ([]domain.AuditLog, error) {
	var list []domain.AuditLog
	err := r.db.Where("user_id = ?", userID).Order("waktu DESC, id DESC").Find(&list).Error
	return list, err
}

// ---- 2. Manajemen Pengguna (Admin) ----

func (r *PenggunaModulRepository) FindAllInstansi() ([]domain.Instansi, error) {
	var list []domain.Instansi
	err := r.db.Order("id ASC").Find(&list).Error
	return list, err
}

func (r *PenggunaModulRepository) FindInstansiByID(id uint) (*domain.Instansi, error) {
	var inst domain.Instansi
	if err := r.db.First(&inst, id).Error; err != nil {
		return nil, err
	}
	return &inst, nil
}

func (r *PenggunaModulRepository) ExistsEmail(email string) bool {
	var count int64
	r.db.Model(&domain.User{}).Where("LOWER(email) = LOWER(?)", email).Count(&count)
	return count > 0
}

func (r *PenggunaModulRepository) FindAllUsers() ([]domain.User, error) {
	var list []domain.User
	err := r.db.Preload("Instansi").Order("LOWER(nama) ASC").Find(&list).Error
	return list, err
}

func (r *PenggunaModulRepository) CreateUser(u *domain.User) error {
	if err := r.db.Create(u).Error; err != nil {
		return err
	}
	return r.db.Preload("Instansi").First(u, u.ID).Error
}

func (r *PenggunaModulRepository) UpdateUser(u *domain.User) error {
	if err := r.db.Save(u).Error; err != nil {
		return err
	}
	return r.db.Preload("Instansi").First(u, u.ID).Error
}

// ---- 3. Notifikasi ----

func (r *PenggunaModulRepository) FindNotifikasiByUser(userID uint) ([]domain.Notifikasi, error) {
	var list []domain.Notifikasi
	err := r.db.Where("user_id = ?", userID).
		Order("CASE WHEN sudah_dibaca = false THEN 0 ELSE 1 END ASC, dibuat_pada DESC, id DESC").
		Find(&list).Error
	return list, err
}

func (r *PenggunaModulRepository) MarkNotifikasiDibaca(id uint, userID uint) (int64, error) {
	res := r.db.Model(&domain.Notifikasi{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("sudah_dibaca", true)
	return res.RowsAffected, res.Error
}

func (r *PenggunaModulRepository) MarkSemuaNotifikasiDibaca(userID uint, kategori string) (int64, error) {
	q := r.db.Model(&domain.Notifikasi{}).Where("user_id = ? AND sudah_dibaca = false", userID)
	if kategori != "" && kategori != "semua" {
		q = q.Where("kategori = ?", kategori)
	}
	res := q.Update("sudah_dibaca", true)
	return res.RowsAffected, res.Error
}

func (r *PenggunaModulRepository) CreateNotifikasi(n *domain.Notifikasi) error {
	return r.db.Create(n).Error
}

// ---- 4. Pembelajaran / LMS ----

func (r *PenggunaModulRepository) FindAllKursus() ([]domain.Kursus, error) {
	var list []domain.Kursus
	err := r.db.Preload("Materi", func(db *gorm.DB) *gorm.DB {
		return db.Order("urutan ASC, id ASC")
	}).Order("id ASC").Find(&list).Error
	return list, err
}

func (r *PenggunaModulRepository) FindKursusByID(id uint) (*domain.Kursus, error) {
	var k domain.Kursus
	err := r.db.Preload("Materi", func(db *gorm.DB) *gorm.DB {
		return db.Order("urutan ASC, id ASC")
	}).First(&k, id).Error
	if err != nil {
		return nil, err
	}
	return &k, nil
}

func (r *PenggunaModulRepository) FindProgresByUser(userID uint) ([]domain.KursusProgres, error) {
	var list []domain.KursusProgres
	err := r.db.Where("user_id = ?", userID).Find(&list).Error
	return list, err
}

func (r *PenggunaModulRepository) MarkMateriSelesai(userID uint, kursusID uint, materiID uint) error {
	p := domain.KursusProgres{
		UserID:   userID,
		KursusID: kursusID,
		MateriID: materiID,
	}
	return r.db.Where("user_id = ? AND materi_id = ?", userID, materiID).FirstOrCreate(&p).Error
}

func (r *PenggunaModulRepository) FindSertifikatByUser(userID uint) ([]domain.KursusSertifikat, error) {
	var list []domain.KursusSertifikat
	err := r.db.Where("user_id = ?", userID).Order("diterbitkan_pada DESC").Find(&list).Error
	return list, err
}

func (r *PenggunaModulRepository) FindOrCreateSertifikat(s *domain.KursusSertifikat) (bool, error) {
	var existing domain.KursusSertifikat
	err := r.db.Where("user_id = ? AND kursus_id = ?", s.UserID, s.KursusID).First(&existing).Error
	if err == nil {
		*s = existing
		return false, nil
	}
	if err != gorm.ErrRecordNotFound {
		return false, err
	}
	if createErr := r.db.Create(s).Error; createErr != nil {
		return false, createErr
	}
	return true, nil
}

func (r *PenggunaModulRepository) CountAllSertifikat() int64 {
	var count int64
	r.db.Model(&domain.KursusSertifikat{}).Count(&count)
	return count
}

