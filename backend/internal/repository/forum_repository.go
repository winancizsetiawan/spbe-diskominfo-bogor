package repository

import (
	"errors"
	"strings"

	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

type ForumRepository struct {
	db *gorm.DB
}

func NewForumRepository(db *gorm.DB) *ForumRepository {
	return &ForumRepository{db: db}
}

func (r *ForumRepository) FindAllKategori() ([]domain.KategoriForum, error) {
	var list []domain.KategoriForum
	err := r.db.Order("id ASC").Find(&list).Error
	return list, err
}

func (r *ForumRepository) ExistsKategori(id uint) bool {
	var count int64
	r.db.Model(&domain.KategoriForum{}).Where("id = ?", id).Count(&count)
	return count > 0
}

func (r *ForumRepository) FindUserByRole(role string) (*domain.User, error) {
	return cariPengguna(r.db, role, true)
}

// ErrLampiranTidakValid: lampiran tidak ada, milik orang lain, atau sudah dipakai di kiriman lain.
var ErrLampiranTidakValid = errors.New("lampiran tidak valid")

// tautkanLampiran menautkan berkas yang baru diunggah ke thread atau balasan dalam transaksi `tx`.
func tautkanLampiran(tx *gorm.DB, nama []string, pengunggahID uint, kolom string, id uint) error {
	if len(nama) == 0 {
		return nil
	}
	res := tx.Model(&domain.ForumLampiran{}).
		Where("nama_berkas IN ? AND pengunggah_id = ? AND thread_id IS NULL AND balasan_id IS NULL", nama, pengunggahID).
		Update(kolom, id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected != int64(len(nama)) {
		return ErrLampiranTidakValid
	}
	return nil
}

// BuatThreadLengkap menyimpan thread beserta penerima dan lampirannya sekaligus.
func (r *ForumRepository) BuatThreadLengkap(t *domain.ForumThread, penerima []uint, lampiran []string) error {
	err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Omit("Penerima").Create(t).Error; err != nil {
			return err
		}
		for _, uid := range penerima {
			if err := tx.Create(&domain.ForumPenerima{ThreadID: t.ID, UserID: uid}).Error; err != nil {
				return err
			}
		}
		return tautkanLampiran(tx, lampiran, t.PenulisID, "thread_id", t.ID)
	})
	if err != nil {
		return err
	}
	return r.db.Preload("Kategori").Preload("PenulisUser.Instansi").Preload("Penerima.User.Instansi").First(t, t.ID).Error
}

// BuatBalasanLengkap menyimpan balasan beserta lampirannya.
func (r *ForumRepository) BuatBalasanLengkap(b *domain.ForumBalasan, lampiran []string) error {
	err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(b).Error; err != nil {
			return err
		}
		return tautkanLampiran(tx, lampiran, b.PenulisID, "balasan_id", b.ID)
	})
	if err != nil {
		return err
	}
	return r.db.Preload("PenulisUser.Instansi").Preload("Penilai").First(b, b.ID).Error
}

// GantiPenerima mengganti seluruh daftar penerima thread.
func (r *ForumRepository) GantiPenerima(threadID uint, penerima []uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("thread_id = ?", threadID).Delete(&domain.ForumPenerima{}).Error; err != nil {
			return err
		}
		for _, uid := range penerima {
			if err := tx.Create(&domain.ForumPenerima{ThreadID: threadID, UserID: uid}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// HitungPenggunaAktif menghitung berapa id dalam daftar yang merupakan pengguna aktif.
func (r *ForumRepository) HitungPenggunaAktif(ids []uint) int64 {
	if len(ids) == 0 {
		return 0
	}
	var n int64
	r.db.Model(&domain.User{}).Where("id IN ? AND status_akun = ?", ids, domain.StatusAktif).Count(&n)
	return n
}

// CariPenggunaAktif mencari pengguna aktif berdasarkan nama atau instansi (untuk memilih penerima).
func (r *ForumRepository) CariPenggunaAktif(q string, kecuali uint, batas int) ([]domain.User, error) {
	var list []domain.User
	query := r.db.Preload("Instansi").
		Joins("LEFT JOIN instansi ON instansi.id = pengguna.instansi_id").
		Where("pengguna.status_akun = ? AND pengguna.id <> ?", domain.StatusAktif, kecuali)
	if s := strings.TrimSpace(q); s != "" {
		like := "%" + strings.ToLower(s) + "%"
		query = query.Where("LOWER(pengguna.nama) LIKE ? OR LOWER(instansi.nama) LIKE ?", like, like)
	}
	err := query.Order("pengguna.nama ASC").Limit(batas).Find(&list).Error
	return list, err
}

func (r *ForumRepository) CreateLampiran(l *domain.ForumLampiran) error {
	return r.db.Create(l).Error
}

func (r *ForumRepository) FindLampiranThread(threadID uint) ([]domain.ForumLampiran, error) {
	var list []domain.ForumLampiran
	err := r.db.Where("thread_id = ?", threadID).Order("id ASC").Find(&list).Error
	return list, err
}

func (r *ForumRepository) FindLampiranBalasan(balasanIDs []uint) ([]domain.ForumLampiran, error) {
	var list []domain.ForumLampiran
	if len(balasanIDs) == 0 {
		return list, nil
	}
	err := r.db.Where("balasan_id IN ?", balasanIDs).Order("id ASC").Find(&list).Error
	return list, err
}

func (r *ForumRepository) FindLampiranByNama(nama string) (*domain.ForumLampiran, error) {
	var l domain.ForumLampiran
	if err := r.db.Where("nama_berkas = ?", nama).First(&l).Error; err != nil {
		return nil, err
	}
	return &l, nil
}

// KirimNotifikasi membuat notifikasi forum untuk tiap pengguna (duplikat dan `kecuali` dilewati).
func (r *ForumRepository) KirimNotifikasi(userIDs []uint, kecuali uint, judul, pesan, url string) {
	sudah := map[uint]bool{kecuali: true}
	for _, uid := range userIDs {
		if uid == 0 || sudah[uid] {
			continue
		}
		sudah[uid] = true
		_ = r.db.Create(&domain.Notifikasi{
			UserID: uid, Kategori: domain.KategoriNotifForum,
			Judul: judul, Pesan: pesan, UrlTujuan: url,
		}).Error
	}
}

func (r *ForumRepository) FindAllThreads(f domain.ThreadFilter) ([]domain.ForumThread, int64, error) {
	var threads []domain.ForumThread
	var total int64

	query := r.db.Model(&domain.ForumThread{}).
		Preload("Kategori").
		Preload("PenulisUser.Instansi").
		Preload("Penerima.User.Instansi").
		Where("status <> ?", domain.StatusThreadTersembunyi)

	if f.IdKategori > 0 {
		query = query.Where("id_kategori = ?", f.IdKategori)
	}
	if strings.TrimSpace(f.Query) != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(f.Query)) + "%"
		query = query.Where("LOWER(judul) LIKE ? OR LOWER(konten) LIKE ?", like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (f.Page - 1) * f.PerPage
	if err := query.Order("dibuat_pada DESC, id DESC").Limit(f.PerPage).Offset(offset).Find(&threads).Error; err != nil {
		return nil, 0, err
	}

	return threads, total, nil
}

func (r *ForumRepository) CountBalasanByThreadIDs(threadIDs []uint) (map[uint]int, error) {
	res := make(map[uint]int)
	if len(threadIDs) == 0 {
		return res, nil
	}

	type row struct {
		ThreadID uint
		Jumlah   int
	}
	var rows []row
	err := r.db.Model(&domain.ForumBalasan{}).
		Select("thread_id, COUNT(*) as jumlah").
		Where("thread_id IN ? AND tersembunyi = false", threadIDs).
		Group("thread_id").
		Scan(&rows).Error
	if err != nil {
		return res, err
	}

	for _, item := range rows {
		res[item.ThreadID] = item.Jumlah
	}
	return res, nil
}

func (r *ForumRepository) CreateThread(t *domain.ForumThread) error {
	if err := r.db.Create(t).Error; err != nil {
		return err
	}
	return r.db.Preload("Kategori").Preload("PenulisUser.Instansi").First(t, t.ID).Error
}

func (r *ForumRepository) FindThreadByID(id uint, includeHidden bool) (*domain.ForumThread, error) {
	var t domain.ForumThread
	q := r.db.Preload("Kategori").Preload("PenulisUser.Instansi").Preload("Penerima.User.Instansi")
	if !includeHidden {
		q = q.Where("status <> ?", domain.StatusThreadTersembunyi)
	}
	if err := q.First(&t, id).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *ForumRepository) IncrementDilihat(threadID uint) error {
	return r.db.Model(&domain.ForumThread{}).
		Where("id = ?", threadID).
		UpdateColumn("dilihat", gorm.Expr("dilihat + 1")).Error
}

func (r *ForumRepository) FindBalasanByThreadID(threadID uint) ([]domain.ForumBalasan, error) {
	var list []domain.ForumBalasan
	err := r.db.Preload("PenulisUser.Instansi").
		Preload("Penilai").
		Where("thread_id = ? AND tersembunyi = false", threadID).
		Order("dibuat_pada ASC, id ASC").
		Find(&list).Error
	return list, err
}

func (r *ForumRepository) FindBalasanByID(id uint, includeHidden bool) (*domain.ForumBalasan, error) {
	var b domain.ForumBalasan
	q := r.db.Preload("PenulisUser.Instansi").Preload("Penilai").Preload("Thread.Kategori")
	if !includeHidden {
		q = q.Where("tersembunyi = false")
	}
	if err := q.First(&b, id).Error; err != nil {
		return nil, err
	}
	return &b, nil
}

func (r *ForumRepository) CreateBalasan(b *domain.ForumBalasan) error {
	if err := r.db.Create(b).Error; err != nil {
		return err
	}
	return r.db.Preload("PenulisUser.Instansi").Preload("Penilai").First(b, b.ID).Error
}

func (r *ForumRepository) ToggleNilaiBalasan(balasanID uint, userID uint) (int, bool, error) {
	var existing domain.ForumNilai
	err := r.db.Where("balasan_id = ? AND user_id = ?", balasanID, userID).First(&existing).Error
	sudahDinilai := false

	if err == nil {
		// Sudah pernah menilai -> hapus nilai
		if delErr := r.db.Where("balasan_id = ? AND user_id = ?", balasanID, userID).Delete(&domain.ForumNilai{}).Error; delErr != nil {
			return 0, false, delErr
		}
		sudahDinilai = false
	} else if err == gorm.ErrRecordNotFound {
		// Belum menilai -> tambahkan nilai
		baru := domain.ForumNilai{BalasanID: balasanID, UserID: userID}
		if createErr := r.db.Create(&baru).Error; createErr != nil {
			return 0, false, createErr
		}
		sudahDinilai = true
	} else {
		return 0, false, err
	}

	var count int64
	if err := r.db.Model(&domain.ForumNilai{}).Where("balasan_id = ?", balasanID).Count(&count).Error; err != nil {
		return 0, false, err
	}

	return int(count), sudahDinilai, nil
}

func (r *ForumRepository) HasOpenLaporan(targetTipe domain.TargetTipeModerasi, targetID uint, pelaporID uint) bool {
	var count int64
	r.db.Model(&domain.ForumLaporan{}).
		Where("target_tipe = ? AND target_id = ? AND pelapor_id = ? AND status = ?",
			targetTipe, targetID, pelaporID, domain.StatusLaporanBaru).
		Count(&count)
	return count > 0
}

func (r *ForumRepository) CreateLaporan(l *domain.ForumLaporan) error {
	return r.db.Create(l).Error
}

func (r *ForumRepository) FindAllDataModerasi() ([]domain.ForumThread, []domain.ForumBalasan, []domain.ForumLaporan, error) {
	var threads []domain.ForumThread
	if err := r.db.Preload("Kategori").Preload("PenulisUser.Instansi").Order("dibuat_pada DESC").Find(&threads).Error; err != nil {
		return nil, nil, nil, err
	}

	var balasan []domain.ForumBalasan
	if err := r.db.Preload("PenulisUser.Instansi").Preload("Thread.Kategori").Order("dibuat_pada DESC").Find(&balasan).Error; err != nil {
		return nil, nil, nil, err
	}

	var laporan []domain.ForumLaporan
	if err := r.db.Order("CASE WHEN status = 'baru' THEN 0 ELSE 1 END ASC, dibuat_pada DESC").Find(&laporan).Error; err != nil {
		return nil, nil, nil, err
	}

	return threads, balasan, laporan, nil
}

func (r *ForumRepository) CountOpenLaporanForTarget(targetTipe domain.TargetTipeModerasi, targetID uint) int64 {
	var count int64
	r.db.Model(&domain.ForumLaporan{}).
		Where("target_tipe = ? AND target_id = ? AND status = ?", targetTipe, targetID, domain.StatusLaporanBaru).
		Count(&count)
	return count
}

func (r *ForumRepository) FindLaporanByTarget(targetTipe domain.TargetTipeModerasi, targetID uint) ([]domain.ForumLaporan, error) {
	var list []domain.ForumLaporan
	err := r.db.Where("target_tipe = ? AND target_id = ?", targetTipe, targetID).
		Order("CASE WHEN status = 'baru' THEN 0 ELSE 1 END ASC, dibuat_pada DESC").
		Find(&list).Error
	return list, err
}

func (r *ForumRepository) EksekusiModerasi(targetTipe domain.TargetTipeModerasi, targetID uint, tindakan domain.TindakanModerasi) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if tindakan == domain.TindakanKunci && targetTipe == domain.TargetThread {
			if err := tx.Model(&domain.ForumThread{}).Where("id = ?", targetID).Update("status", domain.StatusThreadTerkunci).Error; err != nil {
				return err
			}
		} else if tindakan == domain.TindakanSembunyikan {
			if targetTipe == domain.TargetThread {
				if err := tx.Model(&domain.ForumThread{}).Where("id = ?", targetID).Update("status", domain.StatusThreadTersembunyi).Error; err != nil {
					return err
				}
			} else {
				if err := tx.Model(&domain.ForumBalasan{}).Where("id = ?", targetID).Update("tersembunyi", true).Error; err != nil {
					return err
				}
			}
		}

		statusLaporanBaru := domain.StatusLaporanDitindak
		if tindakan == domain.TindakanAbaikan {
			statusLaporanBaru = domain.StatusLaporanDitolak
		}

		if err := tx.Model(&domain.ForumLaporan{}).
			Where("target_tipe = ? AND target_id = ? AND status = ?", targetTipe, targetID, domain.StatusLaporanBaru).
			Update("status", statusLaporanBaru).Error; err != nil {
			return err
		}

		return nil
	})
}

