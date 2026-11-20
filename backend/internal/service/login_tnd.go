package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	"spbe-backend/internal/domain"

	"gorm.io/gorm"
)

// PasangTND mengaktifkan login ASN lewat akun TND. nil = login TND tidak aktif (NIP diperlakukan seperti username biasa).
func (s *PenggunaModulService) PasangTND(k *KlienTND) { s.tnd = k }

// cekBlokir memulihkan blokir yang sudah lewat masanya, lalu menolak akun yang masih diblokir/nonaktif.
func (s *PenggunaModulService) cekBlokir(u *domain.User, now time.Time) (int, error) {
	if u.TerkunciHingga != nil && now.After(*u.TerkunciHingga) {
		u.GagalLogin = 0
		u.TerkunciHingga = nil
		if u.StatusAkun == domain.StatusNonaktif {
			u.StatusAkun = domain.StatusAktif
		}
		_ = s.repo.UpdateUser(u)
	}
	if (u.TerkunciHingga != nil && now.Before(*u.TerkunciHingga)) || u.StatusAkun == domain.StatusNonaktif {
		uid := u.ID
		s.sistemSvc.CatatAktivitas(&uid, domain.AksiLogin, "Percobaan masuk ditolak: akun sedang diblokir/nonaktif", domain.HasilGagal)
		if u.TerkunciHingga != nil && now.Before(*u.TerkunciHingga) {
			sisaMenit := int(math.Ceil(u.TerkunciHingga.Sub(now).Minutes()))
			if sisaMenit < 1 {
				sisaMenit = 1
			}
			return 423, fmt.Errorf("Akun Anda diblokir karena %d kali salah memasukkan kata sandi. Silakan tunggu %d menit lagi atau hubungi Super Admin Diskominfo untuk memulihkan akun Anda.", MaksGagalLogin, sisaMenit)
		}
		return 423, errors.New("Akun Anda sedang dinonaktifkan/diblokir. Hubungi Super Admin Diskominfo untuk memulihkan akun Anda.")
	}
	return 0, nil
}

// catatGagalLogin menambah hitungan salah kata sandi dan memblokir akun setelah MaksGagalLogin kali.
func (s *PenggunaModulService) catatGagalLogin(u *domain.User, now time.Time) (int, error) {
	u.GagalLogin++
	uid := u.ID
	if u.GagalLogin >= MaksGagalLogin {
		terkunci := now.Add(DurasiBlokirLogin)
		u.TerkunciHingga = &terkunci
		if u.Role != domain.RoleSuperAdmin {
			u.StatusAkun = domain.StatusNonaktif
		}
		_ = s.repo.UpdateUser(u)
		s.sistemSvc.CatatAktivitas(&uid, domain.AksiLogin, fmt.Sprintf("Akun diblokir otomatis setelah %d kali salah kata sandi", MaksGagalLogin), domain.HasilGagal)
		admins, _ := s.repo.FindSuperAdmins()
		for _, adm := range admins {
			_ = s.repo.CreateNotifikasi(&domain.Notifikasi{
				UserID:      adm.ID,
				Kategori:    domain.KategoriNotifSistem,
				Judul:       "Peringatan Keamanan: Akun Diblokir",
				Pesan:       fmt.Sprintf("Akun %s (%s) diblokir otomatis karena %d kali gagal masuk berturut-turut.", u.Nama, roleValidMap[u.Role], MaksGagalLogin),
				UrlTujuan:   "/admin/pengguna",
				SudahDibaca: false,
				DibuatPada:  now,
			})
		}
		return 423, fmt.Errorf("Akun Anda telah diblokir karena %d kali salah memasukkan kata sandi. Hubungi Super Admin Diskominfo untuk memulihkan akun Anda atau tunggu 15 menit.", MaksGagalLogin)
	}
	_ = s.repo.UpdateUser(u)
	s.sistemSvc.CatatAktivitas(&uid, domain.AksiLogin, fmt.Sprintf("Percobaan masuk gagal (%d/%d): kata sandi salah", u.GagalLogin, MaksGagalLogin), domain.HasilGagal)
	return 401, fmt.Errorf("Username atau kata sandi salah. Sisa percobaan: %d kali lagi sebelum akun diblokir.", MaksGagalLogin-u.GagalLogin)
}

func (s *PenggunaModulService) loginBerhasil(u *domain.User, now time.Time, deskripsi string) *domain.LoginResponse {
	u.GagalLogin = 0
	u.TerkunciHingga = nil
	u.LoginTerakhir = &now
	if u.SandiDiubahPada == nil && u.SumberAkun != domain.SumberTND {
		u.SandiDiubahPada = &now
	}
	_ = s.repo.UpdateUser(u)
	uid := u.ID
	s.sistemSvc.CatatAktivitas(&uid, domain.AksiLogin, deskripsi, domain.HasilBerhasil)
	return &domain.LoginResponse{Role: u.Role, User: kePenggunaDTO(*u)}
}

// loginTND: ASN masuk dengan NIP dan kata sandi TND.
//  1. Akun portal yang sudah ada dengan NIP ini diperiksa dulu (blokir/nonaktif ditolak tanpa menghubungi TND).
//  2. NIP dan kata sandi diperiksa ke TND. Salah → dihitung ke batas 5 kali bila akunnya sudah ada.
//  3. Berhasil → akun dicari lewat NIP, lalu email TND; bila belum ada, dibuat sebagai ASN di OPD dari TND.
func (s *PenggunaModulService) loginTND(nip, sandi string) (*domain.LoginResponse, int, error) {
	now := time.Now()
	u, err := s.repo.FindUserByNIP(nip)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, 500, errors.New("Gagal memeriksa akun.")
	}
	if u != nil {
		if status, err := s.cekBlokir(u, now); err != nil {
			return nil, status, err
		}
	}

	ctx, batal := context.WithTimeout(context.Background(), 15*time.Second)
	defer batal()
	p, err := s.tnd.Login(ctx, nip, sandi)
	switch {
	case errors.Is(err, ErrTNDTidakTersedia):
		log.Printf("[tnd] login NIP ***%s gagal menghubungi TND: %v", nip[len(nip)-4:], err)
		return nil, 503, ErrTNDTidakTersedia
	case errors.Is(err, ErrTNDTidakAktif):
		s.sistemSvc.CatatAktivitas(idDari(u), domain.AksiLogin, "Percobaan masuk lewat TND ditolak: status kepegawaian tidak aktif", domain.HasilGagal)
		return nil, 403, ErrTNDTidakAktif
	case err != nil:
		if u != nil {
			// Akun sudah ada: kata sandi salah dihitung ke batas blokir 5 kali.
			status, errGagal := s.catatGagalLogin(u, now)
			if status == 401 {
				errGagal = errors.New(strings.Replace(errGagal.Error(), "Username atau kata sandi salah.", "NIP atau kata sandi salah.", 1))
			}
			return nil, status, errGagal
		}
		s.sistemSvc.CatatAktivitas(nil, domain.AksiLogin, fmt.Sprintf("Percobaan masuk lewat TND gagal: NIP ***%s", nip[len(nip)-4:]), domain.HasilGagal)
		return nil, 401, errors.New("NIP atau kata sandi salah.")
	}

	if u == nil && p.Email != "" {
		if lama, err := s.repo.FindUserByEmail(p.Email); err == nil {
			if lama.Nip != nil && *lama.Nip != nip {
				return nil, 409, errors.New("Email akun TND Anda sudah dipakai akun portal lain. Hubungi Super Admin.")
			}
			u = lama // akun yang sudah diundang dengan email yang sama: tautkan ke NIP
		}
	}
	if u != nil {
		if status, err := s.cekBlokir(u, now); err != nil {
			return nil, status, err
		}
	}

	ins, err := s.repo.InstansiUntukOPDTND(p.OpdID, p.NamaPD)
	if err != nil {
		log.Printf("[tnd] instansi untuk OPD %d gagal: %v", p.OpdID, err)
		return nil, 500, errors.New("Gagal menyiapkan data instansi Anda.")
	}

	nipSalin := nip
	if u == nil {
		email := p.Email
		if email == "" || s.repo.ExistsEmail(email) {
			email = nip + "@tnd.kotabogor.go.id"
		}
		nama := p.Nama
		if nama == "" {
			nama = "Pegawai " + nip
		}
		u = &domain.User{
			Nama: nama, Email: email, Role: domain.RoleASN, StatusAkun: domain.StatusAktif,
			InstansiID: ins.ID, Nip: &nipSalin, SumberAkun: domain.SumberTND,
		}
		if err := s.repo.CreateUser(u); err != nil {
			log.Printf("[tnd] membuat akun gagal: %v", err)
			return nil, 500, errors.New("Gagal membuat akun portal Anda.")
		}
		uid := u.ID
		s.sistemSvc.CatatAktivitas(&uid, domain.AksiKelolaPengguna, "Akun ASN dibuat otomatis saat masuk lewat TND ("+ins.Nama+")", domain.HasilBerhasil)
	} else {
		// Perbarui data yang memang bersumber dari TND. Peran dan status tetap diatur di portal.
		u.Nip = &nipSalin
		u.SumberAkun = domain.SumberTND
		if p.Nama != "" {
			u.Nama = p.Nama
		}
		u.InstansiID = ins.ID
		u.Instansi = *ins
	}
	_ = s.repo.SimpanProfilTND(u.ID, nip, p.Jabatan, ins.Nama)
	return s.siapkanPraLogin(u, now)
}

func idDari(u *domain.User) *uint {
	if u == nil {
		return nil
	}
	id := u.ID
	return &id
}
