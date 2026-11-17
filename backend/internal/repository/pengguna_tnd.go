package repository

import (
	"errors"
	"strings"

	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

// FindUserByNIP mencari pengguna yang pernah masuk lewat TND (atau didaftarkan dengan NIP).
func (r *PenggunaModulRepository) FindUserByNIP(nip string) (*domain.User, error) {
	var u domain.User
	if err := r.db.Preload("Instansi").Where("nip = ?", nip).First(&u).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

// InstansiUntukOPDTND mencari instansi untuk OPD pegawai dari TND: lewat opd_id TND, lalu nama yang sama
// (tanpa membedakan huruf besar/kecil). Bila tidak ada, instansi baru dibuat dengan nama OPD dari TND.
// opd_id TND disimpan agar pencocokan berikutnya tidak bergantung pada nama.
func (r *PenggunaModulRepository) InstansiUntukOPDTND(opdID int, namaPD string) (*domain.Instansi, error) {
	namaPD = strings.TrimSpace(namaPD)
	var ins domain.Instansi
	if opdID > 0 {
		err := r.db.Where("id_opd_tnd = ?", opdID).First(&ins).Error
		if err == nil {
			return &ins, nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}
	if namaPD == "" {
		return nil, errors.New("nama OPD dari TND kosong")
	}
	err := r.db.Where("LOWER(nama) = LOWER(?)", namaPD).First(&ins).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		ins = domain.Instansi{Nama: namaPD, Jenis: domain.JenisOPD}
		if opdID > 0 {
			ins.IdOpdTnd = &opdID
		}
		if err := r.db.Create(&ins).Error; err != nil {
			return nil, err
		}
		return &ins, nil
	}
	if err != nil {
		return nil, err
	}
	if opdID > 0 && ins.IdOpdTnd == nil {
		_ = r.db.Model(&ins).Update("id_opd_tnd", opdID).Error
		ins.IdOpdTnd = &opdID
	}
	return &ins, nil
}

// SimpanProfilTND menyalin NIP dan jabatan dari TND ke profil pengguna.
func (r *PenggunaModulRepository) SimpanProfilTND(userID uint, nip, jabatan, satker string) error {
	var p domain.ProfilPengguna
	err := r.db.Where("user_id = ?", userID).First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return r.db.Create(&domain.ProfilPengguna{UserID: userID, NIP: nip, Jabatan: jabatan, SatkerInduk: satker, KanalEmail: true}).Error
	}
	if err != nil {
		return err
	}
	// Pakai struct (bukan map nama kolom): kolom NIP di tabel ini bernama n_ip mengikuti penamaan GORM.
	return r.db.Model(&p).Updates(domain.ProfilPengguna{NIP: nip, Jabatan: jabatan, SatkerInduk: satker}).Error
}
