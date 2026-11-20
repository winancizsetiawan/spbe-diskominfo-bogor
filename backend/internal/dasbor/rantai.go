package dasbor

import "strings"

// Rantai adalah keterkaitan satu proses bisnis ke domain lain, bahan diagram alur otomatis.
//
// Dasar pengaitan:
//   - Proses bisnis -> layanan/data: kolom "Kode Referensi Layanan/Data" di sheet 1 bila terisi ("kolom");
//     bila kosong, data dipilih dari kode yang segmennya sama, mis. BKT-DAB.04.01.01.3 -> BKT-DAD.04.01.01.x ("kode").
//   - Data -> aplikasi: aplikasi yang memakai data tersebut (sheet 6, Kode Referensi Data).
//   - Aplikasi -> layanan: sheet 10 Access Diagram (ID Layanan terkait).
//   - Aplikasi -> infrastruktur: sheet 6 (Kode Referensi Infrastruktur).
type Rantai struct {
	ProsesBisnis  RelasiProbis     `json:"prosesBisnis"`
	DasarData     string           `json:"dasarData"` // "kolom" | "kode"
	Data          []RelasiItem     `json:"data"`
	Aplikasi      []RelasiAplikasi `json:"aplikasi"`
	Layanan       []RelasiItem     `json:"layanan"`
	Infrastruktur []RelasiItem     `json:"infrastruktur"`
}

// segmenKode mengambil bagian tengah kode arsitektur: "BKT-DAB.04.01.01.3" -> "04.01.01".
func segmenKode(id string) string {
	b := strings.Split(id, ".")
	if len(b) < 4 {
		return ""
	}
	return strings.Join(b[1:4], ".")
}

func himpunan(xs []string) map[string]bool {
	m := make(map[string]bool, len(xs))
	for _, x := range xs {
		m[x] = true
	}
	return m
}

// saring mengembalikan isi katalog yang ID-nya ada di pilih, dengan urutan katalog.
func saring(katalog []RelasiItem, pilih map[string]bool) []RelasiItem {
	out := []RelasiItem{}
	for _, it := range katalog {
		if pilih[it.ID] {
			out = append(out, it)
		}
	}
	return out
}

func irisan(xs []string, pilih map[string]bool) []string {
	out := []string{}
	for _, x := range xs {
		if pilih[x] {
			out = append(out, x)
		}
	}
	return out
}

// Rantai menyusun keterkaitan untuk proses bisnis id; false bila id tidak dikenal.
func (r *Relasi) Rantai(id string) (*Rantai, bool) {
	var pb *RelasiProbis
	for i := range r.ProsesBisnis {
		if r.ProsesBisnis[i].ID == id {
			pb = &r.ProsesBisnis[i]
			break
		}
	}
	if pb == nil {
		return nil, false
	}
	hasil := &Rantai{ProsesBisnis: *pb, DasarData: "kolom"}

	dataPilih := himpunan(pb.RefData)
	if len(pb.RefData) == 0 {
		hasil.DasarData = "kode"
		if seg := segmenKode(pb.ID); seg != "" {
			for _, d := range r.Data {
				if segmenKode(d.ID) == seg {
					dataPilih[d.ID] = true
				}
			}
		}
	}
	layananRef := himpunan(pb.RefLayanan)

	layananPilih := himpunan(pb.RefLayanan)
	infraPilih := map[string]bool{}
	for _, a := range r.Aplikasi {
		pakaiData := irisan(a.Data, dataPilih)
		if len(pakaiData) == 0 && len(irisan(a.Layanan, layananRef)) == 0 {
			continue
		}
		hasil.Aplikasi = append(hasil.Aplikasi, RelasiAplikasi{ID: a.ID, Nama: a.Nama, Unit: a.Unit, Data: pakaiData, Layanan: a.Layanan, Infrastruktur: a.Infrastruktur})
		for _, l := range a.Layanan {
			layananPilih[l] = true
		}
		for _, i := range a.Infrastruktur {
			infraPilih[i] = true
		}
	}
	hasil.Data = saring(r.Data, dataPilih)
	hasil.Layanan = saring(r.Layanan, layananPilih)
	hasil.Infrastruktur = saring(r.Infrastruktur, infraPilih)

	// Hanya kaitkan aplikasi ke layanan/infrastruktur yang benar-benar ada di katalog.
	adaLayanan, adaInfra := map[string]bool{}, map[string]bool{}
	for _, l := range hasil.Layanan {
		adaLayanan[l.ID] = true
	}
	for _, i := range hasil.Infrastruktur {
		adaInfra[i.ID] = true
	}
	if hasil.Aplikasi == nil {
		hasil.Aplikasi = []RelasiAplikasi{}
	}
	for i := range hasil.Aplikasi {
		hasil.Aplikasi[i].Layanan = irisan(hasil.Aplikasi[i].Layanan, adaLayanan)
		hasil.Aplikasi[i].Infrastruktur = irisan(hasil.Aplikasi[i].Infrastruktur, adaInfra)
	}
	return hasil, true
}
