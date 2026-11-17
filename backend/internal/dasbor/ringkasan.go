package dasbor

import "encoding/json"

// RingkasanDari menghitung ringkasan dari isi dasborInternal.json yang sudah ada (mis. data yang sedang aktif),
// agar dapat dibandingkan dengan Excel baru sebelum diterapkan.
func RingkasanDari(internal []byte) (Ringkasan, error) {
	var d struct {
		Sumber       struct{ Judul, Diolah string } `json:"sumber"`
		PerOpd       []json.RawMessage              `json:"perOpd"`
		ProsesBisnis struct {
			Jumlah int               `json:"jumlahProsesBisnis"`
			Iku    []json.RawMessage `json:"iku"`
		} `json:"prosesBisnis"`
		Layanan struct {
			Jumlah int `json:"jumlahLayanan"`
		} `json:"layanan"`
		Data struct {
			Jumlah  int `json:"jumlahData"`
			Katalog []struct {
				Sifat string `json:"sifat"`
			} `json:"katalog"`
		} `json:"data"`
		Aplikasi struct {
			Jumlah int `json:"jumlahAplikasi"`
		} `json:"aplikasi"`
		Infrastruktur struct {
			PusatData int               `json:"jumlahPusatData"`
			Server    []json.RawMessage `json:"server"`
		} `json:"infrastruktur"`
		Keamanan struct {
			Katalog []json.RawMessage `json:"katalog"`
		} `json:"keamanan"`
		PetaRencana struct {
			Total int `json:"totalKegiatan"`
		} `json:"petaRencana"`
	}
	if err := json.Unmarshal(internal, &d); err != nil {
		return Ringkasan{}, err
	}
	terbuka := 0
	for _, x := range d.Data.Katalog {
		if x.Sifat == "Terbuka" {
			terbuka++
		}
	}
	return Ringkasan{
		Judul: d.Sumber.Judul, Diolah: d.Sumber.Diolah, Opd: len(d.PerOpd), ProsesBisnis: d.ProsesBisnis.Jumlah,
		Iku: len(d.ProsesBisnis.Iku), Layanan: d.Layanan.Jumlah, Data: d.Data.Jumlah, DataTerbuka: terbuka,
		Aplikasi: d.Aplikasi.Jumlah, PusatData: d.Infrastruktur.PusatData, Server: len(d.Infrastruktur.Server),
		ItemKeamanan: len(d.Keamanan.Katalog), KegiatanPetaRencana: d.PetaRencana.Total,
	}, nil
}

// Peringatan membandingkan ringkasan baru dengan yang aktif dan menandai penurunan besar atau domain kosong,
// yang biasanya berarti sheet salah atau Excel belum lengkap.
func Peringatan(baru Ringkasan, lama *Ringkasan) []string {
	type pasangan struct {
		nama       string
		baru, lama int
	}
	var l Ringkasan
	if lama != nil {
		l = *lama
	}
	daftar := []pasangan{
		{"OPD", baru.Opd, l.Opd}, {"proses bisnis", baru.ProsesBisnis, l.ProsesBisnis}, {"layanan", baru.Layanan, l.Layanan},
		{"data", baru.Data, l.Data}, {"aplikasi", baru.Aplikasi, l.Aplikasi}, {"kegiatan peta rencana", baru.KegiatanPetaRencana, l.KegiatanPetaRencana},
	}
	var out []string
	for _, p := range daftar {
		switch {
		case p.baru == 0:
			out = append(out, "Jumlah "+p.nama+" kosong. Periksa apakah sheet-nya terisi.")
		case lama != nil && p.lama > 0 && p.baru*2 < p.lama:
			out = append(out, "Jumlah "+p.nama+" turun lebih dari separuh dibanding data yang aktif.")
		}
	}
	return out
}
