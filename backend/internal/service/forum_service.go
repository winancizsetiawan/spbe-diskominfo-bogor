package service

import (
	"errors"
	"fmt"
	"math"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"spbe-backend/internal/auth"
	"spbe-backend/internal/domain"
	"spbe-backend/internal/repository"
)

var (
	ErrThreadTidakDitemukan  = errors.New("Thread tidak ditemukan.")
	ErrBalasanTidakDitemukan = errors.New("Balasan tidak ditemukan.")
	ErrKontenTidakDitemukan  = errors.New("Konten yang dilaporkan tidak ditemukan.")
	ErrModerasiTargetKosong  = errors.New("Konten tidak ditemukan.")
	ErrForumBukanPenerima    = errors.New("Thread ini ditujukan kepada pengguna tertentu. Anda hanya dapat membaca diskusinya.")
	ErrForumBukanPembuat     = errors.New("Hanya pembuat thread atau Super Admin yang dapat mengubah penugasan.")
)

const (
	MaksPenerimaThread = 5
	MaksLampiranPost   = 5
	urlLampiranForum   = "/api/forum/lampiran/"
)

// polaNamaLampiran: nama tersimpan selalu 32 hex acak + ekstensi yang diizinkan.
var polaNamaLampiran = regexp.MustCompile(`^[a-f0-9]{32}\.(png|jpg|webp|pdf)$`)

// NamaLampiranSah memeriksa bentuk nama berkas lampiran (dipakai juga oleh handler unduh).
func NamaLampiranSah(nama string) bool { return polaNamaLampiran.MatchString(nama) }

func keLampiranDTO(list []domain.ForumLampiran) []domain.LampiranDTO {
	out := make([]domain.LampiranDTO, 0, len(list))
	for _, l := range list {
		out = append(out, domain.LampiranDTO{
			ID: l.NamaBerkas, Nama: l.NamaAsli, Tipe: l.Tipe, Ukuran: l.Ukuran, Url: urlLampiranForum + l.NamaBerkas,
		})
	}
	return out
}

func penerimaDTO(t domain.ForumThread) []domain.PenggunaForum {
	out := make([]domain.PenggunaForum, 0, len(t.Penerima))
	for _, p := range t.Penerima {
		pf := penulisDariUser(p.User)
		out = append(out, domain.PenggunaForum{ID: p.UserID, Nama: pf.Nama, Instansi: pf.Instansi})
	}
	return out
}

func ringkasThread(t domain.ForumThread, jumlahBalasan int) domain.ThreadRingkas {
	return domain.ThreadRingkas{
		ID:            t.ID,
		Judul:         t.Judul,
		Kategori:      t.Kategori,
		Penulis:       penulisDariUser(t.PenulisUser),
		DibuatPada:    t.DibuatPada,
		JumlahBalasan: jumlahBalasan,
		Dilihat:       t.Dilihat,
		Status:        t.Status,
		Penerima:      penerimaDTO(t),
	}
}

// bolehMembalas: thread tanpa penerima terbuka untuk semua; bila ada penerima, hanya penerima dan pembuat.
func bolehMembalas(t domain.ForumThread, userID uint) bool {
	if len(t.Penerima) == 0 || t.PenulisID == userID {
		return true
	}
	for _, p := range t.Penerima {
		if p.UserID == userID {
			return true
		}
	}
	return false
}

// rapikanPenerima membuang duplikat dan pembuat thread sendiri, lalu memastikan semuanya pengguna aktif.
func (s *ForumService) rapikanPenerima(ids []uint, penulisID uint) ([]uint, error) {
	sudah := map[uint]bool{}
	out := make([]uint, 0, len(ids))
	for _, id := range ids {
		if id == 0 || id == penulisID || sudah[id] {
			continue
		}
		sudah[id] = true
		out = append(out, id)
	}
	if len(out) > MaksPenerimaThread {
		return nil, &ValidationError{Errors: map[string]string{"penerima": fmt.Sprintf("Maksimal %d penerima.", MaksPenerimaThread)}}
	}
	if len(out) > 0 && s.repo.HitungPenggunaAktif(out) != int64(len(out)) {
		return nil, &ValidationError{Errors: map[string]string{"penerima": "Penerima tidak ditemukan atau tidak aktif."}}
	}
	return out, nil
}

func cekNamaLampiran(nama []string) error {
	if len(nama) > MaksLampiranPost {
		return &ValidationError{Errors: map[string]string{"lampiran": fmt.Sprintf("Maksimal %d lampiran.", MaksLampiranPost)}}
	}
	sudah := map[string]bool{}
	for _, n := range nama {
		if !polaNamaLampiran.MatchString(n) || sudah[n] {
			return &ValidationError{Errors: map[string]string{"lampiran": "Lampiran tidak valid."}}
		}
		sudah[n] = true
	}
	return nil
}

func galatLampiran(err error) error {
	if errors.Is(err, repository.ErrLampiranTidakValid) {
		return &ValidationError{Errors: map[string]string{"lampiran": "Lampiran tidak valid atau sudah dipakai. Unggah ulang berkasnya."}}
	}
	return err
}

type ForumKonflikError struct {
	Pesan string
}

func (e *ForumKonflikError) Error() string {
	return e.Pesan
}

type ForumService struct {
	repo *repository.ForumRepository
}

func NewForumService(repo *repository.ForumRepository) *ForumService {
	return &ForumService{repo: repo}
}

func penulisDariUser(u domain.User) domain.PenulisForum {
	instansiNama := "Pemerintah Kota Bogor"
	if u.Instansi.Nama != "" {
		instansiNama = u.Instansi.Nama
	}
	nama := u.Nama
	if nama == "" {
		nama = "Pengguna SPBE"
	}
	return domain.PenulisForum{
		Nama:     nama,
		Instansi: instansiNama,
	}
}

func panjangRuneTrim(s string) int {
	return utf8.RuneCountInString(strings.TrimSpace(s))
}

func (s *ForumService) ambilUserAktif(role string) (*domain.User, error) {
	if role == "" {
		role = string(domain.RoleASN)
	}
	u, err := s.repo.FindUserByRole(role)
	if err != nil {
		// Fallback ke user pertama jika role spesifik tidak ditemukan
		// Pengguna dengan email tidak boleh digantikan pengguna lain; cadangan ke ASN hanya untuk mode demo.
		if _, email := auth.Pisah(role); email != "" {
			return nil, err
		}
		return s.repo.FindUserByRole(string(domain.RoleASN))
	}
	return u, nil
}

func (s *ForumService) GetKategori() ([]domain.KategoriForum, error) {
	return s.repo.FindAllKategori()
}

func (s *ForumService) ListThread(f domain.ThreadFilter) (domain.PagedResponse[domain.ThreadRingkas], error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PerPage < 1 {
		f.PerPage = 5
	}

	threads, total, err := s.repo.FindAllThreads(f)
	if err != nil {
		return domain.PagedResponse[domain.ThreadRingkas]{}, err
	}

	threadIDs := make([]uint, 0, len(threads))
	for _, t := range threads {
		threadIDs = append(threadIDs, t.ID)
	}
	jumlahMap, _ := s.repo.CountBalasanByThreadIDs(threadIDs)

	items := make([]domain.ThreadRingkas, 0, len(threads))
	for _, t := range threads {
		items = append(items, ringkasThread(t, jumlahMap[t.ID]))
	}

	totalPages := int(math.Ceil(float64(total) / float64(f.PerPage)))
	if totalPages < 1 {
		totalPages = 1
	}

	return domain.PagedResponse[domain.ThreadRingkas]{
		Items:      items,
		Page:       f.Page,
		TotalPages: totalPages,
		Total:      int(total),
	}, nil
}

func (s *ForumService) BuatThread(role string, in domain.BuatThreadInput) (*domain.ThreadDetailResponse, error) {
	errs := make(map[string]string)

	if in.IdKategori == 0 || !s.repo.ExistsKategori(in.IdKategori) {
		errs["idKategori"] = "Kategori tidak valid."
	}
	if p := panjangRuneTrim(in.Judul); p < 10 || p > 150 {
		errs["judul"] = "Judul harus 10–150 karakter."
	}
	if p := panjangRuneTrim(in.Konten); p < 20 || p > 5000 {
		errs["konten"] = "Isi harus 20–5000 karakter."
	}
	if err := cekNamaLampiran(in.Lampiran); err != nil {
		var v *ValidationError
		if errors.As(err, &v) {
			for k, m := range v.Errors {
				errs[k] = m
			}
		}
	}
	if len(errs) > 0 {
		return nil, &ValidationError{Errors: errs}
	}

	user, err := s.ambilUserAktif(role)
	if err != nil {
		return nil, err
	}
	penerima, err := s.rapikanPenerima(in.Penerima, user.ID)
	if err != nil {
		return nil, err
	}

	baru := &domain.ForumThread{
		IdKategori: in.IdKategori,
		Judul:      strings.TrimSpace(in.Judul),
		Konten:     strings.TrimSpace(in.Konten),
		PenulisID:  user.ID,
		Dilihat:    0,
		Status:     domain.StatusThreadAktif,
		DibuatPada: time.Now(),
	}

	if err := s.repo.BuatThreadLengkap(baru, penerima, in.Lampiran); err != nil {
		return nil, galatLampiran(err)
	}

	s.repo.KirimNotifikasi(penerima, user.ID, "Anda ditugaskan menjawab diskusi", baru.Judul, fmt.Sprintf("/forum/%d", baru.ID))

	lampiran, _ := s.repo.FindLampiranThread(baru.ID)
	return &domain.ThreadDetailResponse{
		ThreadRingkas:  ringkasThread(*baru, 0),
		Konten:         baru.Konten,
		Lampiran:       keLampiranDTO(lampiran),
		Balasan:        []domain.BalasanResponse{},
		BisaMembalas:   true,
		BisaMenugaskan: true,
	}, nil
}

// UbahPenerima mengganti penugasan thread. Hanya pembuat thread atau Super Admin; thread harus aktif.
func (s *ForumService) UbahPenerima(threadID uint, role string, in domain.UbahPenerimaInput) ([]domain.PenggunaForum, error) {
	t, err := s.repo.FindThreadByID(threadID, false)
	if err != nil {
		return nil, ErrThreadTidakDitemukan
	}
	user, err := s.ambilUserAktif(role)
	if err != nil {
		return nil, err
	}
	if t.PenulisID != user.ID && auth.PeranDari(role) != string(domain.RoleSuperAdmin) {
		return nil, ErrForumBukanPembuat
	}
	if t.Status != domain.StatusThreadAktif {
		return nil, &ForumKonflikError{Pesan: "Thread sudah dikunci."}
	}
	penerima, err := s.rapikanPenerima(in.Penerima, t.PenulisID)
	if err != nil {
		return nil, err
	}
	lama := map[uint]bool{}
	for _, p := range t.Penerima {
		lama[p.UserID] = true
	}
	if err := s.repo.GantiPenerima(t.ID, penerima); err != nil {
		return nil, err
	}
	baru := make([]uint, 0)
	for _, id := range penerima {
		if !lama[id] {
			baru = append(baru, id)
		}
	}
	s.repo.KirimNotifikasi(baru, user.ID, "Anda ditugaskan menjawab diskusi", t.Judul, fmt.Sprintf("/forum/%d", t.ID))

	t2, err := s.repo.FindThreadByID(t.ID, false)
	if err != nil {
		return nil, err
	}
	return penerimaDTO(*t2), nil
}

// CariPengguna mengembalikan pengguna aktif (selain diri sendiri) untuk dipilih sebagai penerima.
func (s *ForumService) CariPengguna(role, q string) ([]domain.PenggunaForum, error) {
	user, err := s.ambilUserAktif(role)
	if err != nil {
		return nil, err
	}
	list, err := s.repo.CariPenggunaAktif(q, user.ID, 10)
	if err != nil {
		return nil, err
	}
	out := make([]domain.PenggunaForum, 0, len(list))
	for _, u := range list {
		pf := penulisDariUser(u)
		out = append(out, domain.PenggunaForum{ID: u.ID, Nama: pf.Nama, Instansi: pf.Instansi})
	}
	return out, nil
}

// CatatLampiran mencatat berkas yang sudah disimpan handler. Berkas belum tertaut ke thread/balasan.
func (s *ForumService) CatatLampiran(role, namaBerkas, namaAsli, tipe string, ukuran int64) (*domain.LampiranDTO, error) {
	user, err := s.ambilUserAktif(role)
	if err != nil {
		return nil, err
	}
	l := &domain.ForumLampiran{
		NamaBerkas: namaBerkas, NamaAsli: namaAsli, Tipe: tipe, Ukuran: ukuran, PengunggahID: user.ID,
	}
	if err := s.repo.CreateLampiran(l); err != nil {
		return nil, err
	}
	dto := keLampiranDTO([]domain.ForumLampiran{*l})[0]
	return &dto, nil
}

// LampiranAda memastikan berkas tercatat; dipakai sebelum berkas dikirim ke klien.
func (s *ForumService) LampiranAda(nama string) (*domain.ForumLampiran, error) {
	return s.repo.FindLampiranByNama(nama)
}

func (s *ForumService) GetThreadDetail(id uint, role string) (*domain.ThreadDetailResponse, error) {
	t, err := s.repo.FindThreadByID(id, false)
	if err != nil {
		return nil, ErrThreadTidakDitemukan
	}

	_ = s.repo.IncrementDilihat(id)
	t.Dilihat += 1

	user, _ := s.ambilUserAktif(role)
	var currentUserID uint
	if user != nil {
		currentUserID = user.ID
	}

	balasanRows, err := s.repo.FindBalasanByThreadID(id)
	if err != nil {
		return nil, err
	}

	idBalasan := make([]uint, 0, len(balasanRows))
	for _, b := range balasanRows {
		idBalasan = append(idBalasan, b.ID)
	}
	lampiranBalasan := map[uint][]domain.ForumLampiran{}
	if rows, err := s.repo.FindLampiranBalasan(idBalasan); err == nil {
		for _, l := range rows {
			lampiranBalasan[*l.BalasanID] = append(lampiranBalasan[*l.BalasanID], l)
		}
	}
	lampiranThread, _ := s.repo.FindLampiranThread(t.ID)

	balasanDTO := make([]domain.BalasanResponse, 0, len(balasanRows))
	for _, b := range balasanRows {
		sudah := false
		for _, n := range b.Penilai {
			if n.UserID == currentUserID {
				sudah = true
				break
			}
		}
		balasanDTO = append(balasanDTO, domain.BalasanResponse{
			ID:           b.ID,
			Konten:       b.Konten,
			Penulis:      penulisDariUser(b.PenulisUser),
			DibuatPada:   b.DibuatPada,
			JumlahNilai:  len(b.Penilai),
			SudahDinilai: sudah,
			Lampiran:     keLampiranDTO(lampiranBalasan[b.ID]),
		})
	}

	return &domain.ThreadDetailResponse{
		ThreadRingkas:  ringkasThread(*t, len(balasanDTO)),
		Konten:         t.Konten,
		Lampiran:       keLampiranDTO(lampiranThread),
		Balasan:        balasanDTO,
		BisaMembalas:   user != nil && bolehMembalas(*t, user.ID),
		BisaMenugaskan: user != nil && (t.PenulisID == user.ID || auth.PeranDari(role) == string(domain.RoleSuperAdmin)),
	}, nil
}

func (s *ForumService) BuatBalasan(threadID uint, role string, in domain.BuatBalasanInput) (*domain.BalasanResponse, error) {
	t, err := s.repo.FindThreadByID(threadID, false)
	if err != nil {
		return nil, ErrThreadTidakDitemukan
	}
	if t.Status != domain.StatusThreadAktif {
		return nil, &ForumKonflikError{Pesan: "Thread sudah dikunci."}
	}

	// Balasan boleh tanpa teks bila ada lampiran.
	if p := panjangRuneTrim(in.Konten); p > 3000 || (p == 0 && len(in.Lampiran) == 0) {
		return nil, &ValidationError{Errors: map[string]string{
			"konten": "Balasan harus 1–3000 karakter.",
		}}
	}
	if err := cekNamaLampiran(in.Lampiran); err != nil {
		return nil, err
	}

	user, err := s.ambilUserAktif(role)
	if err != nil {
		return nil, err
	}
	if !bolehMembalas(*t, user.ID) {
		return nil, ErrForumBukanPenerima
	}

	row := &domain.ForumBalasan{
		ThreadID:    t.ID,
		Konten:      strings.TrimSpace(in.Konten),
		PenulisID:   user.ID,
		Tersembunyi: false,
		DibuatPada:  time.Now(),
	}

	if err := s.repo.BuatBalasanLengkap(row, in.Lampiran); err != nil {
		return nil, galatLampiran(err)
	}

	// Pembuat thread dan penerima tugas diberi tahu (kecuali pelaku sendiri).
	tujuan := []uint{t.PenulisID}
	for _, p := range t.Penerima {
		tujuan = append(tujuan, p.UserID)
	}
	s.repo.KirimNotifikasi(tujuan, user.ID, "Balasan baru di diskusi", t.Judul, fmt.Sprintf("/forum/%d", t.ID))

	lampiran, _ := s.repo.FindLampiranBalasan([]uint{row.ID})
	return &domain.BalasanResponse{
		ID:           row.ID,
		Konten:       row.Konten,
		Penulis:      penulisDariUser(row.PenulisUser),
		DibuatPada:   row.DibuatPada,
		JumlahNilai:  0,
		SudahDinilai: false,
		Lampiran:     keLampiranDTO(lampiran),
	}, nil
}

func (s *ForumService) ToggleNilaiBalasan(balasanID uint, role string) (*domain.NilaiBalasanResponse, error) {
	b, err := s.repo.FindBalasanByID(balasanID, false)
	if err != nil {
		return nil, ErrBalasanTidakDitemukan
	}

	t, err := s.repo.FindThreadByID(b.ThreadID, false)
	if err != nil || t.Status != domain.StatusThreadAktif {
		return nil, &ForumKonflikError{Pesan: "Thread sudah dikunci."}
	}

	user, err := s.ambilUserAktif(role)
	if err != nil {
		return nil, err
	}
	if !bolehMembalas(*t, user.ID) {
		return nil, ErrForumBukanPenerima
	}

	jumlah, sudah, err := s.repo.ToggleNilaiBalasan(balasanID, user.ID)
	if err != nil {
		return nil, err
	}

	return &domain.NilaiBalasanResponse{
		JumlahNilai:  jumlah,
		SudahDinilai: sudah,
	}, nil
}

func (s *ForumService) BuatLaporan(role string, in domain.LaporanInput) error {
	if p := panjangRuneTrim(in.Alasan); p < 10 || p > 500 {
		return &ValidationError{Errors: map[string]string{
			"alasan": "Alasan harus 10–500 karakter.",
		}}
	}

	switch in.TargetTipe {
	case domain.TargetThread:
		if _, err := s.repo.FindThreadByID(in.TargetID, false); err != nil {
			return ErrKontenTidakDitemukan
		}
	case domain.TargetBalasan:
		if _, err := s.repo.FindBalasanByID(in.TargetID, false); err != nil {
			return ErrKontenTidakDitemukan
		}
	default:
		return ErrKontenTidakDitemukan
	}

	user, err := s.ambilUserAktif(role)
	if err != nil {
		return err
	}

	if s.repo.HasOpenLaporan(in.TargetTipe, in.TargetID, user.ID) {
		return &ForumKonflikError{Pesan: "Anda sudah melaporkan konten ini dan laporan Anda sedang ditinjau."}
	}

	lap := &domain.ForumLaporan{
		TargetTipe: in.TargetTipe,
		TargetID:   in.TargetID,
		PelaporID:  user.ID,
		Pelapor:    user.Nama,
		Alasan:     strings.TrimSpace(in.Alasan),
		Status:     domain.StatusLaporanBaru,
		DibuatPada: time.Now(),
	}

	return s.repo.CreateLaporan(lap)
}

// --- Logika Moderasi Konten (Super Admin) ---

func konversiLaporanDTO(list []domain.ForumLaporan) ([]domain.LaporanItemDTO, int) {
	dto := make([]domain.LaporanItemDTO, 0, len(list))
	baru := 0
	for _, l := range list {
		if l.Status == domain.StatusLaporanBaru {
			baru++
		}
		dto = append(dto, domain.LaporanItemDTO{
			ID:         l.ID,
			Pelapor:    l.Pelapor,
			Alasan:     l.Alasan,
			DibuatPada: l.DibuatPada,
			Status:     l.Status,
		})
	}
	return dto, baru
}

func buatItemModerasiThread(t domain.ForumThread, lapList []domain.ForumLaporan) domain.ItemModerasi {
	dto, baru := konversiLaporanDTO(lapList)
	katNama := "—"
	if t.Kategori.Nama != "" {
		katNama = t.Kategori.Nama
	}
	return domain.ItemModerasi{
		TargetTipe:  domain.TargetThread,
		TargetID:    t.ID,
		ThreadID:    t.ID,
		JudulThread: t.Judul,
		Kategori:    katNama,
		Konten:      t.Konten,
		Penulis:     penulisDariUser(t.PenulisUser),
		DibuatPada:  t.DibuatPada,
		Status:      t.Status,
		Laporan:     dto,
		LaporanBaru: baru,
	}
}

func buatItemModerasiBalasan(b domain.ForumBalasan, lapList []domain.ForumLaporan) domain.ItemModerasi {
	dto, baru := konversiLaporanDTO(lapList)
	katNama := "—"
	if b.Thread.Kategori.Nama != "" {
		katNama = b.Thread.Kategori.Nama
	}
	status := domain.StatusThreadAktif
	if b.Tersembunyi {
		status = domain.StatusThreadTersembunyi
	}
	return domain.ItemModerasi{
		TargetTipe:  domain.TargetBalasan,
		TargetID:    b.ID,
		ThreadID:    b.ThreadID,
		JudulThread: b.Thread.Judul,
		Kategori:    katNama,
		Konten:      b.Konten,
		Penulis:     penulisDariUser(b.PenulisUser),
		DibuatPada:  b.DibuatPada,
		Status:      status,
		Laporan:     dto,
		LaporanBaru: baru,
	}
}

func masukTabModerasi(item domain.ItemModerasi, tab domain.TabModerasi) bool {
	switch tab {
	case domain.TabModerasiSemua:
		return true
	case domain.TabModerasiSelesai:
		return len(item.Laporan) > 0 && item.LaporanBaru == 0
	default: // dilaporkan
		return item.LaporanBaru > 0
	}
}

func waktuLaporanBaruTerlama(item domain.ItemModerasi) time.Time {
	var terlama time.Time
	for _, l := range item.Laporan {
		if l.Status == domain.StatusLaporanBaru {
			if terlama.IsZero() || l.DibuatPada.Before(terlama) {
				terlama = l.DibuatPada
			}
		}
	}
	return terlama
}

func (s *ForumService) ListModerasi(f domain.ModerasiFilter) (domain.DaftarModerasiResponse, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PerPage < 1 {
		f.PerPage = 5
	}
	if f.Tab != domain.TabModerasiSemua && f.Tab != domain.TabModerasiSelesai {
		f.Tab = domain.TabModerasiDilaporkan
	}

	threads, balasan, laporan, err := s.repo.FindAllDataModerasi()
	if err != nil {
		return domain.DaftarModerasiResponse{}, err
	}

	lapThreadMap := make(map[uint][]domain.ForumLaporan)
	lapBalasanMap := make(map[uint][]domain.ForumLaporan)
	for _, l := range laporan {
		if l.TargetTipe == domain.TargetThread {
			lapThreadMap[l.TargetID] = append(lapThreadMap[l.TargetID], l)
		} else {
			lapBalasanMap[l.TargetID] = append(lapBalasanMap[l.TargetID], l)
		}
	}

	semua := make([]domain.ItemModerasi, 0, len(threads)+len(balasan))
	for _, t := range threads {
		semua = append(semua, buatItemModerasiThread(t, lapThreadMap[t.ID]))
	}
	for _, b := range balasan {
		if len(lapBalasanMap[b.ID]) > 0 {
			semua = append(semua, buatItemModerasiBalasan(b, lapBalasanMap[b.ID]))
		}
	}

	hitungan := domain.HitunganModerasi{Semua: len(semua)}
	for _, item := range semua {
		if masukTabModerasi(item, domain.TabModerasiDilaporkan) {
			hitungan.Dilaporkan++
		}
		if masukTabModerasi(item, domain.TabModerasiSelesai) {
			hitungan.Selesai++
		}
	}

	q := strings.ToLower(strings.TrimSpace(f.Query))
	cocok := make([]domain.ItemModerasi, 0)
	for _, item := range semua {
		if !masukTabModerasi(item, f.Tab) {
			continue
		}
		if q != "" {
			if !strings.Contains(strings.ToLower(item.JudulThread), q) &&
				!strings.Contains(strings.ToLower(item.Penulis.Nama), q) &&
				!strings.Contains(strings.ToLower(item.Konten), q) {
				continue
			}
		}
		cocok = append(cocok, item)
	}

	sort.SliceStable(cocok, func(i, j int) bool {
		if f.Tab == domain.TabModerasiDilaporkan {
			ti := waktuLaporanBaruTerlama(cocok[i])
			tj := waktuLaporanBaruTerlama(cocok[j])
			return ti.Before(tj)
		}
		return cocok[i].DibuatPada.After(cocok[j].DibuatPada)
	})

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

	return domain.DaftarModerasiResponse{
		Items:      cocok[start:end],
		Page:       f.Page,
		TotalPages: totalPages,
		Total:      total,
		Hitungan:   hitungan,
	}, nil
}

func (s *ForumService) TindakanModerasi(in domain.TindakanModerasiInput) (*domain.ItemModerasi, error) {
	if (in.TargetTipe != domain.TargetThread && in.TargetTipe != domain.TargetBalasan) || in.TargetID == 0 {
		return nil, &ValidationError{Errors: map[string]string{"targetTipe": "Target tidak valid."}}
	}
	if in.Tindakan != domain.TindakanAbaikan && in.Tindakan != domain.TindakanKunci && in.Tindakan != domain.TindakanSembunyikan {
		return nil, &ValidationError{Errors: map[string]string{"tindakan": "Tindakan tidak valid."}}
	}
	if in.Tindakan == domain.TindakanKunci && in.TargetTipe != domain.TargetThread {
		return nil, &ValidationError{Errors: map[string]string{"tindakan": "Hanya thread yang dapat dikunci."}}
	}

	var threadTarget *domain.ForumThread
	var balasanTarget *domain.ForumBalasan
	var err error

	if in.TargetTipe == domain.TargetThread {
		threadTarget, err = s.repo.FindThreadByID(in.TargetID, true)
		if err != nil {
			return nil, ErrModerasiTargetKosong
		}
	} else {
		balasanTarget, err = s.repo.FindBalasanByID(in.TargetID, true)
		if err != nil {
			return nil, ErrModerasiTargetKosong
		}
	}

	if in.Tindakan == domain.TindakanKunci || in.Tindakan == domain.TindakanSembunyikan {
		if p := panjangRuneTrim(in.Alasan); p < 10 || p > 500 {
			return nil, &ValidationError{Errors: map[string]string{
				"alasan": "Alasan harus 10–500 karakter.",
			}}
		}
	}

	jumlahLaporanBaru := s.repo.CountOpenLaporanForTarget(in.TargetTipe, in.TargetID)
	tersembunyi := false
	if threadTarget != nil {
		tersembunyi = threadTarget.Status == domain.StatusThreadTersembunyi
	} else if balasanTarget != nil {
		tersembunyi = balasanTarget.Tersembunyi
	}

	if in.Tindakan == domain.TindakanAbaikan && jumlahLaporanBaru == 0 {
		return nil, &ForumKonflikError{Pesan: "Tidak ada laporan yang menunggu untuk item ini."}
	}
	if in.Tindakan == domain.TindakanKunci && threadTarget != nil && threadTarget.Status != domain.StatusThreadAktif {
		return nil, &ForumKonflikError{Pesan: "Thread ini sudah dikunci atau disembunyikan."}
	}
	if in.Tindakan == domain.TindakanSembunyikan && tersembunyi {
		return nil, &ForumKonflikError{Pesan: "Konten ini sudah disembunyikan."}
	}

	if err := s.repo.EksekusiModerasi(in.TargetTipe, in.TargetID, in.Tindakan); err != nil {
		return nil, err
	}

	lapTerbaru, _ := s.repo.FindLaporanByTarget(in.TargetTipe, in.TargetID)
	if in.TargetTipe == domain.TargetThread {
		tUpdated, _ := s.repo.FindThreadByID(in.TargetID, true)
		res := buatItemModerasiThread(*tUpdated, lapTerbaru)
		return &res, nil
	}

	bUpdated, _ := s.repo.FindBalasanByID(in.TargetID, true)
	res := buatItemModerasiBalasan(*bUpdated, lapTerbaru)
	return &res, nil
}

