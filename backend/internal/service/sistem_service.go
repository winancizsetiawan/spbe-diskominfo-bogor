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
	ErrPeriodeTidakDitemukan = errors.New("Periode tidak ditemukan.")
	polaTanggalKalender      = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
	polaEmailSederhana       = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
)

const (
	JadwalBackupOtomatis = "Setiap hari pukul 02.00 WIB"
	RetensiBackupDefault = 7
)

type SistemKonflikError struct {
	Pesan string
}

func (e *SistemKonflikError) Error() string {
	return e.Pesan
}

type SistemService struct {
	repo *repository.SistemRepository
}

func NewSistemService(repo *repository.SistemRepository) *SistemService {
	return &SistemService{repo: repo}
}

func formatTanggalHariIni(t time.Time) string {
	return t.Format("2006-01-02")
}

func geserHariKalender(ymd string, hari int) string {
	parsed, err := time.Parse("2006-01-02", ymd)
	if err != nil {
		return ymd
	}
	return parsed.AddDate(0, 0, hari).Format("2006-01-02")
}

func hitungStatusPeriode(mulai, tenggat, sekarang string) domain.StatusPeriode {
	if sekarang < mulai {
		return domain.StatusPeriodeAkanDatang
	}
	if sekarang > tenggat {
		return domain.StatusPeriodeSelesai
	}
	return domain.StatusPeriodeBerjalan
}

func hitungPengingatPeriode(tenggat, sekarang string) []domain.PengingatPeriodeDTO {
	hariPengingat := []int{7, 3, 1}
	res := make([]domain.PengingatPeriodeDTO, 0, len(hariPengingat))
	for _, h := range hariPengingat {
		tgl := geserHariKalender(tenggat, -h)
		res = append(res, domain.PengingatPeriodeDTO{
			HariSebelum: h,
			Tanggal:     tgl,
			Terkirim:    tgl <= sekarang,
		})
	}
	return res
}

func kePeriodeResponse(p domain.PeriodePembaruan, sekarang string) domain.PeriodeResponse {
	return domain.PeriodeResponse{
		ID:           p.ID,
		Nama:         p.Nama,
		TanggalMulai: p.TanggalMulai,
		Tenggat:      p.Tenggat,
		Status:       hitungStatusPeriode(p.TanggalMulai, p.Tenggat, sekarang),
		Pengingat:    hitungPengingatPeriode(p.Tenggat, sekarang),
		DibuatOleh:   p.DibuatOleh,
	}
}

func (s *SistemService) CatatAktivitas(userID *uint, aksi domain.AksiAktivitas, deskripsi string, hasil domain.HasilAudit) {
	if hasil == "" {
		hasil = domain.HasilBerhasil
	}
	_ = s.repo.CreateAuditLog(&domain.AuditLog{
		UserID:    userID,
		Aksi:      aksi,
		Hasil:     hasil,
		Deskripsi: deskripsi,
		Waktu:     time.Now(),
	})
}

// ---- 1. Audit Trail ----

func (s *SistemService) ListAudit(f domain.AuditFilter) (domain.DaftarAuditResponse, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PerPage < 1 {
		f.PerPage = 10
	}

	rows, err := s.repo.FindAllAuditLogs()
	if err != nil {
		return domain.DaftarAuditResponse{}, err
	}

	q := strings.ToLower(strings.TrimSpace(f.Query))
	cocokTanpaKategori := make([]domain.AuditLogResponse, 0, len(rows))

	for _, r := range rows {
		if f.Aksi != "" && string(r.Aksi) != f.Aksi {
			continue
		}
		if f.Hasil != "" && string(r.Hasil) != f.Hasil {
			continue
		}
		tglLog := formatTanggalHariIni(r.Waktu)
		if f.Dari != "" && tglLog < f.Dari {
			continue
		}
		if f.Sampai != "" && tglLog > f.Sampai {
			continue
		}

		var penggunaDTO *domain.PenggunaAuditDTO
		if r.User != nil && r.User.ID != 0 {
			penggunaDTO = &domain.PenggunaAuditDTO{
				Nama:  r.User.Nama,
				Email: r.User.Email,
				Role:  r.User.Role,
			}
		}

		if q != "" {
			matchDeskripsi := strings.Contains(strings.ToLower(r.Deskripsi), q)
			matchNama := penggunaDTO != nil && strings.Contains(strings.ToLower(penggunaDTO.Nama), q)
			matchEmail := penggunaDTO != nil && strings.Contains(strings.ToLower(penggunaDTO.Email), q)
			matchIP := r.IpAddress != nil && strings.Contains(strings.ToLower(*r.IpAddress), q)
			if !matchDeskripsi && !matchNama && !matchEmail && !matchIP {
				continue
			}
		}

		cocokTanpaKategori = append(cocokTanpaKategori, domain.AuditLogResponse{
			ID:        r.ID,
			Waktu:     r.Waktu,
			Pengguna:  penggunaDTO,
			Kategori:  domain.TentukanKategoriAudit(r.Aksi, r.Hasil),
			Aksi:      r.Aksi,
			Hasil:     r.Hasil,
			Deskripsi: r.Deskripsi,
			IpAddress: r.IpAddress,
		})
	}

	hitungan := map[string]int{
		"semua":     len(cocokTanpaKategori),
		"aktivitas": 0,
		"keamanan":  0,
	}
	for _, item := range cocokTanpaKategori {
		if item.Kategori == domain.KategoriAuditKeamanan {
			hitungan["keamanan"]++
		} else {
			hitungan["aktivitas"]++
		}
	}

	kategoriFilter := f.Kategori
	if kategoriFilter != string(domain.KategoriAuditAktivitas) && kategoriFilter != string(domain.KategoriAuditKeamanan) {
		kategoriFilter = "semua"
	}

	cocok := make([]domain.AuditLogResponse, 0, len(cocokTanpaKategori))
	for _, item := range cocokTanpaKategori {
		if kategoriFilter == "semua" || string(item.Kategori) == kategoriFilter {
			cocok = append(cocok, item)
		}
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

	return domain.DaftarAuditResponse{
		Items:      cocok[start:end],
		Page:       f.Page,
		TotalPages: totalPages,
		Total:      total,
		Hitungan:   hitungan,
	}, nil
}

// ---- 2. Backup Database ----

func (s *SistemService) GetBackup() (domain.DaftarBackupResponse, error) {
	items, err := s.repo.FindAllBackups()
	if err != nil {
		return domain.DaftarBackupResponse{}, err
	}

	var terakhirBerhasil *time.Time
	for i := range items {
		if items[i].Status == domain.StatusBackupBerhasil {
			t := items[i].Waktu
			terakhirBerhasil = &t
			break
		}
	}

	return domain.DaftarBackupResponse{
		Items:            items,
		Jadwal:           JadwalBackupOtomatis,
		Retensi:          RetensiBackupDefault,
		TerakhirBerhasil: terakhirBerhasil,
	}, nil
}

func (s *SistemService) MulaiBackupManual(role string) (*domain.RiwayatBackup, error) {
	if s.repo.HasRunningBackup() {
		return nil, &SistemKonflikError{Pesan: "Backup sedang berjalan. Tunggu hingga selesai."}
	}

	user, _ := s.repo.FindUserByRole(role)
	namaOleh := "Super Admin"
	var userIDPtr *uint
	if user != nil {
		namaOleh = user.Nama
		uid := user.ID
		userIDPtr = &uid
	}

	semua, _ := s.repo.FindAllBackups()
	ukuranDasar := 829.8
	for _, b := range semua {
		if b.Status == domain.StatusBackupBerhasil && b.UkuranMb != nil {
			ukuranDasar = *b.UkuranMb
			break
		}
	}

	baris := &domain.RiwayatBackup{
		Tipe:       domain.BackupManual,
		Status:     domain.StatusBackupBerjalan,
		UkuranMb:   nil,
		Oleh:       &namaOleh,
		Waktu:      time.Now(),
		PesanGagal: nil,
	}

	if err := s.repo.CreateBackup(baris, RetensiBackupDefault); err != nil {
		return nil, err
	}

	s.CatatAktivitas(userIDPtr, domain.AksiBackup, "Menjalankan backup manual", domain.HasilBerhasil)

	// Selesaikan backup secara asinkron setelah 3 detik (sesuai perilaku di frontend polling)
	go func(bID uint, dasar float64, uid *uint) {
		time.Sleep(3 * time.Second)
		ukuranBaru := math.Round((dasar+1.5)*10) / 10
		bSelesai := &domain.RiwayatBackup{
			ID:         bID,
			Tipe:       domain.BackupManual,
			Status:     domain.StatusBackupBerhasil,
			UkuranMb:   &ukuranBaru,
			Oleh:       &namaOleh,
			Waktu:      baris.Waktu,
			PesanGagal: nil,
		}
		_ = s.repo.UpdateBackup(bSelesai)
		s.CatatAktivitas(uid, domain.AksiBackup, "Backup manual selesai", domain.HasilBerhasil)
	}(baris.ID, ukuranDasar, userIDPtr)

	return baris, nil
}

// ---- 3. Periode Pembaruan Data ----

func validasiTanggalYMD(v string) bool {
	if !polaTanggalKalender.MatchString(v) {
		return false
	}
	_, err := time.Parse("2006-01-02", v)
	return err == nil
}

func validasiInputPeriode(in domain.PeriodeInput, lain []domain.PeriodePembaruan, sekarang string) map[string]string {
	errs := make(map[string]string)
	nama := strings.TrimSpace(in.Nama)
	panjangNama := utf8.RuneCountInString(nama)

	if panjangNama < 3 || panjangNama > 100 {
		errs["nama"] = "Nama periode harus 3–100 karakter."
	} else {
		for _, p := range lain {
			if strings.EqualFold(p.Nama, nama) {
				errs["nama"] = "Nama periode sudah dipakai."
				break
			}
		}
	}

	if !validasiTanggalYMD(in.TanggalMulai) {
		errs["tanggalMulai"] = "Isi tanggal mulai."
	}
	if !validasiTanggalYMD(in.Tenggat) {
		errs["tenggat"] = "Isi tenggat."
	}
	if errs["tanggalMulai"] != "" || errs["tenggat"] != "" {
		return errs
	}

	if in.Tenggat <= in.TanggalMulai {
		errs["tenggat"] = "Tenggat harus setelah tanggal mulai."
	} else if in.Tenggat < sekarang {
		errs["tenggat"] = "Tenggat tidak boleh sudah lewat."
	} else {
		for _, p := range lain {
			if in.TanggalMulai <= p.Tenggat && in.Tenggat >= p.TanggalMulai {
				errs["tanggalMulai"] = fmt.Sprintf(`Rentang tanggal bertumpuk dengan periode "%s".`, p.Nama)
				break
			}
		}
	}

	return errs
}

func (s *SistemService) GetPeriode() (domain.DaftarPeriodeResponse, error) {
	rows, err := s.repo.FindAllPeriode()
	if err != nil {
		return domain.DaftarPeriodeResponse{}, err
	}

	sekarang := formatTanggalHariIni(time.Now())
	items := make([]domain.PeriodeResponse, 0, len(rows))
	for _, r := range rows {
		items = append(items, kePeriodeResponse(r, sekarang))
	}

	tertinggal, err := s.repo.GetInstansiTertinggal()
	if err != nil {
		tertinggal = []domain.InstansiTertinggalDTO{}
	}

	return domain.DaftarPeriodeResponse{
		Items:      items,
		Tertinggal: tertinggal,
	}, nil
}

func (s *SistemService) BuatPeriode(role string, in domain.PeriodeInput) (*domain.PeriodeResponse, error) {
	semua, err := s.repo.FindAllPeriode()
	if err != nil {
		return nil, err
	}

	sekarang := formatTanggalHariIni(time.Now())
	if errs := validasiInputPeriode(in, semua, sekarang); len(errs) > 0 {
		return nil, &ValidationError{Errors: errs}
	}

	user, _ := s.repo.FindUserByRole(role)
	dibuatOleh := "Derto"
	var uid *uint
	if user != nil {
		dibuatOleh = user.Nama
		u := user.ID
		uid = &u
	}

	row := &domain.PeriodePembaruan{
		Nama:         strings.TrimSpace(in.Nama),
		TanggalMulai: in.TanggalMulai,
		Tenggat:      in.Tenggat,
		DibuatOleh:   dibuatOleh,
	}

	if err := s.repo.CreatePeriode(row); err != nil {
		return nil, err
	}

	s.CatatAktivitas(uid, domain.AksiPeriode, "Membuat periode pembaruan "+row.Nama, domain.HasilBerhasil)
	res := kePeriodeResponse(*row, sekarang)
	return &res, nil
}

func (s *SistemService) UbahPeriode(id uint, role string, in domain.PeriodeInput) (*domain.PeriodeResponse, error) {
	existing, err := s.repo.FindPeriodeByID(id)
	if err != nil {
		return nil, ErrPeriodeTidakDitemukan
	}

	sekarang := formatTanggalHariIni(time.Now())
	if hitungStatusPeriode(existing.TanggalMulai, existing.Tenggat, sekarang) == domain.StatusPeriodeSelesai {
		return nil, &SistemKonflikError{Pesan: "Periode yang sudah selesai tidak dapat diubah."}
	}

	semua, err := s.repo.FindAllPeriode()
	if err != nil {
		return nil, err
	}
	lain := make([]domain.PeriodePembaruan, 0, len(semua))
	for _, p := range semua {
		if p.ID != id {
			lain = append(lain, p)
		}
	}

	if errs := validasiInputPeriode(in, lain, sekarang); len(errs) > 0 {
		return nil, &ValidationError{Errors: errs}
	}

	existing.Nama = strings.TrimSpace(in.Nama)
	existing.TanggalMulai = in.TanggalMulai
	existing.Tenggat = in.Tenggat

	if err := s.repo.UpdatePeriode(existing); err != nil {
		return nil, err
	}

	user, _ := s.repo.FindUserByRole(role)
	var uid *uint
	if user != nil {
		u := user.ID
		uid = &u
	}
	s.CatatAktivitas(uid, domain.AksiPeriode, "Mengubah periode pembaruan "+existing.Nama, domain.HasilBerhasil)

	res := kePeriodeResponse(*existing, sekarang)
	return &res, nil
}

func (s *SistemService) HapusPeriode(id uint, role string) error {
	existing, err := s.repo.FindPeriodeByID(id)
	if err != nil {
		return ErrPeriodeTidakDitemukan
	}

	sekarang := formatTanggalHariIni(time.Now())
	if hitungStatusPeriode(existing.TanggalMulai, existing.Tenggat, sekarang) == domain.StatusPeriodeSelesai {
		return &SistemKonflikError{Pesan: "Periode yang sudah selesai tidak dapat dihapus."}
	}

	if err := s.repo.DeletePeriode(id); err != nil {
		return err
	}

	user, _ := s.repo.FindUserByRole(role)
	var uid *uint
	if user != nil {
		u := user.ID
		uid = &u
	}
	s.CatatAktivitas(uid, domain.AksiPeriode, "Menghapus periode pembaruan "+existing.Nama, domain.HasilBerhasil)
	return nil
}

// ---- 4. Kritik & Saran ----

func (s *SistemService) KirimKritik(in domain.KritikInput) error {
	nama := strings.TrimSpace(in.Nama)
	email := strings.TrimSpace(in.Email)
	pesan := strings.TrimSpace(in.Pesan)

	errs := make(map[string]string)
	if p := utf8.RuneCountInString(nama); p < 2 || p > 100 {
		errs["nama"] = "Nama harus 2–100 karakter."
	}
	if !polaEmailSederhana.MatchString(email) {
		errs["email"] = "Format email tidak valid."
	}
	if p := utf8.RuneCountInString(pesan); p < 10 || p > 1000 {
		errs["pesan"] = "Pesan harus 10–1000 karakter."
	}
	if len(errs) > 0 {
		return &ValidationError{Errors: errs}
	}

	row := &domain.KritikSaran{
		Nama:       nama,
		Email:      email,
		Pesan:      pesan,
		DibuatPada: time.Now(),
	}
	return s.repo.CreateKritik(row)
}

func (s *SistemService) ListKritik() ([]domain.KritikSaran, error) {
	return s.repo.FindAllKritik()
}

