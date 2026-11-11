package service

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"spbe-backend/internal/domain"
	"spbe-backend/internal/repository"
)

var (
	ErrDokumenTidakDitemukan = errors.New("Dokumen tidak ditemukan.")
	ErrDokumenButuhLogin     = errors.New("Masuk untuk melihat dokumen ini.")
	ErrSesiUnggahKedaluwarsa = errors.New("Sesi unggahan tidak ditemukan atau sudah kedaluwarsa.")
)

type TransisiStatusKonflikError struct {
	Pesan string
}

func (e *TransisiStatusKonflikError) Error() string {
	return e.Pesan
}

type ValidationError struct {
	Errors map[string]string
}

func (e *ValidationError) Error() string {
	return "Data yang dikirim tidak valid."
}

var (
	polaVersi   = regexp.MustCompile(`^\d+(\.\d+){0,3}$`)
	polaNonSlug = regexp.MustCompile(`[^a-z0-9]+`)

	jenisValid = map[domain.JenisDokumen]bool{
		domain.JenisRegulasi:   true,
		domain.JenisPedoman:    true,
		domain.JenisLaporan:    true,
		domain.JenisPresentasi: true,
		domain.JenisTemplate:   true,
		domain.JenisSOP:        true,
		domain.JenisPanduan:    true,
		domain.JenisLainnya:    true,
	}

	tipeBerkasValid = map[domain.TipeBerkas]bool{
		domain.TipePDF:  true,
		domain.TipeDOCX: true,
		domain.TipeXLSX: true,
		domain.TipePPTX: true,
	}

	statusLabel = map[domain.StatusDokumen]string{
		domain.StatusDokDraft:   "Draft",
		domain.StatusDokReview:  "Review",
		domain.StatusDokBerlaku: "Berlaku",
		domain.StatusDokArsip:   "Arsip",
	}

	transisiStatus = map[domain.StatusDokumen][]domain.StatusDokumen{
		domain.StatusDokDraft:   {domain.StatusDokReview, domain.StatusDokBerlaku},
		domain.StatusDokReview:  {domain.StatusDokDraft, domain.StatusDokBerlaku},
		domain.StatusDokBerlaku: {domain.StatusDokReview, domain.StatusDokArsip},
		domain.StatusDokArsip:   {domain.StatusDokDraft},
	}
)

const (
	batasUnggahBytes = 10 * 1024 * 1024 // 10 MB
	masaSesiUnggah   = 10 * time.Minute
)

type sesiUnggahRow struct {
	Nama        string
	TipeBerkas  domain.TipeBerkas
	UkuranBytes int64
	Metadata    domain.MetadataDokumenInput
	PathBerkas  string
	Kedaluwarsa time.Time
}

type DokumenService struct {
	repo *repository.DokumenRepository
	sesi sync.Map
}

func NewDokumenService(repo *repository.DokumenRepository) *DokumenService {
	return &DokumenService{repo: repo}
}

func terlihatOlehPengguna(d *domain.Dokumen, sudahLogin bool, isSuperAdmin bool) bool {
	if isSuperAdmin {
		return true
	}
	if !sudahLogin {
		return d.Status == domain.StatusDokBerlaku && d.Visibilitas == domain.VisibilitasPublik
	}
	return d.Status == domain.StatusDokBerlaku || d.Status == domain.StatusDokReview
}

func namaBerkasUnduh(d *domain.Dokumen) string {
	slug := strings.ToLower(d.Judul)
	slug = polaNonSlug.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if len(slug) > 60 {
		slug = slug[:60]
	}
	if slug == "" {
		slug = "dokumen"
	}
	return fmt.Sprintf("%s.%s", slug, d.TipeBerkas)
}

func buatIdSesi() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (s *DokumenService) GetKategori(kelompok domain.KelompokDokumen) ([]domain.KategoriDokumen, error) {
	if kelompok != domain.KelompokSOP {
		return []domain.KategoriDokumen{}, nil
	}
	return s.repo.FindAllKategoriSOP()
}

func (s *DokumenService) GetRingkasan(kelompok domain.KelompokDokumen, sudahLogin bool) (domain.RingkasanDokumen, error) {
	return s.repo.GetRingkasan(kelompok, sudahLogin)
}

func (s *DokumenService) List(f domain.DokumenFilter) (domain.PagedResponse[domain.Dokumen], error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PerPage < 1 {
		f.PerPage = 6
	}

	items, total, err := s.repo.FindAll(f)
	if err != nil {
		return domain.PagedResponse[domain.Dokumen]{}, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(f.PerPage)))
	if totalPages < 1 {
		totalPages = 1
	}

	return domain.PagedResponse[domain.Dokumen]{
		Items:      items,
		Page:       f.Page,
		TotalPages: totalPages,
		Total:      int(total),
	}, nil
}

func (s *DokumenService) GetByID(id uint, sudahLogin bool, isSuperAdmin bool) (*domain.Dokumen, error) {
	dok, err := s.repo.FindByID(id)
	if err != nil {
		return nil, ErrDokumenTidakDitemukan
	}
	if !terlihatOlehPengguna(dok, sudahLogin, isSuperAdmin) {
		if !sudahLogin && dok.Status != domain.StatusDokDraft && dok.Status != domain.StatusDokArsip {
			return nil, ErrDokumenButuhLogin
		}
		return nil, ErrDokumenTidakDitemukan
	}
	return dok, nil
}

func (s *DokumenService) Unduh(id uint, sudahLogin bool, isSuperAdmin bool) (*domain.UnduhDokumenResponse, error) {
	dok, err := s.GetByID(id, sudahLogin, isSuperAdmin)
	if err != nil {
		return nil, err
	}
	_ = s.repo.IncrementUnduhan(id)

	urlBerkas := "/mock/berkas-contoh.txt"
	if dok.PathBerkas != "" {
		urlBerkas = dok.PathBerkas
	}

	return &domain.UnduhDokumenResponse{
		URL:        urlBerkas,
		NamaBerkas: namaBerkasUnduh(dok),
	}, nil
}

func (s *DokumenService) ListAdmin(f domain.AdminDokumenFilter) (domain.AdminDokumenPagedResponse, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PerPage < 1 {
		f.PerPage = 6
	}

	items, total, hitungan, err := s.repo.FindAllAdmin(f)
	if err != nil {
		return domain.AdminDokumenPagedResponse{}, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(f.PerPage)))
	if totalPages < 1 {
		totalPages = 1
	}

	return domain.AdminDokumenPagedResponse{
		Items:      items,
		Page:       f.Page,
		TotalPages: totalPages,
		Total:      total,
		Hitungan:   hitungan,
	}, nil
}

func (s *DokumenService) validasiMetadata(m domain.MetadataDokumenInput) map[string]string {
	errs := make(map[string]string)

	if !jenisValid[m.Jenis] {
		errs["jenis"] = "Jenis tidak valid."
	}

	if m.Jenis == domain.JenisSOP {
		if m.IdKategori == nil || !s.repo.ExistsKategori(*m.IdKategori) {
			errs["kategori"] = "Pilih kategori SOP."
		}
	} else if m.IdKategori != nil {
		errs["kategori"] = "Kategori hanya untuk SOP."
	}

	judul := strings.TrimSpace(m.Judul)
	panjangJudul := utf8.RuneCountInString(judul)
	if panjangJudul < 5 || panjangJudul > 150 {
		errs["judul"] = "Judul harus 5–150 karakter."
	}

	if utf8.RuneCountInString(m.Deskripsi) > 500 {
		errs["deskripsi"] = "Deskripsi maksimal 500 karakter."
	}

	versi := strings.TrimSpace(m.Versi)
	if !polaVersi.MatchString(versi) {
		errs["versi"] = "Versi hanya angka dipisah titik, mis. 1.2."
	}

	if m.Sumber != nil && utf8.RuneCountInString(*m.Sumber) > 100 {
		errs["sumber"] = "Sumber maksimal 100 karakter."
	}

	if m.Visibilitas != domain.VisibilitasPublik && m.Visibilitas != domain.VisibilitasInternal {
		errs["visibilitas"] = "Visibilitas tidak valid."
	}

	return errs
}

func (s *DokumenService) MulaiUnggah(in domain.MulaiUnggahInput) (*domain.SesiUnggahResponse, error) {
	errs := s.validasiMetadata(in.Metadata)

	parts := strings.Split(strings.ToLower(strings.TrimSpace(in.Nama)), ".")
	ekstensi := ""
	if len(parts) > 1 {
		ekstensi = parts[len(parts)-1]
	}

	if !tipeBerkasValid[in.TipeBerkas] || ekstensi != string(in.TipeBerkas) {
		errs["berkas"] = "Tipe berkas tidak diizinkan."
	} else if in.UkuranBytes <= 0 {
		errs["berkas"] = "Berkas kosong."
	} else if in.UkuranBytes > batasUnggahBytes {
		errs["berkas"] = "Ukuran maksimal 10 MB."
	}

	if len(errs) > 0 {
		return nil, &ValidationError{Errors: errs}
	}

	idSesi := buatIdSesi()
	s.sesi.Store(idSesi, &sesiUnggahRow{
		Nama:        in.Nama,
		TipeBerkas:  in.TipeBerkas,
		UkuranBytes: in.UkuranBytes,
		Metadata:    in.Metadata,
		Kedaluwarsa: time.Now().Add(masaSesiUnggah),
	})

	return &domain.SesiUnggahResponse{
		IdSesi:    idSesi,
		UrlUnggah: "/api/dokumen/unggah/berkas/" + idSesi,
		Fields:    map[string]string{"key": idSesi},
	}, nil
}

func (s *DokumenService) SimpanBerkasSesi(idSesi string, pathBerkas string) error {
	val, ok := s.sesi.Load(idSesi)
	if !ok {
		return ErrSesiUnggahKedaluwarsa
	}
	row := val.(*sesiUnggahRow)
	if time.Now().After(row.Kedaluwarsa) {
		s.sesi.Delete(idSesi)
		return ErrSesiUnggahKedaluwarsa
	}
	row.PathBerkas = pathBerkas
	return nil
}

func (s *DokumenService) SelesaiUnggah(idSesi string) (*domain.Dokumen, error) {
	val, ok := s.sesi.Load(idSesi)
	if !ok {
		return nil, ErrSesiUnggahKedaluwarsa
	}
	row := val.(*sesiUnggahRow)
	s.sesi.Delete(idSesi)

	if time.Now().After(row.Kedaluwarsa) {
		return nil, ErrSesiUnggahKedaluwarsa
	}

	ukuranMb := math.Round((float64(row.UkuranBytes)/1024.0/1024.0)*100) / 100
	if ukuranMb < 0.01 {
		ukuranMb = 0.01
	}

	var sumberPtr *string
	if row.Metadata.Sumber != nil {
		trimmed := strings.TrimSpace(*row.Metadata.Sumber)
		if trimmed != "" {
			sumberPtr = &trimmed
		}
	}

	dok := &domain.Dokumen{
		Jenis:         row.Metadata.Jenis,
		Judul:         strings.TrimSpace(row.Metadata.Judul),
		Deskripsi:     strings.TrimSpace(row.Metadata.Deskripsi),
		TipeBerkas:    row.TipeBerkas,
		UkuranMb:      ukuranMb,
		Versi:         strings.TrimSpace(row.Metadata.Versi),
		Sumber:        sumberPtr,
		Status:        domain.StatusDokDraft,
		Visibilitas:   row.Metadata.Visibilitas,
		JumlahUnduhan: 0,
		IdKategori:    row.Metadata.IdKategori,
		PathBerkas:    row.PathBerkas,
		TanggalRilis:  time.Now(),
	}

	if err := s.repo.Create(dok); err != nil {
		return nil, err
	}

	return dok, nil
}

func (s *DokumenService) UbahStatus(id uint, statusBaru domain.StatusDokumen) (*domain.Dokumen, error) {
	if _, ok := statusLabel[statusBaru]; !ok {
		return nil, &ValidationError{Errors: map[string]string{"status": "Status tidak valid."}}
	}

	dok, err := s.repo.FindByID(id)
	if err != nil {
		return nil, ErrDokumenTidakDitemukan
	}

	diizinkan := false
	for _, target := range transisiStatus[dok.Status] {
		if target == statusBaru {
			diizinkan = true
			break
		}
	}

	if !diizinkan {
		pesan := fmt.Sprintf("Status %s tidak dapat langsung menjadi %s.", statusLabel[dok.Status], statusLabel[statusBaru])
		return nil, &TransisiStatusKonflikError{Pesan: pesan}
	}

	return s.repo.UpdateStatus(id, statusBaru)
}
