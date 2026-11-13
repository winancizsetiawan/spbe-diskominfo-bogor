package service

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"spbe-backend/internal/domain"
	"spbe-backend/internal/repository"
)

type ValidasiService interface {
	GetDaftar(filter domain.ValidasiFilter) (*domain.DaftarPengajuanResponse, error)
	GetDetail(id uint) (*domain.PengajuanDetailResponse, error)
	Ajukan(input domain.AjukanInput, user domain.User) (*domain.HasilAjukanResponse, error)
	Putuskan(id uint, input domain.KeputusanInput, validator string) (*domain.PengajuanDetailResponse, error)
}

type validasiService struct {
	repo repository.ValidasiRepository
}

func NewValidasiService(repo repository.ValidasiRepository) ValidasiService {
	return &validasiService{repo: repo}
}

// targetRingkas mengambil ID dan Nama dari objek yang diajukan
func targetRingkas(p domain.PengajuanValidasi) domain.TargetRingkas {
	if p.JenisData == domain.JenisDataProses && p.Flowchart != nil {
		return domain.TargetRingkas{ID: p.Flowchart.ID, Nama: p.Flowchart.Nama}
	}
	if p.Aplikasi != nil {
		return domain.TargetRingkas{ID: p.Aplikasi.ID, Nama: p.Aplikasi.Nama}
	}
	targetID := uint(0)
	if p.AplikasiID != nil {
		targetID = *p.AplikasiID
	} else if p.FlowchartID != nil {
		targetID = *p.FlowchartID
	}
	return domain.TargetRingkas{ID: targetID, Nama: "Data Tidak Ditemukan"}
}

// keItemResponse memetakan PengajuanValidasi ke format PengajuanItemResponse yang diharapkan frontend
func keItemResponse(p domain.PengajuanValidasi) domain.PengajuanItemResponse {
	return domain.PengajuanItemResponse{
		ID:               p.ID,
		JenisData:        p.JenisData,
		Status:           p.Status,
		Aplikasi:         targetRingkas(p),
		Instansi:         p.Instansi,
		Pengaju:          p.Pengaju,
		TanggalPengajuan: p.TanggalPengajuan,
		TanggalPutusan:   p.TanggalPutusan,
		Catatan:          p.Catatan,
	}
}

// GetDaftar mengambil daftar antrean pengajuan berhalaman beserta statistik
func (s *validasiService) GetDaftar(filter domain.ValidasiFilter) (*domain.DaftarPengajuanResponse, error) {
	pageSize := 6 // Sesuai batas per halaman di frontend
	if filter.Page <= 0 {
		filter.Page = 1
	}

	items, total, err := s.repo.FindAll(filter, pageSize)
	if err != nil {
		return nil, err
	}

	hitungan, err := s.repo.GetHitungan()
	if err != nil {
		return nil, err
	}

	totalPages := 1
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(pageSize)))
	}

	responseItems := make([]domain.PengajuanItemResponse, len(items))
	for i, item := range items {
		responseItems[i] = keItemResponse(item)
	}

	return &domain.DaftarPengajuanResponse{
		Items:      responseItems,
		Page:       filter.Page,
		TotalPages: totalPages,
		Total:      int(total),
		Hitungan:   hitungan,
	}, nil
}

// GetDetail mengambil detail 1 pengajuan beserta objek aslinya
func (s *validasiService) GetDetail(id uint) (*domain.PengajuanDetailResponse, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("pengajuan tidak ditemukan")
	}

	detail := &domain.PengajuanDetailResponse{
		PengajuanItemResponse: keItemResponse(*p),
	}

	if p.JenisData == domain.JenisDataProses && p.FlowchartID != nil {
		fc, err := s.repo.FindFlowchartByID(*p.FlowchartID)
		if err == nil {
			detail.Proses = fc
		}
	} else if p.AplikasiID != nil {
		apl, err := s.repo.FindAplikasiByID(*p.AplikasiID)
		if err == nil {
			detail.Data = apl
		}
	}

	return detail, nil
}

// Ajukan menangani pengajuan data oleh OPD (memeriksa syarat status Draft/Perlu Revisi)
func (s *validasiService) Ajukan(input domain.AjukanInput, user domain.User) (*domain.HasilAjukanResponse, error) {
	hasil := &domain.HasilAjukanResponse{
		Berhasil: []uint{},
		Dilewati: []domain.ItemDilewati{},
	}

	for _, targetID := range input.TargetIDs {
		if input.JenisData == domain.JenisDataProses {
			// Pengajuan Flowchart
			fc, err := s.repo.FindFlowchartByID(targetID)
			if err != nil {
				hasil.Dilewati = append(hasil.Dilewati, domain.ItemDilewati{
					ID:     targetID,
					Nama:   "Flowchart",
					Alasan: "Data flowchart tidak ditemukan.",
				})
				continue
			}

			if fc.Status != domain.StatusDraft && fc.Status != domain.StatusPerluRevisi {
				hasil.Dilewati = append(hasil.Dilewati, domain.ItemDilewati{
					ID:     fc.ID,
					Nama:   fc.Nama,
					Alasan: "Hanya data berstatus Draft atau Perlu Revisi yang dapat diajukan.",
				})
				continue
			}

			// Ubah status flowchart menjadi Menunggu
			if err := s.repo.UpdateStatusFlowchart(fc.ID, domain.StatusMenunggu, nil); err != nil {
				hasil.Dilewati = append(hasil.Dilewati, domain.ItemDilewati{
					ID:     fc.ID,
					Nama:   fc.Nama,
					Alasan: "Gagal memperbarui status flowchart.",
				})
				continue
			}

			// Buat catatan pengajuan
			pengajuan := &domain.PengajuanValidasi{
				JenisData:   domain.JenisDataProses,
				Status:      domain.StatusMenunggu,
				InstansiID:  user.InstansiID,
				FlowchartID: &fc.ID,
				Pengaju:     user.Nama,
			}
			if err := s.repo.Create(pengajuan); err != nil {
				continue
			}

			s.repo.KirimNotifikasiValidasi(
				domain.RoleSuperAdmin,
				nil,
				fmt.Sprintf("Pengajuan flowchart baru: %s", fc.Nama),
				fmt.Sprintf("Diajukan oleh %s menunggu keputusan verifikasi.", user.Nama),
				fmt.Sprintf("/admin/validasi/%d", pengajuan.ID),
			)

			hasil.Berhasil = append(hasil.Berhasil, fc.ID)
		} else {
			// Pengajuan Aplikasi atau Klasifikasi RAA
			apl, err := s.repo.FindAplikasiByID(targetID)
			if err != nil {
				hasil.Dilewati = append(hasil.Dilewati, domain.ItemDilewati{
					ID:     targetID,
					Nama:   "Aplikasi",
					Alasan: "Data aplikasi tidak ditemukan.",
				})
				continue
			}

			if apl.StatusValidasi != domain.StatusDraft && apl.StatusValidasi != domain.StatusPerluRevisi {
				hasil.Dilewati = append(hasil.Dilewati, domain.ItemDilewati{
					ID:     apl.ID,
					Nama:   apl.Nama,
					Alasan: "Hanya data berstatus Draft atau Perlu Revisi yang dapat diajukan.",
				})
				continue
			}

			// Ubah status aplikasi menjadi Menunggu
			if err := s.repo.UpdateStatusAplikasi(apl.ID, domain.StatusMenunggu, nil); err != nil {
				hasil.Dilewati = append(hasil.Dilewati, domain.ItemDilewati{
					ID:     apl.ID,
					Nama:   apl.Nama,
					Alasan: "Gagal memperbarui status aplikasi.",
				})
				continue
			}

			// Buat catatan pengajuan
			pengajuan := &domain.PengajuanValidasi{
				JenisData:  input.JenisData,
				Status:     domain.StatusMenunggu,
				InstansiID: user.InstansiID,
				AplikasiID: &apl.ID,
				Pengaju:    user.Nama,
			}
			if err := s.repo.Create(pengajuan); err != nil {
				continue
			}

			s.repo.KirimNotifikasiValidasi(
				domain.RoleSuperAdmin,
				nil,
				fmt.Sprintf("Pengajuan aplikasi baru: %s", apl.Nama),
				fmt.Sprintf("Diajukan oleh %s menunggu keputusan verifikasi.", user.Nama),
				fmt.Sprintf("/admin/validasi/%d", pengajuan.ID),
			)

			hasil.Berhasil = append(hasil.Berhasil, apl.ID)
		}
	}

	return hasil, nil
}

// Putuskan menangani persetujuan atau penolakan oleh Super Admin Diskominfo
func (s *validasiService) Putuskan(id uint, input domain.KeputusanInput, validator string) (*domain.PengajuanDetailResponse, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("pengajuan tidak ditemukan")
	}

	if p.Status != domain.StatusMenunggu {
		return nil, errors.New("pengajuan sudah pernah diputuskan sebelumnya")
	}

	// Aturan bisnis: Perlu Revisi dan Ditolak wajib menyertakan catatan minimal 10 karakter
	catatanBersih := strings.TrimSpace(input.Catatan)
	if (input.Keputusan == domain.KeputusanPerluRevisi || input.Keputusan == domain.KeputusanDitolak) && len(catatanBersih) < 10 {
		return nil, errors.New("catatan perbaikan wajib diisi minimal 10 karakter untuk keputusan perlu revisi atau tolak")
	}

	// Perbarui status PengajuanValidasi
	statusBaru := domain.StatusValidasi(input.Keputusan)
	now := time.Now()
	p.Status = statusBaru
	p.TanggalPutusan = &now

	var catatanPtr *string
	if catatanBersih != "" {
		catatanPtr = &catatanBersih
	}
	p.Catatan = catatanPtr

	if err := s.repo.Update(p); err != nil {
		return nil, err
	}

	// Sinkronkan status ke data asli (Aplikasi atau Flowchart) dan tentukan tautan tujuan
	target := targetRingkas(*p)
	labelJenis := "Aplikasi"
	urlTujuan := "/katalog/aplikasi"
	if p.JenisData == domain.JenisDataRaa {
		labelJenis = "Klasifikasi RAA"
		urlTujuan = "/katalog/raa"
	}
	if p.FlowchartID != nil {
		_ = s.repo.UpdateStatusFlowchart(*p.FlowchartID, statusBaru, catatanPtr)
		labelJenis = "Flowchart"
		urlTujuan = fmt.Sprintf("/katalog/flowchart/%d", *p.FlowchartID)
	} else if p.AplikasiID != nil {
		_ = s.repo.UpdateStatusAplikasi(*p.AplikasiID, statusBaru, catatanPtr)
	}

	// Kirim notifikasi lonceng otomatis ke Admin OPD instansi terkait
	var judulNotif, pesanNotif string
	switch input.Keputusan {
	case domain.KeputusanDisetujui:
		judulNotif = fmt.Sprintf("%s disetujui: %s", labelJenis, target.Nama)
		pesanNotif = "Pengajuan Anda telah disetujui dan dipublikasikan oleh Diskominfo."
		if catatanBersih != "" {
			pesanNotif = fmt.Sprintf("Disetujui dengan catatan: %s", catatanBersih)
		}
	case domain.KeputusanPerluRevisi:
		judulNotif = fmt.Sprintf("Perlu revisi %s: %s", strings.ToLower(labelJenis), target.Nama)
		pesanNotif = fmt.Sprintf("Catatan verifikator: %s", catatanBersih)
	case domain.KeputusanDitolak:
		judulNotif = fmt.Sprintf("Pengajuan %s ditolak: %s", strings.ToLower(labelJenis), target.Nama)
		pesanNotif = fmt.Sprintf("Alasan penolakan: %s", catatanBersih)
	}
	if judulNotif != "" {
		s.repo.KirimNotifikasiValidasi(domain.RoleAdminOPD, &p.InstansiID, judulNotif, pesanNotif, urlTujuan)
	}

	return s.GetDetail(p.ID)
}

