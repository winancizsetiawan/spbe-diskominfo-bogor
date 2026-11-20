package dasbor

import (
	"bytes"
	"encoding/json"
	"os"
	"reflect"
	"testing"
	"time"
)

func relasiUji() *Relasi {
	return &Relasi{
		ProsesBisnis: []RelasiProbis{
			{ID: "BKT-DAB.04.01.01.3", Nama: "Keluarga Sehat", Unit: "Dinas Kesehatan"},
			{ID: "BKT-DAB.09.06.01.1", Nama: "Tata Kelola", RefLayanan: []string{"L2"}, RefData: []string{"BKT-DAD.04.01.01.1"}},
		},
		Data:          []RelasiItem{{ID: "BKT-DAD.04.01.01.1", Nama: "Data Gizi"}, {ID: "BKT-DAD.04.01.01.2", Nama: "Data KIA"}, {ID: "BKT-DAD.02.01.06.1", Nama: "Data Ekraf"}},
		Layanan:       []RelasiItem{{ID: "L1", Nama: "Layanan Gizi"}, {ID: "L2", Nama: "Layanan Umum"}},
		Infrastruktur: []RelasiItem{{ID: "I1", Nama: "Server A"}},
		Aplikasi: []RelasiAplikasi{
			{ID: "A1", Nama: "E-PPBGM", Data: []string{"BKT-DAD.04.01.01.1"}, Layanan: []string{"L1", "LX"}, Infrastruktur: []string{"I1", "IX"}},
			{ID: "A2", Nama: "Ekraf", Data: []string{"BKT-DAD.02.01.06.1"}, Layanan: []string{"L2"}},
		},
	}
}

func TestRantaiMenebakDataDariSegmenKode(t *testing.T) {
	h, ok := relasiUji().Rantai("BKT-DAB.04.01.01.3")
	if !ok {
		t.Fatal("proses bisnis harus ditemukan")
	}
	if h.DasarData != "kode" || len(h.Data) != 2 {
		t.Fatalf("data via segmen kode: %s %+v", h.DasarData, h.Data)
	}
	if len(h.Aplikasi) != 1 || h.Aplikasi[0].ID != "A1" {
		t.Fatalf("hanya aplikasi pemakai data: %+v", h.Aplikasi)
	}
	// ID yang tidak ada di katalog (LX, IX) dibuang.
	if !reflect.DeepEqual(h.Aplikasi[0].Layanan, []string{"L1"}) || !reflect.DeepEqual(h.Aplikasi[0].Infrastruktur, []string{"I1"}) {
		t.Fatalf("relasi aplikasi: %+v", h.Aplikasi[0])
	}
	if len(h.Layanan) != 1 || len(h.Infrastruktur) != 1 {
		t.Fatalf("layanan/infra: %+v %+v", h.Layanan, h.Infrastruktur)
	}
}

func TestRantaiMemakaiKolomReferensiBilaTerisi(t *testing.T) {
	h, _ := relasiUji().Rantai("BKT-DAB.09.06.01.1")
	if h.DasarData != "kolom" || len(h.Data) != 1 || h.Data[0].ID != "BKT-DAD.04.01.01.1" {
		t.Fatalf("data dari kolom: %+v", h)
	}
	// A1 lewat data, A2 lewat layanan rujukan L2.
	if len(h.Aplikasi) != 2 {
		t.Fatalf("aplikasi: %+v", h.Aplikasi)
	}
	if _, ok := relasiUji().Rantai("TIDAK-ADA"); ok {
		t.Fatal("id tidak dikenal harus false")
	}
}

func TestDaftarRef(t *testing.T) {
	got := daftarRef("BKT-DAL.01.25.01.1; BKT-DAL.01.25.01.25;BKT-DAL.01.25.01.1\n-")
	want := []string{"BKT-DAL.01.25.01.1", "BKT-DAL.01.25.01.25"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("daftarRef: %v", got)
	}
}

// TestRelasiDariExcelAsli memeriksa pembacaan relasi pada Excel matriks sungguhan.
// Jalankan dengan DASBOR_PARITAS_XLSX=<file.xlsx>.
func TestRelasiDariExcelAsli(t *testing.T) {
	xlsx := os.Getenv("DASBOR_PARITAS_XLSX")
	if xlsx == "" {
		t.Skip("DASBOR_PARITAS_XLSX tidak diisi")
	}
	isi, err := os.ReadFile(xlsx)
	if err != nil {
		t.Fatal(err)
	}
	h, err := Konversi(bytes.NewReader(isi), int64(len(isi)), time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if h.Relasi == nil {
		t.Fatal("relasi harus terbentuk dari Excel matriks lengkap")
	}
	var r Relasi
	if err := json.Unmarshal(h.Relasi, &r); err != nil {
		t.Fatal(err)
	}
	t.Logf("probis %d, layanan %d, data %d, aplikasi %d, infra %d, ukuran %d KB",
		len(r.ProsesBisnis), len(r.Layanan), len(r.Data), len(r.Aplikasi), len(r.Infrastruktur), len(h.Relasi)/1024)
	rt, ok := r.Rantai("BKT-DAB.04.01.01.3")
	if !ok || len(rt.Data) == 0 || len(rt.Aplikasi) == 0 || len(rt.Layanan) == 0 {
		t.Fatalf("rantai Keluarga Sehat kosong: %+v", rt)
	}
	t.Logf("Keluarga Sehat: data %d, aplikasi %d, layanan %d, infra %d", len(rt.Data), len(rt.Aplikasi), len(rt.Layanan), len(rt.Infrastruktur))
	ada := 0
	for _, p := range r.ProsesBisnis {
		if x, _ := r.Rantai(p.ID); len(x.Data) > 0 {
			ada++
		}
	}
	t.Logf("probis yang punya data terkait: %d dari %d", ada, len(r.ProsesBisnis))
}
