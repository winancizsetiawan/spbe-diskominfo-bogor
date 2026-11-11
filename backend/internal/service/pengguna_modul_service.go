package service

import (
	"errors"
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"spbe-backend/internal/domain"
	"spbe-backend/internal/repository"
)

var (
	ErrPenggunaTidakDitemukan   = errors.New("Pengguna tidak ditemukan.")
	ErrNotifikasiTidakDitemukan = errors.New("Notifikasi tidak ditemukan.")
	ErrKursusTidakDitemukan     = errors.New("Kursus tidak ditemukan.")
	ErrMateriTidakDitemukan     = errors.New("Materi tidak ditemukan.")

	polaTeleponID      = regexp.MustCompile(`^(\+62|0)8\d{8,11}$`)
	polaBersihTelepon  = regexp.MustCompile(`[\s\-.]`)
	urutanKategoriNotif = []string{"semua", "dokumen", "forum", "validasi", "sistem", "pembelajaran"}

	roleValidMap = map[domain.Role]string{
		domain.RoleASN:        "ASN / Pegawai OPD",
		domain.RoleAkademisi:  "Akademisi",
		domain.RoleAdminOPD:   "Admin OPD",
		domain.RoleSuperAdmin: "Super Admin",
	}
)

type PenggunaKonflikError struct {
	Pesan string
}

func (e *PenggunaKonflikError) Error() string {
	return e.Pesan
}

type PenggunaModulService struct {
	repo      *repository.PenggunaModulRepository
	sistemSvc *SistemService
}

func NewPenggunaModulService(repo *repository.PenggunaModulRepository, sistemSvc *SistemService) *PenggunaModulService {
	return &PenggunaModulService{
		repo:      repo,
		sistemSvc: sistemSvc,
	}
}

func (s *PenggunaModulService) AmbilUserDariRole(role string) (*domain.User, error) {
	if role == "" {
		role = string(domain.RoleASN)
	}
	u, err := s.repo.FindUserByRole(role)
	if err != nil {
		return s.repo.FindUserByRole(string(domain.RoleASN))
	}
	return u, nil
}

func kePenggunaDTO(u domain.User) domain.PenggunaDTO {
	return domain.PenggunaDTO{
		ID:         u.ID,
		Nama:       u.Nama,
		Email:      u.Email,
		Role:       u.Role,
		StatusAkun: u.StatusAkun,
		Instansi: domain.InstansiRingkas{
			ID:   u.Instansi.ID,
			Nama: u.Instansi.Nama,
		},
		LoginTerakhir: u.LoginTerakhir,
	}
}

// ---- 1. Auth & Profil ----

func (s *PenggunaModulService) GetMe(role string) (*domain.PenggunaDTO, error) {
	u, err := s.AmbilUserDariRole(role)
	if err != nil {
		return nil, err
	}
	dto := kePenggunaDTO(*u)
	return &dto, nil
}

func (s *PenggunaModulService) GetProfil(role string) (*domain.ProfilSayaResponse, error) {
	u, err := s.AmbilUserDariRole(role)
	if err != nil {
		return nil, err
	}
	p, err := s.repo.FindOrCreateProfil(u.ID)
	if err != nil {
		return nil, err
	}
	unduh, diskusi := s.repo.HitungStatistikProfil(u.ID)

	return &domain.ProfilSayaResponse{
		Nama:        u.Nama,
		Email:       u.Email,
		NIP:         p.NIP,
		Jabatan:     p.Jabatan,
		Golongan:    p.Golongan,
		SatkerInduk: p.SatkerInduk,
		NoTelepon:   p.NoTelepon,
		Instansi: domain.InstansiRingkas{
			ID:   u.Instansi.ID,
			Nama: u.Instansi.Nama,
		},
		Role: u.Role,
		Statistik: domain.StatistikProfil{
			DokumenDiunduh: unduh,
			DiskusiForum:   diskusi,
		},
	}, nil
}

func (s *PenggunaModulService) UbahTelepon(role string, in domain.UbahTeleponInput) (*domain.ProfilSayaResponse, error) {
	u, err := s.AmbilUserDariRole(role)
	if err != nil {
		return nil, err
	}

	bersih := ""
	if in.NoTelepon != nil {
		bersih = polaBersihTelepon.ReplaceAllString(strings.TrimSpace(*in.NoTelepon), "")
	}

	if bersih != "" && !polaTeleponID.MatchString(bersih) {
		return nil, &ValidationError{Errors: map[string]string{
			"noTelepon": "Gunakan nomor seluler Indonesia, mis. 081234567890.",
		}}
	}

	var telpPtr *string
	deskripsi := "Menghapus nomor telepon"
	if bersih != "" {
		telpPtr = &bersih
		deskripsi = "Mengubah nomor telepon"
	}

	if err := s.repo.UpdateNoTelepon(u.ID, telpPtr); err != nil {
		return nil, err
	}

	uid := u.ID
	s.sistemSvc.CatatAktivitas(&uid, domain.AksiUbahProfil, deskripsi, domain.HasilBerhasil)
	return s.GetProfil(role)
}

func (s *PenggunaModulService) GetPreferensi(role string) (*domain.PreferensiResponse, error) {
	u, err := s.AmbilUserDariRole(role)
	if err != nil {
		return nil, err
	}
	p, err := s.repo.FindOrCreateProfil(u.ID)
	if err != nil {
		return nil, err
	}
	return &domain.PreferensiResponse{KanalEmail: p.KanalEmail}, nil
}

func (s *PenggunaModulService) UbahPreferensi(role string, kanalEmail bool) (*domain.PreferensiResponse, error) {
	u, err := s.AmbilUserDariRole(role)
	if err != nil {
		return nil, err
	}
	if err := s.repo.UpdateKanalEmail(u.ID, kanalEmail); err != nil {
		return nil, err
	}

	statusStr := "dimatikan"
	if kanalEmail {
		statusStr = "diaktifkan"
	}
	uid := u.ID
	s.sistemSvc.CatatAktivitas(&uid, domain.AksiUbahPreferensi, "Notifikasi email "+statusStr, domain.HasilBerhasil)
	return &domain.PreferensiResponse{KanalEmail: kanalEmail}, nil
}

type AktivitasProfilItem struct {
	ID        uint                 `json:"id"`
	Aksi      domain.AksiAktivitas `json:"aksi"`
	Deskripsi string               `json:"deskripsi"`
	Waktu     time.Time            `json:"waktu"`
	IpAddress *string              `json:"ipAddress"`
	Hasil     domain.HasilAudit    `json:"hasil"`
}

func (s *PenggunaModulService) ListAktivitasSaya(role string, page int) (domain.PagedResponse[AktivitasProfilItem], error) {
	if page < 1 {
		page = 1
	}
	perPage := 8

	u, err := s.AmbilUserDariRole(role)
	if err != nil {
		return domain.PagedResponse[AktivitasProfilItem]{}, err
	}

	rows, err := s.repo.FindAktivitasByUser(u.ID)
	if err != nil {
		return domain.PagedResponse[AktivitasProfilItem]{}, err
	}

	semua := make([]AktivitasProfilItem, 0, len(rows))
	for _, r := range rows {
		semua = append(semua, AktivitasProfilItem{
			ID:        r.ID,
			Aksi:      r.Aksi,
			Deskripsi: r.Deskripsi,
			Waktu:     r.Waktu,
			IpAddress: r.IpAddress,
			Hasil:     r.Hasil,
		})
	}

	total := len(semua)
	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	if totalPages < 1 {
		totalPages = 1
	}

	start := (page - 1) * perPage
	if start > total {
		start = total
	}
	end := start + perPage
	if end > total {
		end = total
	}

	return domain.PagedResponse[AktivitasProfilItem]{
		Items:      semua[start:end],
		Page:       page,
		TotalPages: totalPages,
		Total:      total,
	}, nil
}

// ---- 2. Manajemen Pengguna (Admin) ----

func instansiBolehUntukRole(role domain.Role, inst *domain.Instansi) bool {
	if role == domain.RoleAdminOPD {
		return inst.Jenis == domain.JenisOPD
	}
	return true
}

func (s *PenggunaModulService) GetInstansiPengguna() ([]domain.Instansi, error) {
	return s.repo.FindAllInstansi()
}

func (s *PenggunaModulService) ListPengguna(f domain.PenggunaFilter) (domain.DaftarPenggunaResponse, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PerPage < 1 {
		f.PerPage = 8
	}

	semuaUser, err := s.repo.FindAllUsers()
	if err != nil {
		return domain.DaftarPenggunaResponse{}, err
	}

	hitungan := domain.HitunganRolePengguna{Semua: len(semuaUser)}
	for _, u := range semuaUser {
		switch u.Role {
		case domain.RoleASN:
			hitungan.ASN++
		case domain.RoleAkademisi:
			hitungan.Akademisi++
		case domain.RoleAdminOPD:
			hitungan.AdminOPD++
		case domain.RoleSuperAdmin:
			hitungan.SuperAdmin++
		}
	}

	roleFilter := f.Role
	if _, ok := roleValidMap[domain.Role(roleFilter)]; !ok {
		roleFilter = "semua"
	}

	q := strings.ToLower(strings.TrimSpace(f.Query))
	cocok := make([]domain.PenggunaDTO, 0)
	for _, u := range semuaUser {
		if roleFilter != "semua" && string(u.Role) != roleFilter {
			continue
		}
		dto := kePenggunaDTO(u)
		if q != "" {
			if !strings.Contains(strings.ToLower(dto.Nama), q) &&
				!strings.Contains(strings.ToLower(dto.Email), q) &&
				!strings.Contains(strings.ToLower(dto.Instansi.Nama), q) {
				continue
			}
		}
		cocok = append(cocok, dto)
	}

	total := len(cocok)
	totalPages := int(math.Ceil(float64(total) / float64(f.PerPage)))
	if totalPages < 1 {
		totalPages = 1
	}

	start := (f.Page - 1) * f.PerPage
	if start > total {
		start = total
	}
	end := start + f.PerPage
	if end > total {
		end = total
	}

	return domain.DaftarPenggunaResponse{
		Items:      cocok[start:end],
		Page:       f.Page,
		TotalPages: totalPages,
		Total:      total,
		Hitungan:   hitungan,
	}, nil
}

func (s *PenggunaModulService) UndangPengguna(adminRole string, in domain.UndangInput) (*domain.PenggunaDTO, error) {
	errs := make(map[string]string)
	nama := strings.TrimSpace(in.Nama)
	email := strings.ToLower(strings.TrimSpace(in.Email))

	if p := utf8.RuneCountInString(nama); p < 3 || p > 100 {
		errs["nama"] = "Nama harus 3–100 karakter."
	}
	if !polaEmailSederhana.MatchString(email) {
		errs["email"] = "Format email tidak valid."
	} else if s.repo.ExistsEmail(email) {
		errs["email"] = "Email sudah terdaftar."
	}

	_, roleOk := roleValidMap[in.Role]
	if !roleOk {
		errs["role"] = "Peran tidak valid."
	}

	inst, err := s.repo.FindInstansiByID(in.IdInstansi)
	if err != nil {
		errs["idInstansi"] = "Pilih instansi."
	} else if roleOk && !instansiBolehUntukRole(in.Role, inst) {
		errs["idInstansi"] = "Admin OPD harus berasal dari OPD."
	}

	if len(errs) > 0 {
		return nil, &ValidationError{Errors: errs}
	}

	baru := &domain.User{
		Nama:       nama,
		Email:      email,
		Role:       in.Role,
		StatusAkun: domain.StatusDiundang,
		InstansiID: inst.ID,
	}

	if err := s.repo.CreateUser(baru); err != nil {
		return nil, err
	}

	adminUser, _ := s.AmbilUserDariRole(adminRole)
	if adminUser != nil {
		uid := adminUser.ID
		s.sistemSvc.CatatAktivitas(&uid, domain.AksiKelolaPengguna, fmt.Sprintf("Mengundang %s sebagai %s", nama, roleValidMap[in.Role]), domain.HasilBerhasil)
	}

	dto := kePenggunaDTO(*baru)
	return &dto, nil
}

func (s *PenggunaModulService) UbahPengguna(adminRole string, targetID uint, in domain.UbahPenggunaInput) (*domain.PenggunaDTO, error) {
	target, err := s.repo.FindUserByID(targetID)
	if err != nil {
		return nil, ErrPenggunaTidakDitemukan
	}

	adminUser, _ := s.AmbilUserDariRole(adminRole)
	if adminUser != nil && target.ID == adminUser.ID {
		return nil, &PenggunaKonflikError{Pesan: "Anda tidak dapat mengubah akun Anda sendiri."}
	}

	if in.Role == nil && in.IdInstansi == nil && in.StatusAkun == nil {
		return nil, &ValidationError{Errors: map[string]string{"role": "Tidak ada perubahan."}}
	}

	errs := make(map[string]string)
	roleBaru := target.Role
	if in.Role != nil {
		roleBaru = *in.Role
		if _, ok := roleValidMap[roleBaru]; !ok {
			errs["role"] = "Peran tidak valid."
		}
	}

	idInstansiBaru := target.InstansiID
	if in.IdInstansi != nil {
		idInstansiBaru = *in.IdInstansi
	}
	instBaru, err := s.repo.FindInstansiByID(idInstansiBaru)
	if err != nil {
		errs["idInstansi"] = "Instansi tidak valid."
	} else if _, ok := roleValidMap[roleBaru]; ok && !instansiBolehUntukRole(roleBaru, instBaru) {
		errs["idInstansi"] = "Admin OPD harus berasal dari OPD."
	}

	if in.StatusAkun != nil && *in.StatusAkun != domain.StatusAktif && *in.StatusAkun != domain.StatusNonaktif {
		errs["statusAkun"] = "Status tidak valid."
	}
	if len(errs) > 0 {
		return nil, &ValidationError{Errors: errs}
	}

	if in.StatusAkun != nil {
		if *in.StatusAkun == domain.StatusNonaktif && target.StatusAkun == domain.StatusNonaktif {
			return nil, &PenggunaKonflikError{Pesan: "Akun sudah nonaktif."}
		}
		if *in.StatusAkun == domain.StatusAktif && target.StatusAkun != domain.StatusNonaktif {
			return nil, &PenggunaKonflikError{Pesan: "Akun tidak sedang nonaktif."}
		}
	}

	roleBerubah := in.Role != nil && *in.Role != target.Role
	instBerubah := in.IdInstansi != nil && *in.IdInstansi != target.InstansiID

	if roleBerubah {
		target.Role = *in.Role
	}
	if instBerubah {
		target.InstansiID = *in.IdInstansi
	}
	if in.StatusAkun != nil {
		if *in.StatusAkun == domain.StatusNonaktif {
			target.StatusAkun = domain.StatusNonaktif
		} else if *in.StatusAkun == domain.StatusAktif {
			if target.LoginTerakhir != nil {
				target.StatusAkun = domain.StatusAktif
			} else {
				target.StatusAkun = domain.StatusDiundang
			}
		}
	}

	if err := s.repo.UpdateUser(target); err != nil {
		return nil, err
	}

	var adminIDPtr *uint
	if adminUser != nil {
		uid := adminUser.ID
		adminIDPtr = &uid
	}

	if roleBerubah || instBerubah {
		_ = s.repo.CreateNotifikasi(&domain.Notifikasi{
			UserID:    target.ID,
			Kategori:  domain.KategoriNotifSistem,
			Judul:     "Peran akun Anda diubah",
			Pesan:     fmt.Sprintf("Peran Anda kini %s di %s.", roleValidMap[target.Role], instBaru.Nama),
			UrlTujuan: "/profil",
		})
		s.sistemSvc.CatatAktivitas(adminIDPtr, domain.AksiKelolaPengguna, fmt.Sprintf("Mengubah %s menjadi %s, %s", target.Nama, roleValidMap[target.Role], instBaru.Nama), domain.HasilBerhasil)
	}

	if in.StatusAkun != nil {
		aksiLabel := "Mengaktifkan kembali"
		if *in.StatusAkun == domain.StatusNonaktif {
			aksiLabel = "Menonaktifkan"
		}
		s.sistemSvc.CatatAktivitas(adminIDPtr, domain.AksiKelolaPengguna, fmt.Sprintf("%s akun %s", aksiLabel, target.Nama), domain.HasilBerhasil)
	}

	dto := kePenggunaDTO(*target)
	return &dto, nil
}

func (s *PenggunaModulService) UndangUlang(adminRole string, targetID uint) error {
	target, err := s.repo.FindUserByID(targetID)
	if err != nil {
		return ErrPenggunaTidakDitemukan
	}
	if target.StatusAkun != domain.StatusDiundang {
		return &PenggunaKonflikError{Pesan: "Hanya pengguna berstatus Diundang yang dapat diundang ulang."}
	}

	adminUser, _ := s.AmbilUserDariRole(adminRole)
	if adminUser != nil {
		uid := adminUser.ID
		s.sistemSvc.CatatAktivitas(&uid, domain.AksiKelolaPengguna, "Mengirim ulang undangan ke "+target.Email, domain.HasilBerhasil)
	}
	return nil
}

// ---- 3. Notifikasi ----

func kategoriNotifValid(k string) bool {
	for _, item := range urutanKategoriNotif {
		if item == k {
			return true
		}
	}
	return false
}

func (s *PenggunaModulService) GetRingkasNotifikasi(role string) (domain.RingkasNotifikasiResponse, error) {
	u, err := s.AmbilUserDariRole(role)
	if err != nil {
		return domain.RingkasNotifikasiResponse{}, err
	}
	milik, err := s.repo.FindNotifikasiByUser(u.ID)
	if err != nil {
		return domain.RingkasNotifikasiResponse{}, err
	}
	belum := 0
	for _, n := range milik {
		if !n.SudahDibaca {
			belum++
		}
	}
	return domain.RingkasNotifikasiResponse{BelumDibaca: belum}, nil
}

func (s *PenggunaModulService) ListNotifikasi(role string, kategori string, page int) (domain.DaftarNotifikasiResponse, error) {
	if page < 1 {
		page = 1
	}
	perPage := 8
	if !kategoriNotifValid(kategori) {
		kategori = "semua"
	}

	u, err := s.AmbilUserDariRole(role)
	if err != nil {
		return domain.DaftarNotifikasiResponse{}, err
	}

	milik, err := s.repo.FindNotifikasiByUser(u.ID)
	if err != nil {
		return domain.DaftarNotifikasiResponse{}, err
	}

	belumMap := make(map[string]int)
	for _, k := range urutanKategoriNotif {
		belumMap[k] = 0
	}
	for _, n := range milik {
		if !n.SudahDibaca {
			belumMap["semua"]++
			belumMap[string(n.Kategori)]++
		}
	}

	cocok := make([]domain.NotifikasiDTO, 0, len(milik))
	for _, n := range milik {
		if kategori != "semua" && string(n.Kategori) != kategori {
			continue
		}
		cocok = append(cocok, domain.NotifikasiDTO{
			ID:          n.ID,
			Kategori:    n.Kategori,
			Judul:       n.Judul,
			Pesan:       n.Pesan,
			UrlTujuan:   n.UrlTujuan,
			SudahDibaca: n.SudahDibaca,
			DibuatPada:  n.DibuatPada,
		})
	}

	total := len(cocok)
	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	if totalPages < 1 {
		totalPages = 1
	}

	start := (page - 1) * perPage
	if start > total {
		start = total
	}
	end := start + perPage
	if end > total {
		end = total
	}

	return domain.DaftarNotifikasiResponse{
		Items:       cocok[start:end],
		Page:        page,
		TotalPages:  totalPages,
		Total:       total,
		BelumDibaca: belumMap,
	}, nil
}

func (s *PenggunaModulService) TandaiDibacaSemua(role string, kategori string) (int64, error) {
	u, err := s.AmbilUserDariRole(role)
	if err != nil {
		return 0, err
	}
	if !kategoriNotifValid(kategori) {
		kategori = "semua"
	}
	return s.repo.MarkSemuaNotifikasiDibaca(u.ID, kategori)
}

func (s *PenggunaModulService) TandaiDibaca(role string, id uint) error {
	u, err := s.AmbilUserDariRole(role)
	if err != nil {
		return err
	}
	affected, err := s.repo.MarkNotifikasiDibaca(id, u.ID)
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotifikasiTidakDitemukan
	}
	return nil
}

// ---- 4. Pembelajaran / LMS ----

func buatRingkasKursus(k domain.Kursus, selesaiSet map[uint]bool) domain.KursusRingkasDTO {
	jmlMateri := len(k.Materi)
	selesaiCount := 0
	for _, m := range k.Materi {
		if selesaiSet[m.ID] {
			selesaiCount++
		}
	}
	persen := 0
	if jmlMateri > 0 {
		persen = int(math.Round((float64(selesaiCount) / float64(jmlMateri)) * 100))
	}
	return domain.KursusRingkasDTO{
		ID:            k.ID,
		Judul:         k.Judul,
		Deskripsi:     k.Deskripsi,
		Kategori:      k.Kategori,
		Tingkat:       k.Tingkat,
		DurasiJam:     k.DurasiJam,
		AdaSertifikat: k.AdaSertifikat,
		JumlahMateri:  jmlMateri,
		MateriSelesai: selesaiCount,
		Persen:        persen,
	}
}

func (s *PenggunaModulService) ListKursus(role string) (domain.DaftarKursusResponse, error) {
	u, err := s.AmbilUserDariRole(role)
	if err != nil {
		return domain.DaftarKursusResponse{}, err
	}

	kursusList, err := s.repo.FindAllKursus()
	if err != nil {
		return domain.DaftarKursusResponse{}, err
	}

	progresList, _ := s.repo.FindProgresByUser(u.ID)
	selesaiSet := make(map[uint]bool)
	for _, p := range progresList {
		selesaiSet[p.MateriID] = true
	}

	items := make([]domain.KursusRingkasDTO, 0, len(kursusList))
	for _, k := range kursusList {
		items = append(items, buatRingkasKursus(k, selesaiSet))
	}

	sertRows, _ := s.repo.FindSertifikatByUser(u.ID)
	sertDTO := make([]domain.SertifikatDTO, 0, len(sertRows))
	for _, sr := range sertRows {
		sertDTO = append(sertDTO, domain.SertifikatDTO{
			Nomor:           sr.Nomor,
			Kursus:          sr.KursusJudul,
			DiterbitkanPada: sr.DiterbitkanPada,
		})
	}

	return domain.DaftarKursusResponse{
		Items:      items,
		Sertifikat: sertDTO,
	}, nil
}

func (s *PenggunaModulService) GetKursusDetail(role string, kursusID uint) (*domain.KursusDetailDTO, error) {
	u, err := s.AmbilUserDariRole(role)
	if err != nil {
		return nil, err
	}

	k, err := s.repo.FindKursusByID(kursusID)
	if err != nil {
		return nil, ErrKursusTidakDitemukan
	}

	progresList, _ := s.repo.FindProgresByUser(u.ID)
	selesaiSet := make(map[uint]bool)
	for _, p := range progresList {
		if p.KursusID == k.ID {
			selesaiSet[p.MateriID] = true
		}
	}

	materiDTO := make([]domain.MateriDetailDTO, 0, len(k.Materi))
	for _, m := range k.Materi {
		materiDTO = append(materiDTO, domain.MateriDetailDTO{
			ID:      m.ID,
			Judul:   m.Judul,
			Tipe:    m.Tipe,
			URL:     m.URL,
			Selesai: selesaiSet[m.ID],
		})
	}

	var sertPtr *domain.SertifikatDTO
	sertRows, _ := s.repo.FindSertifikatByUser(u.ID)
	for _, sr := range sertRows {
		if sr.KursusID == k.ID {
			sertPtr = &domain.SertifikatDTO{
				Nomor:           sr.Nomor,
				Kursus:          sr.KursusJudul,
				DiterbitkanPada: sr.DiterbitkanPada,
			}
			break
		}
	}

	return &domain.KursusDetailDTO{
		KursusRingkasDTO: buatRingkasKursus(*k, selesaiSet),
		Materi:           materiDTO,
		Sertifikat:       sertPtr,
	}, nil
}

func (s *PenggunaModulService) TandaiMateriSelesai(role string, kursusID uint, materiID uint) (*domain.KursusDetailDTO, error) {
	u, err := s.AmbilUserDariRole(role)
	if err != nil {
		return nil, err
	}

	k, err := s.repo.FindKursusByID(kursusID)
	if err != nil {
		return nil, ErrMateriTidakDitemukan
	}

	adaMateri := false
	for _, m := range k.Materi {
		if m.ID == materiID {
			adaMateri = true
			break
		}
	}
	if !adaMateri {
		return nil, ErrMateriTidakDitemukan
	}

	if err := s.repo.MarkMateriSelesai(u.ID, k.ID, materiID); err != nil {
		return nil, err
	}

	detail, err := s.GetKursusDetail(role, kursusID)
	if err != nil {
		return nil, err
	}

	// Jika semua materi selesai dan kursus menerbitkan sertifikat
	if detail.MateriSelesai == detail.JumlahMateri && k.AdaSertifikat && detail.Sertifikat == nil {
		seq := s.repo.CountAllSertifikat() + 1
		nomor := fmt.Sprintf("SPBE/%d/KRS-%d/%04d", time.Now().Year(), k.ID, seq)
		sertBaru := &domain.KursusSertifikat{
			UserID:          u.ID,
			KursusID:        k.ID,
			Nomor:           nomor,
			KursusJudul:     k.Judul,
			DiterbitkanPada: time.Now(),
		}
		terbitBaru, err := s.repo.FindOrCreateSertifikat(sertBaru)
		if err == nil {
			detail.Sertifikat = &domain.SertifikatDTO{
				Nomor:           sertBaru.Nomor,
				Kursus:          sertBaru.KursusJudul,
				DiterbitkanPada: sertBaru.DiterbitkanPada,
			}
			if terbitBaru {
				_ = s.repo.CreateNotifikasi(&domain.Notifikasi{
					UserID:    u.ID,
					Kategori:  domain.KategoriNotifPembelajaran,
					Judul:     "Kursus selesai",
					Pesan:     fmt.Sprintf("Bukti penyelesaian %s telah terbit.", k.Judul),
					UrlTujuan: fmt.Sprintf("/pembelajaran/%d", k.ID),
				})
			}
		}
	}

	return detail, nil
}

