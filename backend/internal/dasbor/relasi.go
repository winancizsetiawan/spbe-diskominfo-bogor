package dasbor

import (
	"log"
	"regexp"
	"strings"
)

// BerkasRelasi memuat keterkaitan antar-domain (proses bisnis, layanan, data, aplikasi, infrastruktur)
// yang dipakai untuk menyusun diagram alur otomatis. Disimpan terpisah agar tidak membebani Dasbor Analitik.
const BerkasRelasi = "relasiArsitektur.json"

// Relasi adalah isi relasiArsitektur.json.
type Relasi struct {
	ProsesBisnis  []RelasiProbis   `json:"prosesBisnis"`
	Layanan       []RelasiItem     `json:"layanan"`
	Data          []RelasiItem     `json:"data"`
	Aplikasi      []RelasiAplikasi `json:"aplikasi"`
	Infrastruktur []RelasiItem     `json:"infrastruktur"`
}

type RelasiItem struct {
	ID       string `json:"id"`
	Nama     string `json:"nama"`
	Unit     string `json:"unit,omitempty"`
	Kategori string `json:"kategori,omitempty"`
}

type RelasiProbis struct {
	ID             string   `json:"id"`
	Nama           string   `json:"nama"`
	Uraian         string   `json:"uraian,omitempty"`
	Unit           string   `json:"unit"`
	Jenis          string   `json:"jenis"`
	StatusBpmnAsIs string   `json:"statusBpmnAsIs,omitempty"`
	StatusBpmnToBe string   `json:"statusBpmnToBe,omitempty"`
	RefLayanan     []string `json:"refLayanan,omitempty"`
	RefData        []string `json:"refData,omitempty"`
}

type RelasiAplikasi struct {
	ID            string   `json:"id"`
	Nama          string   `json:"nama"`
	Unit          string   `json:"unit,omitempty"`
	Data          []string `json:"data"`
	Layanan       []string `json:"layanan"`
	Infrastruktur []string `json:"infrastruktur"`
}

var rePemisahRef = regexp.MustCompile(`[;,\n]+`)

// daftarRef memecah sel berisi beberapa kode (dipisah titik koma, koma, atau baris baru).
func daftarRef(s string) []string {
	out := []string{}
	lihat := map[string]bool{}
	for _, x := range rePemisahRef.Split(s, -1) {
		x = rapikan(x)
		if kosong(x) || lihat[x] {
			continue
		}
		lihat[x] = true
		out = append(out, x)
	}
	return out
}

// bangunRelasi membaca sheet domain 1-7 beserta sheet keterkaitan. Sheet relasi bersifat pelengkap:
// bila formatnya tidak dikenali, hasilnya nil dan konversi dasbor tetap berjalan.
func bangunRelasi(sheet func(string) [][]string) (hasil *Relasi) {
	defer func() {
		if p := recover(); p != nil {
			log.Printf("[dasbor] relasi antar-domain dilewati: %v", p)
			hasil = nil
		}
	}()
	r := &Relasi{}

	status := func(nama string) map[string]string {
		t := buatTabel(nama, sheet(nama), "ID Proses Bisnis")
		kID, kStatus := t.kol("ID Proses Bisnis"), t.kol("Status BPMN")
		out := map[string]string{}
		for _, row := range t.rows {
			if id := t.ambil(row, kID); !kosong(id) {
				out[id] = t.ambil(row, kStatus)
			}
		}
		return out
	}
	asIs, toBe := status("2-BPMN As-Is"), status("3-BPMN To-Be")

	pb := buatTabel("1-Domain Proses Bisnis", sheet("1-Domain Proses Bisnis"), "ID Proses Bisnis")
	kID, kNama, kUraian := pb.kol("ID Proses Bisnis"), pb.kol("Nama Bisnis"), pb.kol("Uraian Bisnis")
	kUnit, kKet := pb.kol("→ Unit Kerja"), pb.kol("Keterangan")
	kRefL, kRefD := pb.kol("Kode Referensi Layanan"), pb.kol("Kode Referensi Data")
	for _, row := range pb.rows {
		id := pb.ambil(row, kID)
		if kosong(id) || !strings.HasPrefix(id, "BKT") {
			continue
		}
		r.ProsesBisnis = append(r.ProsesBisnis, RelasiProbis{
			ID: id, Nama: pb.ambil(row, kNama), Uraian: pb.ambil(row, kUraian), Unit: pb.ambil(row, kUnit), Jenis: pb.ambil(row, kKet),
			StatusBpmnAsIs: asIs[id], StatusBpmnToBe: toBe[id],
			RefLayanan: daftarRef(pb.ambil(row, kRefL)), RefData: daftarRef(pb.ambil(row, kRefD)),
		})
	}

	katalog := func(nama, kunci, kolNama, kolUnit, kolKategori string) []RelasiItem {
		t := buatTabel(nama, sheet(nama), kunci)
		kI, kN := t.kol(kunci), t.kol(kolNama)
		out := []RelasiItem{}
		lihat := map[string]bool{}
		for _, row := range t.rows {
			id, n := t.ambil(row, kI), t.ambil(row, kN)
			if kosong(id) || kosong(n) || lihat[id] {
				continue
			}
			lihat[id] = true
			it := RelasiItem{ID: id, Nama: n}
			if kolUnit != "" {
				it.Unit = t.ambil(row, t.kol(kolUnit))
			}
			if kolKategori != "" {
				it.Kategori = t.ambil(row, t.kol(kolKategori))
			}
			out = append(out, it)
		}
		return out
	}
	r.Layanan = katalog("4-Domain Layanan", "ID Layanan", "Nama Layanan", "Organizational Unit (Unit Pelaksana", "")
	r.Data = katalog("5-Domain Data", "ID Data", "Nama Data", "", "")
	r.Infrastruktur = katalog("7-Domain Infrastruktur", "ID Arsitektur", "Nama Arsitektur", "", "Architecture category")

	// Aplikasi -> layanan dan unit pengelola dari Access Diagram.
	ad := buatTabel("10-(APLIKASI) Access Diagram", sheet("10-(APLIKASI) Access Diagram"), "ID Aplikasi")
	kAdID, kAdUnit, kAdLay := ad.kol("ID Aplikasi"), ad.kol("Instansi/Unit"), ad.kol("ID Layanan terkait")
	layananApl, unitApl := map[string][]string{}, map[string]string{}
	for _, row := range ad.rows {
		if id := ad.ambil(row, kAdID); !kosong(id) {
			layananApl[id] = daftarRef(ad.ambil(row, kAdLay))
			unitApl[id] = ad.ambil(row, kAdUnit)
		}
	}

	// Aplikasi -> data dan infrastruktur.
	ap := buatTabel("6-Domain Aplikasi-SIA", sheet("6-Domain Aplikasi-SIA"), "ID Aplikasi")
	kApID, kApNama, kApData, kApInf := ap.kol("ID Aplikasi"), ap.kol("Nama Aplikasi"), ap.kol("Kode Referensi Data"), ap.kol("Kode Referensi Infrastruktur")
	lihat := map[string]bool{}
	for _, row := range ap.rows {
		id, n := ap.ambil(row, kApID), ap.ambil(row, kApNama)
		if kosong(id) || kosong(n) || !strings.HasPrefix(id, "BKT") || lihat[id] {
			continue
		}
		lihat[id] = true
		lay := layananApl[id]
		if lay == nil {
			lay = []string{}
		}
		r.Aplikasi = append(r.Aplikasi, RelasiAplikasi{
			ID: id, Nama: n, Unit: unitApl[id], Data: daftarRef(ap.ambil(row, kApData)), Layanan: lay,
			Infrastruktur: daftarRef(ap.ambil(row, kApInf)),
		})
	}
	return r
}
