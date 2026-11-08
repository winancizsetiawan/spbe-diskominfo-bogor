package service

import (
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"

	"spbe-backend/internal/domain"
	"spbe-backend/internal/repository"
)

// 1. Interface FlowchartService
type FlowchartService interface {
	GetDaftar(filter domain.FlowchartFilter) (*domain.DaftarFlowchartResponse, error)
	GetDetail(id uint) (*domain.Flowchart, error)
	Create(input domain.FlowchartInput, instansiID uint, oleh string) (*domain.Flowchart, error)
	Update(id uint, input domain.FlowchartInput, oleh string) (*domain.Flowchart, error)
}

type flowchartService struct {
	repo repository.FlowchartRepository
}

// Konstruktor untuk Service
func NewFlowchartService(repo repository.FlowchartRepository) FlowchartService {
	return &flowchartService{repo: repo}
}

// 2. Fungsi Helper (buatKode)
func buatKode(nama string, seq int64) string {
	kata := strings.Fields(strings.ToUpper(nama))
	inisial := ""
	for _, k := range kata {
		if k != "PROSES" && k != "DAN" && k != "DI" && k != "KE" && len(k) > 0 {
			inisial += string(k[0])
		}
	}
	if len(inisial) < 3 {
		inisial = (inisial + "XXX")[:3]
	} else {
		inisial = inisial[:3]
	}
	return fmt.Sprintf("FB-%02d-%s", seq, inisial)
}

// 3. Fungsi Helper (naikkanVersi)
func naikkanVersi(versi string) string {
	// Jika versi kosong (seharusnya tidak terjadi), set default
	if versi == "" {
		return "1.1"
	}
	bagian := strings.Split(versi, ".")
	terakhir := bagian[len(bagian)-1]
	angka, _ := strconv.Atoi(terakhir)
	bagian[len(bagian)-1] = strconv.Itoa(angka + 1)
	return strings.Join(bagian, ".")
}

// 4. Implementasi Method

func (s *flowchartService) GetDaftar(filter domain.FlowchartFilter) (*domain.DaftarFlowchartResponse, error) {
	pageSize := 6
	if filter.Page <= 0 {
		filter.Page = 1
	}

	items, total, err := s.repo.FindAll(filter, pageSize)
	if err != nil {
		return nil, err
	}

	hitungan, err := s.repo.GetHitungan(filter.InstansiID)
	if err != nil {
		return nil, err
	}

	totalPages := 1
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(pageSize)))
	}

	return &domain.DaftarFlowchartResponse{
		Items:      items,
		Page:       filter.Page,
		TotalPages: totalPages,
		Total:      int(total),
		Hitungan:   hitungan,
	}, nil
}

func (s *flowchartService) GetDetail(id uint) (*domain.Flowchart, error) {
	return s.repo.FindByID(id)
}

func (s *flowchartService) Create(input domain.FlowchartInput, instansiID uint, oleh string) (*domain.Flowchart, error) {
	// Ambil nomor urut terbaru dari repo
	seq, err := s.repo.GetNextSequence()
	if err != nil {
		return nil, err
	}

	// Generate Kode
	kode := buatKode(input.Nama, seq+1)

	// Petakan input ke Entity Flowchart
	fc := &domain.Flowchart{
		Nama:       input.Nama,
		Deskripsi:  input.Deskripsi,
		Kategori:   input.Kategori,
		Jenis:      input.Jenis,
		Pic:        input.Pic,
		BpmnXml:    input.BpmnXml,
		InstansiID: instansiID,
		Kode:       kode,
		Versi:      "1.0",
		Status:     domain.StatusDraft, // Pastikan StatusDraft/StatusMenunggu didefinisikan di domain
	}

	// Buat riwayat awal
	fc.Riwayat = []domain.FlowchartRiwayat{
		{
			Versi:   "1.0",
			Catatan: "Versi awal",
			Oleh:    oleh,
		},
	}

	// Simpan via repository
	if err := s.repo.Create(fc, input.IDAplikasi); err != nil {
		return nil, err
	}

	// Kembalikan data lengkapnya
	return s.repo.FindByID(fc.ID)
}

func (s *flowchartService) Update(id uint, input domain.FlowchartInput, oleh string) (*domain.Flowchart, error) {
	// Cari data flowchart yang sudah ada
	fc, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Cek aturan bisnis: tidak bisa edit jika sedang divalidasi
	if fc.Status == domain.StatusMenunggu {
		return nil, errors.New("flowchart sedang menunggu validasi dan tidak dapat diubah")
	}

	// Perbarui field dari input
	fc.Nama = input.Nama
	fc.Deskripsi = input.Deskripsi
	fc.Kategori = input.Kategori
	fc.Jenis = input.Jenis
	fc.Pic = input.Pic
	fc.BpmnXml = input.BpmnXml

	// Naikkan versi
	fc.Versi = naikkanVersi(fc.Versi)
	
	// Kembalikan status ke Draft
	fc.Status = domain.StatusDraft
	fc.CatatanValidasi = nil // Mengosongkan catatan validasi lama (asumsi tipe data *string di struct)

	// Pastikan ada catatan revisi
	catatanRev := input.CatatanRevisi
	if catatanRev == "" {
		catatanRev = "Pembaruan dokumen"
	}

	// Tambahkan riwayat baru
	riwayatBaru := domain.FlowchartRiwayat{
		FlowchartID: fc.ID,
		Versi:       fc.Versi,
		Catatan:     catatanRev,
		Oleh:        oleh,
	}
	fc.Riwayat = append(fc.Riwayat, riwayatBaru)

	// Simpan pembaruan via repository
	if err := s.repo.Update(fc, input.IDAplikasi); err != nil {
		return nil, err
	}

	// Kembalikan data lengkap terbaru
	return s.repo.FindByID(fc.ID)
}