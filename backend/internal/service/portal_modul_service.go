package service

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"net/url"
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
	ErrArtikelTidakDitemukan  = errors.New("Artikel tidak ditemukan.")
	ErrArtikelTidakValid      = errors.New("Data artikel tidak valid.")
	ErrArtikelButuhLogin      = errors.New("Masuk untuk membaca tulisan ini.")
	ErrInstansiTidakDitemukan = errors.New("Instansi tidak ditemukan.")
	ErrJenisDasborTidakValid  = errors.New("Jenis dasbor tidak dikenal.")

	polaKataKunci = regexp.MustCompile(`[a-z0-9]+`)

	sinonimCari = map[string][]string{
		"backup":     {"cadangan", "pemulihan"},
		"cadangan":   {"backup", "pemulihan"},
		"keamanan":   {"siber", "bssn", "iso"},
		"siber":      {"keamanan"},
		"arsitektur": {"raa", "domain"},
		"aplikasi":   {"sistem"},
		"integrasi":  {"splp", "interoperabilitas"},
		"data":       {"informasi"},
		"evaluasi":   {"indeks", "penilaian"},
		"regulasi":   {"peraturan", "perpres", "perwali"},
		"peraturan":  {"regulasi", "perpres"},
	}

	jenisDokLabel = map[domain.JenisDokumen]string{
		domain.JenisRegulasi:   "Regulasi",
		domain.JenisPedoman:    "Pedoman",
		domain.JenisLaporan:    "Laporan",
		domain.JenisPresentasi: "Presentasi",
		domain.JenisTemplate:   "Template",
		domain.JenisSOP:        "SOP",
		domain.JenisPanduan:    "Panduan",
		domain.JenisLainnya:    "Lainnya",
	}

	semuaTipeCari = []string{"semua", "dokumen", "sop", "forum", "berita", "bantuan", "kursus", "aplikasi", "flowchart"}
)

type PortalKonflikError struct {
	Pesan string
}

func (e *PortalKonflikError) Error() string {
	return e.Pesan
}

type PortalModulService struct {
	repo *repository.PortalModulRepository
}

func NewPortalModulService(repo *repository.PortalModulRepository) *PortalModulService {
	return &PortalModulService{repo: repo}
}

func (s *PortalModulService) ambilUser(role string) (*domain.User, error) {
	if role == "" {
		role = string(domain.RoleASN)
	}
	u, err := s.repo.FindUserByRole(role)
	if err != nil {
		// Pengguna dengan email tidak boleh digantikan pengguna lain; cadangan ke ASN hanya untuk mode demo.
		if _, email := auth.Pisah(role); email != "" {
			return nil, err
		}
		return s.repo.FindUserByRole(string(domain.RoleASN))
	}
	return u, nil
}

func hitungPersenBulat(pembilang, penyebut int) int {
	if penyebut <= 0 {
		return 0
	}
	return int(math.Round((float64(pembilang) / float64(penyebut)) * 100))
}

func statusRaaDariSkor(skor int) string {
	if skor >= 80 {
		return "sesuai"
	}
	if skor > 0 {
		return "perlu_penyesuaian"
	}
	return "belum"
}

// ---- 1. Konten (Berita, Artikel, & Bantuan) ----

func DataBantuanStatis() domain.BantuanResponse {
	return domain.BantuanResponse{
		FAQ: []domain.FAQItemDTO{
			{ID: 1, Pertanyaan: "Bagaimana cara mendapatkan akun?", Jawaban: "Akun dibuat lewat undangan oleh Super Admin. Anda akan menerima email untuk mengatur kata sandi."},
			{ID: 2, Pertanyaan: "Saya lupa kata sandi, apa yang harus dilakukan?", Jawaban: "Gunakan fitur lupa kata sandi di halaman masuk SSO. Kata sandi tidak dikelola di portal ini."},
			{ID: 3, Pertanyaan: "Siapa yang dapat mengunduh SOP?", Jawaban: "SOP hanya untuk pengguna internal yang sudah masuk."},
			{ID: 4, Pertanyaan: "Berapa ukuran maksimal berkas unggahan?", Jawaban: "Maksimal 10 MB per berkas, dengan tipe PDF, DOCX, atau XLSX."},
			{ID: 5, Pertanyaan: "Mengapa sesi saya berakhir sendiri?", Jawaban: "Demi keamanan, sesi berakhir otomatis setelah 15 menit tanpa aktivitas."},
		},
		Panduan: []domain.PanduanItemDTO{
			{ID: 1, Judul: "Memulai", Isi: "Masuk dengan akun SSO, lalu buka Beranda untuk melihat ringkasan sesuai peran Anda."},
			{ID: 2, Judul: "Mencari dokumen", Isi: "Gunakan menu Pencarian atau halaman Dokumen. Filter jenis membantu mempersempit hasil."},
			{ID: 3, Judul: "Berdiskusi di forum", Isi: "Buat thread pada kategori yang sesuai, balas, nilai balasan bermanfaat, dan laporkan konten yang tidak pantas."},
		},
		Video: []domain.VideoBantuanDTO{
			{ID: 1, Judul: "Pengenalan Portal SPBE", URL: "https://www.youtube.com/"},
			{ID: 2, Judul: "Mengajukan Validasi Data Aplikasi", URL: "https://www.youtube.com/"},
		},
	}
}

func (s *PortalModulService) ListArtikel(jenis string, page int, sudahLogin bool, peranOpt ...string) (domain.PagedResponse[domain.ArtikelRingkasDTO], error) {
	if page < 1 {
		page = 1
	}
	perPage := 6

	peran := ""
	if len(peranOpt) > 0 {
		peran = auth.PeranDari(peranOpt[0])
	}
	bolehLihatDraft := peran == string(domain.RoleSuperAdmin) || peran == string(domain.RoleVerifikator)

	rows, err := s.repo.FindAllArtikel(jenis, sudahLogin)
	if err != nil {
		return domain.PagedResponse[domain.ArtikelRingkasDTO]{}, err
	}

	semua := make([]domain.ArtikelRingkasDTO, 0, len(rows))
	for _, a := range rows {
		st := a.StatusVerifikasi
		if st == "" {
			st = domain.StatusArtikelTerbit
		}
		if !bolehLihatDraft && st != domain.StatusArtikelTerbit {
			continue
		}
		semua = append(semua, domain.ArtikelRingkasDTO{
			ID:                a.ID,
			Jenis:             a.Jenis,
			Judul:             a.Judul,
			Ringkasan:         a.Ringkasan,
			Penulis:           a.Penulis,
			Tanggal:           a.Tanggal,
			Views:             a.Views,
			Format:            a.Format,
			Kategori:          a.Kategori,
			Label:             append([]string{}, a.Label...),
			Unggulan:          a.Unggulan,
			StatusVerifikasi:  st,
			CatatanVerifikasi: a.CatatanVerifikasi,
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

	return domain.PagedResponse[domain.ArtikelRingkasDTO]{
		Items:      semua[start:end],
		Page:       page,
		TotalPages: totalPages,
		Total:      total,
	}, nil
}

func (s *PortalModulService) GetArtikelDetail(id uint, sudahLogin bool) (*domain.Artikel, error) {
	a, err := s.repo.FindArtikelByID(id)
	if err != nil {
		return nil, ErrArtikelTidakDitemukan
	}
	if a.StatusAkses == domain.AksesInternal && !sudahLogin {
		return nil, ErrArtikelButuhLogin
	}
	_ = s.repo.IncrementArtikelViews(id)
	a.Views += 1
	return a, nil
}

// ---- 2. Beranda ----

func (s *PortalModulService) notifikasiTerbaruUser(userID uint) ([]domain.NotifikasiDTO, int) {
	rows, _ := s.repo.FindNotifikasiUser(userID)
	belum := 0
	for _, n := range rows {
		if !n.SudahDibaca {
			belum++
		}
	}
	limit := 3
	if len(rows) < limit {
		limit = len(rows)
	}
	terbaru := make([]domain.NotifikasiDTO, 0, limit)
	for _, n := range rows[:limit] {
		terbaru = append(terbaru, domain.NotifikasiDTO{
			ID:          n.ID,
			Kategori:    n.Kategori,
			Judul:       n.Judul,
			Pesan:       n.Pesan,
			UrlTujuan:   n.UrlTujuan,
			SudahDibaca: n.SudahDibaca,
			DibuatPada:  n.DibuatPada,
		})
	}
	return terbaru, belum
}

func (s *PortalModulService) GetBerandaPublik() (domain.BerandaPublikResponse, error) {
	dokList, _ := s.repo.FindAllDokumen()
	instList, _ := s.repo.FindAllInstansi()
	threadList, _ := s.repo.FindAllThreads()

	publik := make([]domain.Dokumen, 0)
	sopBerlaku := 0
	for _, d := range dokList {
		if d.Status == domain.StatusDokBerlaku && d.Visibilitas == domain.VisibilitasPublik {
			publik = append(publik, d)
		}
		if d.Jenis == domain.JenisSOP && d.Status == domain.StatusDokBerlaku {
			sopBerlaku++
		}
	}

	diskusi := 0
	for _, t := range threadList {
		if t.Status == domain.StatusThreadAktif || t.Status == domain.StatusThreadTerkunci {
			diskusi++
		}
	}

	populer := make([]domain.Dokumen, len(publik))
	copy(populer, publik)
	sort.SliceStable(populer, func(i, j int) bool {
		return populer[i].JumlahUnduhan > populer[j].JumlahUnduhan
	})
	if len(populer) > 3 {
		populer = populer[:3]
	}

	return domain.BerandaPublikResponse{
		DokumenPublik:  len(publik),
		SopBerlaku:     sopBerlaku,
		Instansi:       len(instList),
		Diskusi:        diskusi,
		DokumenPopuler: populer,
	}, nil
}

func (s *PortalModulService) GetBeranda(role string) (interface{}, error) {
	u, err := s.ambilUser(role)
	if err != nil {
		return nil, err
	}

	if u.Role == domain.RoleSuperAdmin {
		return s.buatBerandaSuperAdmin(*u), nil
	}
	if u.Role == domain.RoleAdminOPD {
		return s.buatBerandaAdminOpd(*u), nil
	}
	return s.buatBerandaInternal(*u), nil
}

func (s *PortalModulService) buatBerandaInternal(u domain.User) domain.BerandaInternalResponse {
	dokList, _ := s.repo.FindAllDokumen()
	threadList, _ := s.repo.FindAllThreads()
	balasanList, _ := s.repo.FindAllBalasan()

	dokTerbaru := make([]domain.Dokumen, 0)
	for _, d := range dokList {
		if d.Status == domain.StatusDokBerlaku || d.Status == domain.StatusDokReview {
			dokTerbaru = append(dokTerbaru, d)
		}
	}
	if len(dokTerbaru) > 4 {
		dokTerbaru = dokTerbaru[:4]
	}

	jmlBalasanMap := make(map[uint]int)
	for _, b := range balasanList {
		if !b.Tersembunyi {
			jmlBalasanMap[b.ThreadID]++
		}
	}

	aktifThreads := make([]domain.ForumThread, 0)
	for _, t := range threadList {
		if t.Status != domain.StatusThreadTersembunyi {
			aktifThreads = append(aktifThreads, t)
		}
	}
	sort.SliceStable(aktifThreads, func(i, j int) bool {
		skorI := float64(jmlBalasanMap[aktifThreads[i].ID]*10) + float64(aktifThreads[i].Dilihat)/20.0
		skorJ := float64(jmlBalasanMap[aktifThreads[j].ID]*10) + float64(aktifThreads[j].Dilihat)/20.0
		return skorI > skorJ
	})
	if len(aktifThreads) > 3 {
		aktifThreads = aktifThreads[:3]
	}

	threadPopuler := make([]domain.ThreadRingkas, 0, len(aktifThreads))
	for _, t := range aktifThreads {
		threadPopuler = append(threadPopuler, domain.ThreadRingkas{
			ID:            t.ID,
			Judul:         t.Judul,
			Kategori:      t.Kategori,
			Penulis:       penulisDariUser(t.PenulisUser),
			DibuatPada:    t.DibuatPada,
			JumlahBalasan: jmlBalasanMap[t.ID],
			Dilihat:       t.Dilihat,
			Status:        t.Status,
		})
	}

	notif, belum := s.notifikasiTerbaruUser(u.ID)
	return domain.BerandaInternalResponse{
		Tipe:           "internal",
		DokumenTerbaru: dokTerbaru,
		ThreadPopuler:  threadPopuler,
		Notifikasi:     notif,
		BelumDibaca:    belum,
	}
}

func (s *PortalModulService) buatBerandaAdminOpd(u domain.User) domain.BerandaAdminOpdResponse {
	semuaApl, _ := s.repo.FindAllAplikasi()
	semuaAlur, _ := s.repo.FindAllFlowchart()

	apps := make([]domain.Aplikasi, 0)
	for _, a := range semuaApl {
		if a.InstansiID == u.Instansi.ID {
			apps = append(apps, a)
		}
	}
	alur := make([]domain.Flowchart, 0)
	for _, f := range semuaAlur {
		if f.InstansiID == u.Instansi.ID {
			alur = append(alur, f)
		}
	}

	var statusRaa domain.StatusRaaRingkasDTO
	sudahKlasifikasi := 0
	for _, a := range apps {
		if a.RaaLevel1 != nil && *a.RaaLevel1 != "" {
			sudahKlasifikasi++
		}
		st := statusRaaDariSkor(a.NilaiKesesuaian)
		switch st {
		case "sesuai":
			statusRaa.Sesuai++
		case "perlu_penyesuaian":
			statusRaa.PerluPenyesuaian++
		default:
			statusRaa.Belum++
		}
	}

	fcPublikasi := 0
	for _, f := range alur {
		if f.Status == domain.StatusDisetujui {
			fcPublikasi++
		}
	}

	sekarang := time.Now()
	tren := make([]domain.PembaruanMingguanDTO, 0, 8)
	for k := 0; k < 8; k++ {
		mulai := sekarang.Add(-time.Duration((8-k)*7*24) * time.Hour)
		akhir := mulai.Add(7 * 24 * time.Hour)
		aplCount := 0
		for _, a := range apps {
			if !a.DiperbaruiPada.Before(mulai) && a.DiperbaruiPada.Before(akhir) {
				aplCount++
			}
		}
		fcCount := 0
		for _, f := range alur {
			if !f.DiperbaruiPada.Before(mulai) && f.DiperbaruiPada.Before(akhir) {
				fcCount++
			}
		}
		tren = append(tren, domain.PembaruanMingguanDTO{
			Minggu:              mulai.UTC().Format(time.RFC3339),
			AplikasiDiperbarui:  aplCount,
			FlowchartDiperbarui: fcCount,
		})
	}

	aplTerbaru := make([]domain.Aplikasi, len(apps))
	copy(aplTerbaru, apps)
	if len(aplTerbaru) > 4 {
		aplTerbaru = aplTerbaru[:4]
	}

	kategoriList := []domain.KategoriProses{
		domain.KategoriUtama,
		domain.KategoriSub,
		domain.KategoriPendukung,
		domain.KategoriManajemen,
	}
	progresFc := make([]domain.ProgresFlowchartDTO, 0, len(kategoriList))
	for _, kat := range kategoriList {
		dipub := 0
		tot := 0
		for _, f := range alur {
			if f.Kategori == kat {
				tot++
				if f.Status == domain.StatusDisetujui {
					dipub++
				}
			}
		}
		progresFc = append(progresFc, domain.ProgresFlowchartDTO{
			Kategori:       kat,
			Dipublikasikan: dipub,
			Total:          tot,
		})
	}

	notif, belum := s.notifikasiTerbaruUser(u.ID)
	return domain.BerandaAdminOpdResponse{
		Tipe: "admin_opd",
		Instansi: domain.InstansiRingkas{
			ID:   u.Instansi.ID,
			Nama: u.Instansi.Nama,
		},
		Ringkasan: domain.RingkasanAdminOpdDTO{
			TotalAplikasi:           len(apps),
			SudahDiklasifikasi:      sudahKlasifikasi,
			FlowchartDipublikasikan: fcPublikasi,
			TotalFlowchart:          len(alur),
			KepatuhanRaa:            hitungPersenBulat(statusRaa.Sesuai, len(apps)),
		},
		StatusRaa:        statusRaa,
		Tren:             tren,
		AplikasiTerbaru:  aplTerbaru,
		ProgresFlowchart: progresFc,
		Notifikasi:       notif,
		BelumDibaca:      belum,
	}
}

func (s *PortalModulService) buatBerandaSuperAdmin(u domain.User) domain.BerandaSuperAdminResponse {
	users, _ := s.repo.FindAllUsers()
	instList, _ := s.repo.FindAllInstansi()
	dokList, _ := s.repo.FindAllDokumen()
	valList, _ := s.repo.FindAllPengajuanValidasi()
	threadList, _ := s.repo.FindAllThreads()
	balasanList, _ := s.repo.FindAllBalasan()
	lapList, _ := s.repo.FindAllLaporanForum()
	auditList, _ := s.repo.FindAllAuditLogs()

	sekarang := time.Now()
	hariList := make([]domain.AktivitasHarianDTO, 0, 30)
	indeksHari := make(map[string]int)
	for i := 0; i < 30; i++ {
		tgl := sekarang.AddDate(0, 0, -(29 - i)).Format("2006-01-02")
		indeksHari[tgl] = i
		hariList = append(hariList, domain.AktivitasHarianDTO{Tanggal: tgl})
	}

	for _, a := range auditList {
		if a.Aksi == domain.AksiLogin && a.Hasil == domain.HasilBerhasil {
			if idx, ok := indeksHari[a.Waktu.Format("2006-01-02")]; ok {
				hariList[idx].Login++
			}
		}
	}
	for _, p := range valList {
		if idx, ok := indeksHari[p.TanggalPengajuan.Format("2006-01-02")]; ok {
			hariList[idx].Validasi++
		}
		if p.TanggalPutusan != nil {
			if idx, ok := indeksHari[p.TanggalPutusan.Format("2006-01-02")]; ok {
				hariList[idx].Validasi++
			}
		}
	}
	for _, d := range dokList {
		if idx, ok := indeksHari[d.TanggalRilis.Format("2006-01-02")]; ok {
			hariList[idx].Unggahan++
		}
	}
	for _, t := range threadList {
		if idx, ok := indeksHari[t.DibuatPada.Format("2006-01-02")]; ok {
			hariList[idx].Forum++
		}
	}
	for _, b := range balasanList {
		if idx, ok := indeksHari[b.DibuatPada.Format("2006-01-02")]; ok {
			hariList[idx].Forum++
		}
	}

	var statusVal domain.StatusValidasiRingkasDTO
	for _, p := range valList {
		switch p.Status {
		case domain.StatusMenunggu:
			statusVal.Menunggu++
		case domain.StatusDisetujui:
			statusVal.Disetujui++
		case domain.StatusPerluRevisi:
			statusVal.PerluRevisi++
		case domain.StatusDitolak:
			statusVal.Ditolak++
		}
	}

	totDok := 0
	for _, d := range dokList {
		if d.Status == domain.StatusDokBerlaku || d.Status == domain.StatusDokReview {
			totDok++
		}
	}
	totThread := 0
	for _, t := range threadList {
		if t.Status != domain.StatusThreadTersembunyi {
			totThread++
		}
	}
	lapBaru := 0
	for _, l := range lapList {
		if l.Status == domain.StatusLaporanBaru {
			lapBaru++
		}
	}

	notif, belum := s.notifikasiTerbaruUser(u.ID)
	return domain.BerandaSuperAdminResponse{
		Tipe: "super_admin",
		Ringkasan: domain.RingkasanSuperAdminDTO{
			TotalPengguna:     len(users),
			InstansiTerdaftar: len(instList),
			TotalDokumen:      totDok,
			MenungguValidasi:  statusVal.Menunggu,
			ThreadForum:       totThread,
			LaporanBaru:       lapBaru,
		},
		StatusValidasi: statusVal,
		Aktivitas:      hariList,
		Notifikasi:     notif,
		BelumDibaca:    belum,
	}
}

// ---- 3. Dasbor Instansi & Embed ----

var cakupanLayananDataMock = map[uint]struct {
	Layanan int
	Data    int
}{
	1: {Layanan: 14, Data: 22},
	2: {Layanan: 18, Data: 15},
	3: {Layanan: 9, Data: 12},
	4: {Layanan: 6, Data: 19},
	5: {Layanan: 8, Data: 11},
	6: {Layanan: 21, Data: 14},
}

func (s *PortalModulService) GetDasborInstansi(role string, paramIdInstansi uint) (*domain.DasborInstansiResponse, error) {
	u, err := s.ambilUser(role)
	if err != nil {
		return nil, err
	}

	instOPDList, _ := s.repo.FindAllInstansiOPD()
	targetID := paramIdInstansi
	if u.Role == domain.RoleAdminOPD {
		targetID = u.Instansi.ID
	} else if targetID == 0 && len(instOPDList) > 0 {
		targetID = instOPDList[0].ID
	}

	var instTarget *domain.Instansi
	for i := range instOPDList {
		if instOPDList[i].ID == targetID {
			instTarget = &instOPDList[i]
			break
		}
	}
	if instTarget == nil {
		return nil, ErrInstansiTidakDitemukan
	}

	semuaApl, _ := s.repo.FindAllAplikasi()
	semuaAlur, _ := s.repo.FindAllFlowchart()

	milikApl := make([]domain.Aplikasi, 0)
	for _, a := range semuaApl {
		if a.InstansiID == targetID {
			milikApl = append(milikApl, a)
		}
	}
	milikAlur := make([]domain.Flowchart, 0)
	for _, f := range semuaAlur {
		if f.InstansiID == targetID {
			milikAlur = append(milikAlur, f)
		}
	}

	hitungSesuai := func(list []domain.Aplikasi) int {
		c := 0
		for _, a := range list {
			if statusRaaDariSkor(a.NilaiKesesuaian) == "sesuai" {
				c++
			}
		}
		return c
	}
	hitungKlasifikasi := func(list []domain.Aplikasi) int {
		c := 0
		for _, a := range list {
			if a.RaaLevel1 != nil && *a.RaaLevel1 != "" {
				c++
			}
		}
		return c
	}
	hitungDisetujui := func(list []domain.Aplikasi) int {
		c := 0
		for _, a := range list {
			if a.StatusValidasi == domain.StatusDisetujui {
				c++
			}
		}
		return c
	}
	hitungFlowchartTerbit := func(list []domain.Flowchart) int {
		c := 0
		for _, f := range list {
			if f.Status == domain.StatusDisetujui {
				c++
			}
		}
		return c
	}

	buatIndikator := func(kunci, label, ket string, pemb, peny, kotaN, kotaD int) domain.IndikatorPerbandinganDTO {
		return domain.IndikatorPerbandinganDTO{
			Kunci:      kunci,
			Label:      label,
			Keterangan: ket,
			Instansi:   hitungPersenBulat(pemb, peny),
			Kota:       hitungPersenBulat(kotaN, kotaD),
			Pembilang:  pemb,
			Penyebut:   peny,
		}
	}

	indikator := []domain.IndikatorPerbandinganDTO{
		buatIndikator("kepatuhanRaa", "Kepatuhan RAA", "Aplikasi berstatus RAA Sesuai.", hitungSesuai(milikApl), len(milikApl), hitungSesuai(semuaApl), len(semuaApl)),
		buatIndikator("klasifikasi", "Aplikasi terklasifikasi", "Aplikasi yang sudah memiliki klasifikasi RAA.", hitungKlasifikasi(milikApl), len(milikApl), hitungKlasifikasi(semuaApl), len(semuaApl)),
		buatIndikator("tervalidasi", "Data tervalidasi", "Aplikasi yang sudah disetujui Super Admin.", hitungDisetujui(milikApl), len(milikApl), hitungDisetujui(semuaApl), len(semuaApl)),
		buatIndikator("flowchart", "Flowchart dipublikasikan", "Diagram proses bisnis yang sudah dipublikasikan.", hitungFlowchartTerbit(milikAlur), len(milikAlur), hitungFlowchartTerbit(semuaAlur), len(semuaAlur)),
	}

	var layananPtr, dataPtr *int
	if c, ok := cakupanLayananDataMock[targetID]; ok {
		l := c.Layanan
		d := c.Data
		layananPtr = &l
		dataPtr = &d
	}

	return &domain.DasborInstansiResponse{
		Instansi: domain.InstansiRingkas{
			ID:   instTarget.ID,
			Nama: instTarget.Nama,
		},
		Indikator: indikator,
		Cakupan: domain.CakupanDasborDTO{
			Proses:   len(milikAlur),
			Aplikasi: len(milikApl),
			Layanan:  layananPtr,
			Data:     dataPtr,
		},
	}, nil
}

func (s *PortalModulService) GetDasborEmbed(role string, jenis string, paramIdInstansi uint) (*domain.EmbedDasborResponse, error) {
	if jenis != "instansi" && jenis != "analitik" {
		return nil, ErrJenisDasborTidakValid
	}

	u, err := s.ambilUser(role)
	if err != nil {
		return nil, err
	}

	var filterTerkunci *string
	var namaInstansi string

	if jenis == "instansi" {
		instOPDList, _ := s.repo.FindAllInstansiOPD()
		targetID := paramIdInstansi
		if u.Role == domain.RoleAdminOPD {
			targetID = u.Instansi.ID
		} else if targetID == 0 && len(instOPDList) > 0 {
			targetID = instOPDList[0].ID
		}

		var instTarget *domain.Instansi
		for i := range instOPDList {
			if instOPDList[i].ID == targetID {
				instTarget = &instOPDList[i]
				break
			}
		}
		if instTarget == nil {
			return nil, &PortalKonflikError{Pesan: "Instansi tidak valid."}
		}
		namaInstansi = instTarget.Nama
		f := "instansi = " + namaInstansi
		filterTerkunci = &f
	}

	tokenBytes := make([]byte, 16)
	_, _ = rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

	q := url.Values{}
	q.Set("jenis", jenis)
	q.Set("token", token)
	if namaInstansi != "" {
		q.Set("instansi", namaInstansi)
	}

	return &domain.EmbedDasborResponse{
		URL:            "/mock/metabase-contoh.html?" + q.Encode(),
		Kedaluwarsa:    time.Now().Add(10 * time.Minute).UTC().Format(time.RFC3339),
		FilterTerkunci: filterTerkunci,
	}, nil
}

// ---- 4. Pencarian Global ----

type kandidatCari struct {
	Tipe  string
	ID    uint
	Judul string
	Isi   string
	Meta  string
	URL   string
}

func ekstrakKataKunci(q string) []string {
	matches := polaKataKunci.FindAllString(strings.ToLower(q), -1)
	unik := make([]string, 0, len(matches))
	seen := make(map[string]bool)
	for _, m := range matches {
		if utf8.RuneCountInString(m) >= 2 && !seen[m] {
			seen[m] = true
			unik = append(unik, m)
		}
	}
	return unik
}

func hitungSkorSemantik(k kandidatCari, kata []string) float64 {
	judul := strings.ToLower(k.Judul)
	teks := strings.ToLower(k.Judul + " " + k.Isi)
	skor := 0.0
	for _, w := range kata {
		if strings.Contains(judul, w) {
			skor += 3.0
		} else if strings.Contains(teks, w) {
			skor += 1.5
		}
		for _, padanan := range sinonimCari[w] {
			if strings.Contains(teks, padanan) {
				skor += 0.75
			}
		}
	}
	return skor
}

func buatCuplikanTeks(teks string, kata []string) string {
	rendah := strings.ToLower(teks)
	minPos := -1
	for _, k := range kata {
		if idx := strings.Index(rendah, k); idx >= 0 {
			if minPos == -1 || idx < minPos {
				minPos = idx
			}
		}
	}
	mulai := 0
	if minPos > 40 {
		mulai = minPos - 40
	}
	akhir := mulai + 180
	if akhir > len(teks) {
		akhir = len(teks)
	}
	potong := strings.TrimSpace(teks[mulai:akhir])
	prefix := ""
	if mulai > 0 {
		prefix = "…"
	}
	suffix := ""
	if akhir < len(teks) {
		suffix = "…"
	}
	return prefix + potong + suffix
}

func (s *PortalModulService) Cari(sudahLogin bool, role string, qRaw string, tipeFilter string, page int) (*domain.DaftarCariResponse, error) {
	q := strings.TrimSpace(qRaw)
	panjangQ := utf8.RuneCountInString(q)
	if panjangQ < 2 || panjangQ > 100 {
		return nil, &ValidationError{Errors: map[string]string{
			"q": "Kata kunci harus 2–100 karakter.",
		}}
	}
	if page < 1 {
		page = 1
	}
	perPage := 6

	tipeValid := false
	for _, t := range semuaTipeCari {
		if t == tipeFilter {
			tipeValid = true
			break
		}
	}
	if !tipeValid {
		tipeFilter = "semua"
	}

	var u *domain.User
	if sudahLogin {
		u, _ = s.ambilUser(role)
	}

	kandidat := make([]kandidatCari, 0)

	// 1. Dokumen & SOP
	dokList, _ := s.repo.FindAllDokumen()
	for _, d := range dokList {
		boleh := false
		if u != nil {
			boleh = d.Status == domain.StatusDokBerlaku || d.Status == domain.StatusDokReview
		} else {
			boleh = d.Status == domain.StatusDokBerlaku && d.Visibilitas == domain.VisibilitasPublik
		}
		if !boleh {
			continue
		}
		tipeItem := "dokumen"
		if d.Jenis == domain.JenisSOP {
			tipeItem = "sop"
		}
		katLabel := jenisDokLabel[d.Jenis]
		if d.Kategori != nil && d.Kategori.Nama != "" {
			katLabel = d.Kategori.Nama
		}
		kandidat = append(kandidat, kandidatCari{
			Tipe:  tipeItem,
			ID:    d.ID,
			Judul: d.Judul,
			Isi:   d.Deskripsi,
			Meta:  fmt.Sprintf("%s · v%s", katLabel, d.Versi),
			URL:   fmt.Sprintf("/dokumen/%d", d.ID),
		})
	}

	// 2. Forum (hanya pengguna login)
	if u != nil {
		threadList, _ := s.repo.FindAllThreads()
		for _, t := range threadList {
			if t.Status == domain.StatusThreadTersembunyi {
				continue
			}
			katNama := "Forum"
			if t.Kategori.Nama != "" {
				katNama = t.Kategori.Nama
			}
			penulis := penulisDariUser(t.PenulisUser)
			kandidat = append(kandidat, kandidatCari{
				Tipe:  "forum",
				ID:    t.ID,
				Judul: t.Judul,
				Isi:   t.Konten,
				Meta:  fmt.Sprintf("%s · %s", katNama, penulis.Nama),
				URL:   fmt.Sprintf("/forum/%d", t.ID),
			})
		}
	}

	// 3. Berita & Artikel (Publik)
	artikelList, _ := s.repo.FindAllArtikel("semua", sudahLogin)
	for _, a := range artikelList {
		jenisLabel := "Artikel"
		if a.Jenis == domain.JenisArtikelBerita {
			jenisLabel = "Berita"
		}
		kandidat = append(kandidat, kandidatCari{
			Tipe:  "berita",
			ID:    a.ID,
			Judul: a.Judul,
			Isi:   a.Ringkasan + " " + a.Konten,
			Meta:  fmt.Sprintf("%s · %s", jenisLabel, a.Penulis),
			URL:   fmt.Sprintf("/berita/%d", a.ID),
		})
	}

	// 4. Bantuan (Publik)
	bantuan := DataBantuanStatis()
	seqBantuan := uint(1)
	for _, f := range bantuan.FAQ {
		kandidat = append(kandidat, kandidatCari{
			Tipe:  "bantuan",
			ID:    seqBantuan,
			Judul: f.Pertanyaan,
			Isi:   f.Jawaban,
			Meta:  "Pusat bantuan",
			URL:   "/bantuan",
		})
		seqBantuan++
	}
	for _, p := range bantuan.Panduan {
		kandidat = append(kandidat, kandidatCari{
			Tipe:  "bantuan",
			ID:    seqBantuan,
			Judul: p.Judul,
			Isi:   p.Isi,
			Meta:  "Pusat bantuan",
			URL:   "/bantuan",
		})
		seqBantuan++
	}

	// 5. Kursus (Pengguna login)
	if u != nil {
		kursusList, _ := s.repo.FindAllKursus()
		for _, k := range kursusList {
			kandidat = append(kandidat, kandidatCari{
				Tipe:  "kursus",
				ID:    k.ID,
				Judul: k.Judul,
				Isi:   k.Deskripsi,
				Meta:  fmt.Sprintf("%s · %d jam", k.Kategori, k.DurasiJam),
				URL:   fmt.Sprintf("/pembelajaran/%d", k.ID),
			})
		}
	}

	// 6. Katalog Aplikasi & Flowchart (Admin OPD & Super Admin)
	if u != nil && (u.Role == domain.RoleSuperAdmin || u.Role == domain.RoleAdminOPD) {
		aplList, _ := s.repo.FindAllAplikasi()
		for _, a := range aplList {
			if u.Role != domain.RoleSuperAdmin && a.InstansiID != u.Instansi.ID {
				continue
			}
			kat := "Belum dikategorikan"
			if a.Kategori != nil && *a.Kategori != "" {
				kat = *a.Kategori
			}
			instNama := "Instansi"
			if a.Instansi.Nama != "" {
				instNama = a.Instansi.Nama
			}
			kandidat = append(kandidat, kandidatCari{
				Tipe:  "aplikasi",
				ID:    a.ID,
				Judul: a.Nama,
				Isi:   a.Deskripsi + " " + kat,
				Meta:  fmt.Sprintf("%s · %s", instNama, kat),
				URL:   "/katalog/aplikasi",
			})
		}

		fcList, _ := s.repo.FindAllFlowchart()
		for _, f := range fcList {
			if u.Role != domain.RoleSuperAdmin && f.InstansiID != u.Instansi.ID {
				continue
			}
			kandidat = append(kandidat, kandidatCari{
				Tipe:  "flowchart",
				ID:    f.ID,
				Judul: f.Nama,
				Isi:   f.Deskripsi + " " + f.Pic,
				Meta:  fmt.Sprintf("%s · v%s", f.Kode, f.Versi),
				URL:   fmt.Sprintf("/katalog/flowchart/%d", f.ID),
			})
		}
	}

	kata := ekstrakKataKunci(q)
	type hasilSkor struct {
		K    kandidatCari
		Skor float64
	}
	bernilai := make([]hasilSkor, 0)
	for _, c := range kandidat {
		s := 0.0
		if len(kata) > 0 {
			s = hitungSkorSemantik(c, kata)
		}
		if s > 0 {
			bernilai = append(bernilai, hasilSkor{K: c, Skor: s})
		}
	}

	sort.SliceStable(bernilai, func(i, j int) bool {
		if bernilai[i].Skor != bernilai[j].Skor {
			return bernilai[i].Skor > bernilai[j].Skor
		}
		return strings.ToLower(bernilai[i].K.Judul) < strings.ToLower(bernilai[j].K.Judul)
	})

	hitungan := make(map[string]int)
	for _, t := range semuaTipeCari {
		hitungan[t] = 0
	}
	cocok := make([]hasilSkor, 0)
	for _, b := range bernilai {
		hitungan["semua"]++
		hitungan[b.K.Tipe]++
		if tipeFilter == "semua" || b.K.Tipe == tipeFilter {
			cocok = append(cocok, b)
		}
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

	items := make([]domain.HasilCariItem, 0, end-start)
	for _, item := range cocok[start:end] {
		items = append(items, domain.HasilCariItem{
			Tipe:     item.K.Tipe,
			ID:       item.K.ID,
			Judul:    item.K.Judul,
			Cuplikan: buatCuplikanTeks(item.K.Isi, kata),
			Meta:     item.K.Meta,
			URL:      item.K.URL,
		})
	}

	return &domain.DaftarCariResponse{
		Items:      items,
		Page:       page,
		TotalPages: totalPages,
		Total:      total,
		Hitungan:   hitungan,
		Fallback:   false,
	}, nil
}

// ArtikelInput adalah isian Super Admin untuk menerbitkan berita atau artikel.
// Susunannya mengikuti formulir "Tambah Pengetahuan" di SIMPAN BRIN.
type ArtikelInput struct {
	Jenis         string   `json:"jenis"`
	Judul         string   `json:"judul"`
	Format        string   `json:"format"`
	UrlSumber     string   `json:"urlSumber"`
	Penulis       []string `json:"penulis"`
	Kolaborator   []string `json:"kolaborator"`
	Ringkasan     string   `json:"ringkasan"`
	Konten        string   `json:"konten"`
	Kategori      string   `json:"kategori"`
	Label         []string `json:"label"`
	TanggalTerbit string   `json:"tanggalTerbit"` // YYYY-MM-DD; kosong = hari ini
	StatusAkses   string   `json:"statusAkses"`
	Unggulan      bool     `json:"unggulan"`
}

// ArtikelInvalidError membawa pesan per kolom untuk respons 422.
type ArtikelInvalidError struct{ Errors map[string]string }

func (e *ArtikelInvalidError) Error() string { return ErrArtikelTidakValid.Error() }

// bersihkanDaftar memangkas spasi, membuang yang kosong dan duplikat (tanpa membedakan huruf besar/kecil).
func bersihkanDaftar(in []string) []string {
	out := make([]string, 0, len(in))
	terlihat := map[string]bool{}
	for _, v := range in {
		v = strings.TrimSpace(v)
		k := strings.ToLower(v)
		if v == "" || terlihat[k] {
			continue
		}
		terlihat[k] = true
		out = append(out, v)
	}
	return out
}

func panjangDaftarValid(d []string, maks, panjangMaks int) bool {
	if len(d) > maks {
		return false
	}
	for _, v := range d {
		if utf8.RuneCountInString(v) > panjangMaks {
			return false
		}
	}
	return true
}

// BuatArtikel memvalidasi lalu menerbitkan berita/artikel baru.
func (s *PortalModulService) BuatArtikel(in ArtikelInput) (*domain.Artikel, error) {
	in.Judul = strings.TrimSpace(in.Judul)
	in.Ringkasan = strings.TrimSpace(in.Ringkasan)
	in.Konten = strings.TrimSpace(in.Konten)
	in.UrlSumber = strings.TrimSpace(in.UrlSumber)
	in.Kategori = strings.TrimSpace(in.Kategori)
	penulis := bersihkanDaftar(in.Penulis)
	kolaborator := bersihkanDaftar(in.Kolaborator)
	label := bersihkanDaftar(in.Label)

	galat := map[string]string{}
	if in.Jenis != string(domain.JenisArtikelBerita) && in.Jenis != string(domain.JenisArtikelEdukasi) {
		galat["jenis"] = "Pilih berita atau artikel."
	}
	if n := utf8.RuneCountInString(in.Judul); n < 5 || n > 200 {
		galat["judul"] = "Judul 5 sampai 200 karakter."
	}
	switch domain.FormatArtikel(in.Format) {
	case domain.FormatGambar, domain.FormatVideo, domain.FormatAudio, domain.FormatTeks:
	default:
		galat["format"] = "Pilih format: gambar, video, audio, atau teks."
	}
	if in.UrlSumber != "" {
		u, err := url.Parse(in.UrlSumber)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || utf8.RuneCountInString(in.UrlSumber) > 500 {
			galat["urlSumber"] = "Isi URL lengkap yang diawali http:// atau https://."
		}
	}
	if len(penulis) == 0 {
		galat["penulis"] = "Isi minimal satu penulis."
	} else if !panjangDaftarValid(penulis, 5, 100) {
		galat["penulis"] = "Maksimal 5 penulis, tiap nama maksimal 100 karakter."
	}
	if !panjangDaftarValid(kolaborator, 10, 100) {
		galat["kolaborator"] = "Maksimal 10 kolaborator, tiap nama maksimal 100 karakter."
	}
	if n := utf8.RuneCountInString(in.Ringkasan); n < 10 || n > 500 {
		galat["ringkasan"] = "Ringkasan 10 sampai 500 karakter."
	}
	if utf8.RuneCountInString(in.Konten) < 20 {
		galat["konten"] = "Isi minimal 20 karakter."
	}
	if n := utf8.RuneCountInString(in.Kategori); n < 2 || n > 80 {
		galat["kategori"] = "Pilih kategori."
	}
	if !panjangDaftarValid(label, 10, 40) {
		galat["label"] = "Maksimal 10 label, tiap label maksimal 40 karakter."
	}
	akses := domain.AksesArtikel(in.StatusAkses)
	if akses != domain.AksesPublik && akses != domain.AksesInternal {
		galat["statusAkses"] = "Pilih status akses."
	}
	tanggal := time.Now()
	if strings.TrimSpace(in.TanggalTerbit) != "" {
		t, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(in.TanggalTerbit), time.Local)
		if err != nil {
			galat["tanggalTerbit"] = "Format tanggal tidak valid."
		} else {
			tanggal = t
		}
	}
	if len(galat) > 0 {
		return nil, &ArtikelInvalidError{Errors: galat}
	}

	a := &domain.Artikel{
		Jenis:            domain.JenisArtikel(in.Jenis),
		Judul:            in.Judul,
		Ringkasan:        in.Ringkasan,
		Penulis:          strings.Join(penulis, ", "),
		Konten:           in.Konten,
		Tanggal:          tanggal,
		Format:           domain.FormatArtikel(in.Format),
		UrlSumber:        in.UrlSumber,
		Kolaborator:      kolaborator,
		Kategori:         in.Kategori,
		Label:            label,
		StatusAkses:      akses,
		Unggulan:         in.Unggulan,
		StatusVerifikasi: domain.StatusArtikelMenunggu,
	}
	if err := s.repo.CreateArtikel(a); err != nil {
		return nil, err
	}

	s.kirimNotifKeVerifikator(
		"Pengajuan verifikasi berita/artikel baru",
		fmt.Sprintf("Super Admin mengajukan %s '%s' untuk diverifikasi sebelum diterbitkan.", in.Jenis, in.Judul),
		"/verifikasi-konten",
	)
	return a, nil
}

func (s *PortalModulService) kirimNotifKeVerifikator(judul, pesan, urlTujuan string) {
	users, _ := s.repo.FindAllUsers()
	now := time.Now()
	for _, u := range users {
		if u.PunyaPeran(domain.RoleVerifikator) {
			_ = s.repo.CreateNotifikasi(&domain.Notifikasi{
				UserID:      u.ID,
				Kategori:    domain.KategoriNotifValidasi,
				Judul:       judul,
				Pesan:       pesan,
				UrlTujuan:   urlTujuan,
				SudahDibaca: false,
				DibuatPada:  now,
			})
		}
	}
}

func (s *PortalModulService) kirimNotifKeSuperAdmin(judul, pesan, urlTujuan string) {
	users, _ := s.repo.FindAllUsers()
	now := time.Now()
	for _, u := range users {
		if u.Role == domain.RoleSuperAdmin {
			_ = s.repo.CreateNotifikasi(&domain.Notifikasi{
				UserID:      u.ID,
				Kategori:    domain.KategoriNotifValidasi,
				Judul:       judul,
				Pesan:       pesan,
				UrlTujuan:   urlTujuan,
				SudahDibaca: false,
				DibuatPada:  now,
			})
		}
	}
}

// UbahArtikel memperbarui tulisan (mis. setelah diminta revisi oleh Verifikator) dan mengajukannya kembali.
func (s *PortalModulService) UbahArtikel(id uint, in ArtikelInput) (*domain.Artikel, error) {
	existing, err := s.repo.FindArtikelByID(id)
	if err != nil {
		return nil, ErrArtikelTidakDitemukan
	}

	in.Judul = strings.TrimSpace(in.Judul)
	in.Ringkasan = strings.TrimSpace(in.Ringkasan)
	in.Konten = strings.TrimSpace(in.Konten)
	in.UrlSumber = strings.TrimSpace(in.UrlSumber)
	in.Kategori = strings.TrimSpace(in.Kategori)
	penulis := bersihkanDaftar(in.Penulis)
	kolaborator := bersihkanDaftar(in.Kolaborator)
	label := bersihkanDaftar(in.Label)

	galat := map[string]string{}
	if in.Jenis != string(domain.JenisArtikelBerita) && in.Jenis != string(domain.JenisArtikelEdukasi) {
		galat["jenis"] = "Pilih berita atau artikel."
	}
	if n := utf8.RuneCountInString(in.Judul); n < 5 || n > 200 {
		galat["judul"] = "Judul 5 sampai 200 karakter."
	}
	if len(penulis) == 0 {
		galat["penulis"] = "Isi minimal satu penulis."
	}
	if n := utf8.RuneCountInString(in.Ringkasan); n < 10 || n > 500 {
		galat["ringkasan"] = "Ringkasan 10 sampai 500 karakter."
	}
	if utf8.RuneCountInString(in.Konten) < 20 {
		galat["konten"] = "Isi minimal 20 karakter."
	}
	if len(galat) > 0 {
		return nil, &ArtikelInvalidError{Errors: galat}
	}

	existing.Jenis = domain.JenisArtikel(in.Jenis)
	existing.Judul = in.Judul
	existing.Ringkasan = in.Ringkasan
	existing.Penulis = strings.Join(penulis, ", ")
	existing.Konten = in.Konten
	if in.Format != "" {
		existing.Format = domain.FormatArtikel(in.Format)
	}
	existing.UrlSumber = in.UrlSumber
	existing.Kolaborator = kolaborator
	if in.Kategori != "" {
		existing.Kategori = in.Kategori
	}
	existing.Label = label
	if in.StatusAkses != "" {
		existing.StatusAkses = domain.AksesArtikel(in.StatusAkses)
	}
	existing.Unggulan = in.Unggulan
	existing.StatusVerifikasi = domain.StatusArtikelMenunggu
	existing.CatatanVerifikasi = nil

	if err := s.repo.UpdateArtikel(existing); err != nil {
		return nil, err
	}

	s.kirimNotifKeVerifikator(
		"Perbaikan berita/artikel diajukan ulang",
		fmt.Sprintf("Super Admin telah memperbaiki '%s' dan mengajukannya kembali untuk diverifikasi.", existing.Judul),
		"/verifikasi-konten",
	)
	return existing, nil
}

// ListVerifikasiArtikel mengembalikan daftar seluruh tulisan beserta ringkasan status verifikasinya.
func (s *PortalModulService) ListVerifikasiArtikel() (domain.DaftarVerifikasiArtikelResponse, error) {
	rows, err := s.repo.FindAllArtikelUntukVerifikasi()
	if err != nil {
		return domain.DaftarVerifikasiArtikelResponse{}, err
	}
	var ringkasan domain.RingkasanVerifikasiArtikel
	for i := range rows {
		if rows[i].StatusVerifikasi == "" {
			rows[i].StatusVerifikasi = domain.StatusArtikelTerbit
		}
		switch rows[i].StatusVerifikasi {
		case domain.StatusArtikelMenunggu:
			ringkasan.Menunggu++
		case domain.StatusArtikelRevisi:
			ringkasan.Revisi++
		default:
			ringkasan.Terbit++
		}
	}
	return domain.DaftarVerifikasiArtikelResponse{
		Ringkasan: ringkasan,
		Items:     rows,
	}, nil
}

// VerifikasiArtikel memproses keputusan Verifikator (terbit atau revisi) atas berita/artikel.
func (s *PortalModulService) VerifikasiArtikel(kunci string, id uint, in domain.VerifikasiArtikelInput) (*domain.Artikel, error) {
	a, err := s.repo.FindArtikelByID(id)
	if err != nil {
		return nil, ErrArtikelTidakDitemukan
	}

	catatan := strings.TrimSpace(in.Catatan)
	if in.Keputusan != domain.StatusArtikelTerbit && in.Keputusan != domain.StatusArtikelRevisi {
		return nil, &ArtikelInvalidError{Errors: map[string]string{"keputusan": "Pilih keputusan: terbit atau revisi."}}
	}
	if in.Keputusan == domain.StatusArtikelRevisi && utf8.RuneCountInString(catatan) < 5 {
		return nil, &ArtikelInvalidError{Errors: map[string]string{"catatan": "Catatan revisi minimal 5 karakter."}}
	}

	verifikatorNama := "Verifikator"
	if u, err := s.ambilUser(kunci); err == nil && u != nil {
		verifikatorNama = u.Nama
	}

	now := time.Now()
	a.StatusVerifikasi = in.Keputusan
	a.DiverifikasiOleh = &verifikatorNama
	a.DiverifikasiPada = &now
	if in.Keputusan == domain.StatusArtikelRevisi {
		a.CatatanVerifikasi = &catatan
	} else {
		a.CatatanVerifikasi = nil
	}

	if err := s.repo.UpdateArtikel(a); err != nil {
		return nil, err
	}

	if in.Keputusan == domain.StatusArtikelTerbit {
		s.kirimNotifKeSuperAdmin(
			"Berita/Artikel Disetujui & Terbit",
			fmt.Sprintf("'%s' telah diverifikasi oleh %s dan resmi diterbitkan.", a.Judul, verifikatorNama),
			fmt.Sprintf("/berita/%d", a.ID),
		)
	} else {
		s.kirimNotifKeSuperAdmin(
			"Berita/Artikel Perlu Revisi",
			fmt.Sprintf("'%s' memerlukan perbaikan dari %s: %s", a.Judul, verifikatorNama, catatan),
			fmt.Sprintf("/berita/%d", a.ID),
		)
	}

	return a, nil
}
