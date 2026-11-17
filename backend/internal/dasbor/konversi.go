package dasbor

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Port dari frontend/scripts/excel_dasbor_publik.py. Ubah keduanya bersamaan; uji paritas ada di konversi_test.go.
//
// BATASAN DATA PUBLIK (disepakati 12 Nov 2026). Hanya kolom berikut yang masuk dasborPublik.json:
//   - Proses Bisnis: ID, nama, sasaran strategis, RAB level 1-2, unit kerja, utama/sub; IKU (target, realisasi).
//   - Layanan: ID, nama, tujuan, target, metode, RAL level 1-2, unit pelaksana. TANPA risiko dan mitigasi.
//   - Data: angka per sifat/jenis/validitas/RAD; katalog HANYA data bersifat Terbuka.
//   - Aplikasi: nama, fungsi, basis, RAA level 1-2, kepemilikan, unit. TANPA URL, server, database, bahasa, OS.
//   - Infrastruktur: hanya angka per kategori, pusat data (kepemilikan, tier), jaringan intra.
//   - Keamanan: hanya jumlah standar per jenis dan edukasi per tahun.
//   - Peta Rencana: angka per status/muatan/tahun/OPD/sasaran. TANPA estimasi nominal.
// dasborInternal.json (hanya untuk pengguna yang masuk) memuat semuanya tanpa batasan.

type obj = map[string]any

// Ringkasan ditampilkan sebagai pratinjau sebelum data diterapkan.
type Ringkasan struct {
	Judul               string `json:"judul"`
	Diolah              string `json:"diolah"`
	Opd                 int    `json:"opd"`
	ProsesBisnis        int    `json:"prosesBisnis"`
	Iku                 int    `json:"iku"`
	Layanan             int    `json:"layanan"`
	Data                int    `json:"data"`
	DataTerbuka         int    `json:"dataTerbuka"`
	Aplikasi            int    `json:"aplikasi"`
	PusatData           int    `json:"pusatData"`
	Server              int    `json:"server"`
	ItemKeamanan        int    `json:"itemKeamanan"`
	KegiatanPetaRencana int    `json:"kegiatanPetaRencana"`
}

// Hasil konversi: dua berkas JSON siap tulis beserta ringkasannya.
type Hasil struct {
	Publik    []byte
	Internal  []byte
	Ringkasan Ringkasan
}

var (
	reSpasi    = regexp.MustCompile(`[\s\-]+`)
	reTanggal  = regexp.MustCompile(`^\d{4,5}(\.0+)?$`)
	reAngka    = regexp.MustCompile(`^\d+(\.\d+)?$`)
	reNomor    = regexp.MustCompile(`^\d+(\.0)?$`)
	reTahun20  = regexp.MustCompile(`(20\d\d)`)
	kataKosong = map[string]bool{"": true, "-": true, "None": true, "none": true, "null": true, "Tidak ada data": true}
	bulan      = []string{"Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
)

func rapikan(s string) string { return strings.Join(strings.FieldsFunc(s, spasi), " ") }
func kosong(s string) bool    { return kataKosong[rapikan(s)] }

func tanggalExcel(s string) string {
	if reTanggal.MatchString(s) {
		f, _ := strconv.ParseFloat(s, 64)
		d := time.Date(1899, 12, 30, 0, 0, 0, 0, time.UTC).AddDate(0, 0, int(f))
		return fmt.Sprintf("%d %s %d", d.Day(), bulan[d.Month()-1], d.Year())
	}
	return s
}

// hitung meniru collections.Counter: most_common (jumlah turun, seri mengikuti urutan pertama muncul)
// atau urut label bila urut=false.
func hitung(nilai []string, urut bool, batas int, labelKosong string) []obj {
	jumlah := map[string]int{}
	var kunci []string
	tambah := func(k string) {
		if _, ada := jumlah[k]; !ada {
			kunci = append(kunci, k)
		}
		jumlah[k]++
	}
	for _, v := range nilai {
		if kosong(v) {
			if labelKosong != "" {
				tambah(labelKosong)
			}
			continue
		}
		tambah(v)
	}
	if urut {
		sort.SliceStable(kunci, func(i, j int) bool { return jumlah[kunci[i]] > jumlah[kunci[j]] })
	} else {
		sort.Strings(kunci)
	}
	if batas > 0 && len(kunci) > batas {
		kunci = kunci[:batas]
	}
	out := make([]obj, 0, len(kunci))
	for _, k := range kunci {
		out = append(out, obj{"label": k, "nilai": jumlah[k]})
	}
	return out
}

func hitungUrut(nilai []string, labelKosong string) []obj { return hitung(nilai, true, 0, labelKosong) }

// kanonik menyatukan variasi penulisan (huruf besar/kecil, tanda hubung) ke bentuk yang paling sering muncul.
func kanonik(nilai []string) []string {
	kunci := func(s string) string { return strings.TrimSpace(reSpasi.ReplaceAllString(strings.ToLower(s), " ")) }
	var bukanKosong []string
	for _, v := range nilai {
		if !kosong(v) {
			bukanKosong = append(bukanKosong, v)
		}
	}
	bentuk := map[string]string{}
	for _, x := range hitung(bukanKosong, true, 0, "") {
		v := x["label"].(string)
		if _, ada := bentuk[kunci(v)]; !ada {
			bentuk[kunci(v)] = v
		}
	}
	out := make([]string, len(nilai))
	for i, v := range nilai {
		if kosong(v) {
			out[i] = ""
		} else if b, ada := bentuk[kunci(v)]; ada {
			out[i] = b
		} else {
			out[i] = v
		}
	}
	return out
}

// tabel: baris data sebuah sheet dengan akses kolom berdasarkan awalan nama header.
type tabel struct {
	sheet  string
	header []string
	rows   [][]string
}

func buatTabel(sheet string, semua [][]string, kunciHeader string) *tabel {
	batas := len(semua)
	if batas > 10 {
		batas = 10
	}
	for i := 0; i < batas; i++ {
		for _, x := range semua[i] {
			if rapikan(x) == kunciHeader {
				h := make([]string, len(semua[i]))
				for j, v := range semua[i] {
					h[j] = rapikan(v)
				}
				return &tabel{sheet: sheet, header: h, rows: semua[i+1:]}
			}
		}
	}
	panic(galatFormat("Judul kolom \"%s\" tidak ditemukan di sheet \"%s\".", kunciHeader, strings.TrimSpace(sheet)))
}

func (t *tabel) kolKe(awalan string, ke int) int {
	n := 0
	for i, h := range t.header {
		if strings.HasPrefix(strings.ToLower(h), strings.ToLower(awalan)) {
			if n == ke {
				return i
			}
			n++
		}
	}
	panic(galatFormat("Kolom \"%s\" tidak ditemukan di sheet \"%s\".", awalan, strings.TrimSpace(t.sheet)))
}

func (t *tabel) kol(awalan string) int { return t.kolKe(awalan, 0) }

func (t *tabel) ambil(r []string, i int) string {
	if i < len(r) {
		return rapikan(r[i])
	}
	return ""
}

func (t *tabel) kolom(rows [][]string, i int) []string {
	out := make([]string, len(rows))
	for j, r := range rows {
		out[j] = t.ambil(r, i)
	}
	return out
}

func unik(nilai []string) int {
	s := map[string]bool{}
	for _, v := range nilai {
		if !kosong(v) {
			s[v] = true
		}
	}
	return len(s)
}

func tanpaTitikNol(s string) string { return strings.ReplaceAll(s, ".0", "") }

func angka(v string) int {
	v = rapikan(v)
	if reAngka.MatchString(v) {
		f, _ := strconv.ParseFloat(v, 64)
		return int(f)
	}
	return 0
}

// Konversi membaca Excel matriks arsitektur dan menghasilkan dasborPublik.json dan dasborInternal.json.
// Galat format dikembalikan sebagai *ErrFormat dengan pesan yang dapat ditampilkan.
func Konversi(r io.ReaderAt, ukuran int64, hariIni time.Time) (hasil *Hasil, err error) {
	defer func() {
		if p := recover(); p != nil {
			if ef, ok := p.(*ErrFormat); ok {
				err = ef
				return
			}
			log.Printf("[dasbor] konversi gagal: %v", p)
			err = galatFormat("Excel tidak sesuai format Matriks Evaluasi SPBE Architecture.")
		}
	}()

	b, err := bukaXlsx(r, ukuran)
	if err != nil {
		return nil, err
	}
	sheet := func(nama string) [][]string {
		rows, err := b.baris(nama)
		if err != nil {
			panic(err)
		}
		return rows
	}

	// ---------------- Proses Bisnis ----------------
	pb := buatTabel("1-Domain Proses Bisnis", sheet("1-Domain Proses Bisnis"), "ID Proses Bisnis")
	kID, kNama, kSas := pb.kol("ID Proses Bisnis"), pb.kol("Nama Bisnis"), pb.kol("Sasaran Strategis (")
	kRab1, kRab2 := pb.kol("→ RAB Level 1"), pb.kol("→ RAB Level 2")
	kUnit, kKet := pb.kol("→ Unit Kerja"), pb.kol("Keterangan")
	var probis [][]string
	for _, r := range pb.rows {
		if id := pb.ambil(r, kID); !kosong(id) && strings.HasPrefix(id, "BKT") {
			probis = append(probis, r)
		}
	}
	iku := buatTabel("IKU", sheet("IKU"), "Unit pelaksana")
	ki := []int{iku.kol("Unit pelaksana"), iku.kol("Sasaran Strategis"), iku.kol("Indikator Kinerja"), iku.kol("Nilai IKU Target"), iku.kol("Nilai IKU Realisasi")}
	daftarIku := []obj{}
	for _, r := range iku.rows {
		v := make([]string, 5)
		for i, k := range ki {
			v[i] = iku.ambil(r, k)
		}
		if kosong(v[2]) {
			continue
		}
		daftarIku = append(daftarIku, obj{"unit": v[0], "sasaran": v[1], "indikator": v[2], "target": v[3], "realisasi": v[4]})
	}
	katalogPB := []obj{}
	for _, r := range probis {
		katalogPB = append(katalogPB, obj{"id": pb.ambil(r, kID), "nama": pb.ambil(r, kNama), "sasaran": pb.ambil(r, kSas),
			"urusan": pb.ambil(r, kRab2), "jenis": pb.ambil(r, kKet), "unit": pb.ambil(r, kUnit)})
	}
	prosesBisnis := obj{
		"jumlahUnit":         unik(pb.kolom(probis, kUnit)),
		"jumlahProsesBisnis": len(probis),
		"perSektor":          hitungUrut(pb.kolom(probis, kRab1), "Belum dipetakan"),
		"perUrusan":          hitungUrut(pb.kolom(probis, kRab2), "Belum dipetakan"),
		"perJenis":           hitungUrut(pb.kolom(probis, kKet), "Belum ditentukan"),
		"iku":                daftarIku,
		"katalog":            katalogPB,
	}

	// ---------------- Layanan ----------------
	ly := buatTabel("4-Domain Layanan", sheet("4-Domain Layanan"), "ID Layanan")
	kl := map[string]int{"id": ly.kol("ID Layanan"), "nama": ly.kol("Nama Layanan"), "tujuan": ly.kol("Tujuan"), "target": ly.kol("Target Layanan"),
		"metode": ly.kol("Metode Layanan"), "ral1": ly.kol("RAL Level 1"), "ral2": ly.kol("RAL Level 2"), "unit": ly.kol("Organizational Unit (Unit Pelaksana")}
	var lay [][]string
	for _, r := range ly.rows {
		if strings.HasPrefix(ly.ambil(r, kl["id"]), "BKT") {
			lay = append(lay, r)
		}
	}
	targetLy := kanonik(ly.kolom(lay, kl["target"]))
	metodeLy := kanonik(ly.kolom(lay, kl["metode"]))
	unitLy := ly.kolom(lay, kl["unit"])
	katalogLy := []obj{}
	for i, r := range lay {
		katalogLy = append(katalogLy, obj{"id": ly.ambil(r, kl["id"]), "nama": ly.ambil(r, kl["nama"]), "tujuan": ly.ambil(r, kl["tujuan"]),
			"target": targetLy[i], "metode": metodeLy[i], "area": ly.ambil(r, kl["ral2"]), "unit": unitLy[i]})
	}
	layanan := obj{
		"jumlahLayanan": len(lay),
		"jumlahUnit":    unik(unitLy),
		"perTarget":     hitungUrut(targetLy, "Belum diisi"),
		"perMetode":     hitungUrut(metodeLy, "Belum diisi"),
		"perArea":       hitungUrut(ly.kolom(lay, kl["ral2"]), "Belum dipetakan"),
		"katalog":       katalogLy,
	}

	// ---------------- Data ----------------
	dt := buatTabel("5-Domain Data", sheet("5-Domain Data"), "ID Data")
	kd := map[string]int{"id": dt.kol("ID Data"), "nama": dt.kol("Nama Data"), "sifat": dt.kol("Sifat Data"), "jenis": dt.kol("Jenis Data"),
		"validitas": dt.kol("Validasi Data"), "produsen": dt.kol("Penghasil Data"), "wali": dt.kol("Penanggung Jawab Data"),
		"rad1": dt.kol("RAD Level 1"), "rad2": dt.kol("RAD Level 2")}
	var dat [][]string
	for _, r := range dt.rows {
		if strings.HasPrefix(dt.ambil(r, kd["id"]), "BKT") {
			dat = append(dat, r)
		}
	}
	sifat := kanonik(dt.kolom(dat, kd["sifat"]))
	jenisData := kanonik(dt.kolom(dat, kd["jenis"]))
	jenisUnik := map[string]bool{}
	for _, v := range jenisData {
		if v != "" {
			jenisUnik[v] = true
		}
	}
	itemData := func(r []string, sifatIni string) obj {
		o := obj{"id": dt.ambil(r, kd["id"]), "nama": dt.ambil(r, kd["nama"]), "jenis": dt.ambil(r, kd["jenis"]),
			"validitas": dt.ambil(r, kd["validitas"]), "produsen": dt.ambil(r, kd["produsen"]), "wali": dt.ambil(r, kd["wali"]),
			"kelompok": dt.ambil(r, kd["rad2"])}
		if sifatIni != "" {
			o["sifat"] = sifatIni
		}
		return o
	}
	katalogData := []obj{}
	for i, r := range dat {
		if sifat[i] == "Terbuka" {
			katalogData = append(katalogData, itemData(r, ""))
		}
	}
	data := obj{
		"jumlahData":       len(dat),
		"jumlahJenis":      len(jenisUnik),
		"perSifat":         hitungUrut(sifat, "Belum diisi"),
		"perJenis":         hitungUrut(jenisData, "Belum diisi"),
		"perValiditas":     hitungUrut(kanonik(dt.kolom(dat, kd["validitas"])), "Belum diisi"),
		"perKelompok":      hitungUrut(dt.kolom(dat, kd["rad1"]), "Belum dipetakan"),
		"tidakDitampilkan": len(dat) - len(katalogData),
		"katalog":          katalogData,
	}

	// ---------------- Aplikasi ----------------
	ap := buatTabel("Aplikasi-Sort", sheet("Aplikasi-Sort"), "Nama Aplikasi")
	ka := map[string]int{"id": ap.kol("ID Aplikasi"), "nama": ap.kol("Nama Aplikasi"), "fungsi": ap.kol("Fungsi Aplikasi"),
		"unit": ap.kol("→ Unit Operasional Teknologi"), "basis": ap.kol("Basis Aplikasi"), "milik": ap.kol("Kepemilikan Aplikasi"),
		"raa1": ap.kol("→ RAA Level 1"), "raa2": ap.kol("→ RAA Level 2")}
	var apl [][]string
	for _, r := range ap.rows {
		if n := ap.ambil(r, ka["nama"]); !kosong(n) && n != "Nama Aplikasi" {
			apl = append(apl, r)
		}
	}
	unitAp := ap.kolom(apl, ka["unit"])
	milik := kanonik(ap.kolom(apl, ka["milik"]))
	raa2 := ap.kolom(apl, ka["raa2"])
	katalogAp := []obj{}
	for i, r := range apl {
		katalogAp = append(katalogAp, obj{"id": ap.ambil(r, ka["id"]), "nama": ap.ambil(r, ka["nama"]), "fungsi": ap.ambil(r, ka["fungsi"]),
			"basis": ap.ambil(r, ka["basis"]), "kepemilikan": milik[i], "jenis": raa2[i], "unit": unitAp[i]})
	}
	aplikasi := obj{
		"jumlahAplikasi": len(apl),
		"jumlahUnit":     unik(unitAp),
		"perKepemilikan": hitungUrut(milik, "Belum diisi"),
		"perJenis":       hitungUrut(ap.kolom(apl, ka["raa1"]), "Belum dipetakan"),
		"perFungsi":      hitungUrut(raa2, "Belum dipetakan"),
		"perBasis":       hitungUrut(kanonik(ap.kolom(apl, ka["basis"])), "Belum diisi"),
		"opdTeratas":     hitung(unitAp, true, 10, ""),
		"katalog":        katalogAp,
	}

	// ---------------- Infrastruktur (hanya angka) ----------------
	inf := buatTabel("7-Domain Infrastruktur", sheet("7-Domain Infrastruktur"), "Architecture category")
	kKat := inf.kol("Architecture category")
	fk := buatTabel("7.a Fasilitas Komputasi", sheet("7.a Fasilitas Komputasi"), "Klasifikasi Tier")
	var fkRows [][]string
	for _, r := range fk.rows {
		if !kosong(fk.ambil(r, fk.kol("ID Fasilitas"))) {
			fkRows = append(fkRows, r)
		}
	}
	jaringan := 0
	if rows := sheet("7.k Jaringan Intra Pemerintah"); len(rows) > 1 {
		for _, r := range rows[1:] {
			v := ""
			if len(r) > 2 {
				v = r[2]
			}
			if !kosong(v) {
				jaringan++
			}
		}
	}
	infrastruktur := obj{
		"perKategori":             hitungUrut(inf.kolom(inf.rows, kKat), ""),
		"jumlahPusatData":         len(fkRows),
		"pusatDataPerKepemilikan": hitungUrut(kanonik(fk.kolom(fkRows, fk.kol("Kepemilikan"))), ""),
		"pusatDataPerTier":        hitungUrut(kanonik(fk.kolom(fkRows, fk.kol("Klasifikasi Tier"))), ""),
		"jumlahJaringanIntra":     jaringan,
	}

	// ---------------- Keamanan (hanya angka yang aman dibuka) ----------------
	km := buatTabel("8-Domain Keamanan", sheet("8-Domain Keamanan"), "Jenis Standar Keamanan")
	jenisStd := kanonik(km.kolom(km.rows, km.kol("Jenis Standar Keamanan")))
	jumlahStd := 0
	for _, v := range jenisStd {
		if v != "" {
			jumlahStd++
		}
	}
	ed := buatTabel("8.b Edukasi Kesadaran Keamanan", sheet("8.b Edukasi Kesadaran Keamanan"), "Tanggal Kegiatan")
	var tahunEdu []string
	for _, r := range ed.rows {
		m := reTahun20.FindString(ed.ambil(r, ed.kol("Tanggal Kegiatan")))
		if m != "" && !kosong(ed.ambil(r, ed.kol("ID Standar"))) {
			tahunEdu = append(tahunEdu, m)
		}
	}
	keamanan := obj{
		"jumlahStandar":   jumlahStd,
		"standarPerJenis": hitungUrut(jenisStd, ""),
		"edukasiPerTahun": hitung(tahunEdu, false, 0, ""),
	}

	// ---------------- Peta Rencana ----------------
	pr := buatTabel("NewPetaRencana", sheet("NewPetaRencana"), "Aktivitas")
	kp := map[string]int{"sasaran": pr.kol("Sasaran"), "muatan": pr.kol("Muatan"), "uic": pr.kol("UIC"), "tahun": pr.kol("Tahun Pelaksanaan"),
		"status": pr.kol("Status Pelaksanaan"), "aktivitas": pr.kol("Aktivitas")}
	var keg [][]string
	for _, r := range pr.rows {
		if !kosong(pr.ambil(r, kp["aktivitas"])) {
			keg = append(keg, r)
		}
	}
	status := kanonik(pr.kolom(keg, kp["status"]))
	terlaksana := func(s string) bool { return s == "Sudah" || s == "Dalam Proses" }
	sudah := 0
	for _, s := range status {
		if terlaksana(s) {
			sudah++
		}
	}
	tahunKeg := make([]string, len(keg))
	setTahun := map[string]bool{}
	for i, r := range keg {
		tahunKeg[i] = tanpaTitikNol(pr.ambil(r, kp["tahun"]))
		if tahunKeg[i] != "" {
			setTahun[tahunKeg[i]] = true
		}
	}
	daftarTahun := make([]string, 0, len(setTahun))
	for t := range setTahun {
		daftarTahun = append(daftarTahun, t)
	}
	sort.Strings(daftarTahun)
	tren := []obj{}
	for _, th := range daftarTahun {
		rencana, laksana := 0, 0
		for i := range keg {
			if tahunKeg[i] == th {
				rencana++
				if terlaksana(status[i]) {
					laksana++
				}
			}
		}
		tren = append(tren, obj{"tahun": th, "direncanakan": rencana, "terlaksana": laksana})
	}
	petaRencana := obj{
		"totalKegiatan":  len(keg),
		"sudahDilakukan": sudah,
		"perStatus":      hitungUrut(status, "Belum diisi"),
		"perMuatan":      hitungUrut(kanonik(pr.kolom(keg, kp["muatan"])), ""),
		"perTahun":       hitung(tahunKeg, false, 0, ""),
		"trenTahunan":    tren,
		"opdTeratas":     hitung(pr.kolom(keg, kp["uic"]), true, 10, ""),
		"sasaranTeratas": hitung(pr.kolom(keg, kp["sasaran"]), true, 8, ""),
	}

	// ---------------- Arsitektur per OPD (sheet UnitKerja: rekap resmi per OPD) ----------------
	uk := buatTabel("UnitKerja", sheet("UnitKerja"), "List OPD")
	perOpd := []obj{}
	total := func(o obj) int {
		return o["prosesBisnis"].(int) + o["layanan"].(int) + o["data"].(int) + o["aplikasi"].(int)
	}
	for _, r := range uk.rows {
		if !reNomor.MatchString(uk.ambil(r, uk.kol("No"))) {
			continue // baris TOTAL dan ringkasan di bawah tabel
		}
		isi := obj{"opd": uk.ambil(r, uk.kol("List OPD")), "akronim": uk.ambil(r, uk.kol("Akronim")),
			"prosesBisnis": angka(uk.ambil(r, uk.kol("Jumlah Probis"))), "layanan": angka(uk.ambil(r, uk.kol("Jumlah Layanan"))),
			"data": angka(uk.ambil(r, uk.kol("Jumlah Data"))), "aplikasi": angka(uk.ambil(r, uk.kol("Jumlah Aplikasi")))}
		ganda := false
		for _, o := range perOpd {
			if o["opd"] == isi["opd"] {
				ganda = true
			}
		}
		if total(isi) > 0 && !ganda {
			perOpd = append(perOpd, isi)
		}
	}
	sort.SliceStable(perOpd, func(i, j int) bool { return total(perOpd[i]) > total(perOpd[j]) })

	judul := "Matriks Evaluasi 2026 SPBE Architecture Kota Bogor (As-Is)"
	diolah := hariIni.Format("2006-01-02")
	publik := obj{
		"sumber":        obj{"judul": judul, "diolah": diolah},
		"perOpd":        perOpd,
		"prosesBisnis":  prosesBisnis,
		"layanan":       layanan,
		"data":          data,
		"aplikasi":      aplikasi,
		"infrastruktur": infrastruktur,
		"keamanan":      keamanan,
		"petaRencana":   petaRencana,
	}
	bPublik, err := keJSON(publik)
	if err != nil {
		return nil, err
	}

	// =====================================================================================
	// DASBOR INTERNAL: tanpa batasan. Dibangun dari salinan data publik lalu ditambah kolom tertutup.
	// =====================================================================================
	var internal obj
	if err := json.Unmarshal(bPublik, &internal); err != nil {
		return nil, err
	}
	sub := func(k string) obj { return internal[k].(obj) }
	katalog := func(k string) []any { return sub(k)["katalog"].([]any) }

	// Layanan: risiko dan mitigasi
	kRisiko, kMitigasi := ly.kol("Risk (Risiko Layanan)"), ly.kol("Control (Mitigasi")
	for i, item := range katalog("layanan") {
		item.(obj)["risiko"] = ly.ambil(lay[i], kRisiko)
		item.(obj)["mitigasi"] = ly.ambil(lay[i], kMitigasi)
	}

	// Data: semua sifat (Terbuka, Terbatas, Tertutup)
	sub("data")["tidakDitampilkan"] = 0
	semuaData := []obj{}
	for i, r := range dat {
		o := itemData(r, sifat[i])
		if sifat[i] == "" {
			o["sifat"] = ""
		}
		semuaData = append(semuaData, o)
	}
	sub("data")["katalog"] = semuaData

	// Aplikasi: rincian teknis
	kt := map[string]int{"url": ap.kol("URL"), "lisensi": ap.kol("Tipe Lisensi"), "database": ap.kol("Nama Basis Data"), "bahasa": ap.kol("Bahasa Pemrograman"),
		"sistemOperasi": ap.kol("Sistem Operasi"), "lokasiServer": ap.kol("Lokasi Server"), "pengembang": ap.kol("Unit Pengembang")}
	for i, item := range katalog("aplikasi") {
		for n, k := range kt {
			item.(obj)[n] = ap.ambil(apl[i], k)
		}
	}

	// Infrastruktur: katalog elemen, pusat data, dan server
	kIDInf, kNamaInf := inf.kol("ID Arsitektur"), inf.kol("Nama Arsitektur")
	katInf := []obj{}
	for _, r := range inf.rows {
		if !kosong(inf.ambil(r, kNamaInf)) {
			katInf = append(katInf, obj{"id": inf.ambil(r, kIDInf), "nama": inf.ambil(r, kNamaInf), "kategori": inf.ambil(r, kKat)})
		}
	}
	sub("infrastruktur")["katalog"] = katInf
	pusatData := []obj{}
	for _, r := range fkRows {
		pusatData = append(pusatData, obj{"nama": fk.ambil(r, fk.kol("Nama Fasilitas")), "lokasi": fk.ambil(r, fk.kol("Lokasi")),
			"bandwidthIntranet": fk.ambil(r, fk.kol("Bandwidth Intranet")), "bandwidthInternet": fk.ambil(r, fk.kol("Bandwidth Internet")),
			"tier": fk.ambil(r, fk.kol("Klasifikasi Tier")), "pengamanan": fk.ambil(r, fk.kol("Sistem Pengamanan")),
			"kepemilikan": fk.ambil(r, fk.kol("Kepemilikan"))})
	}
	sub("infrastruktur")["pusatData"] = pusatData
	sv := buatTabel("7.c Perangkat Keras Server ", sheet("7.c Perangkat Keras Server "), "Nama Perangkat Keras Server")
	server := []obj{}
	for _, r := range sv.rows {
		if kosong(sv.ambil(r, sv.kol("Nama Perangkat"))) {
			continue
		}
		server = append(server, obj{"id": sv.ambil(r, sv.kol("ID Perangkat")), "nama": sv.ambil(r, sv.kol("Nama Perangkat")), "uraian": sv.ambil(r, sv.kol("Uraian")),
			"lokasi": sv.ambil(r, sv.kol("Lokasi")), "penggunaan": sv.ambil(r, sv.kol("Jenis Penggunaan")), "pemilik": sv.ambil(r, sv.kol("Nama Pemilik")),
			"memori": sv.ambil(r, sv.kol("Kapasitas Memori")), "prosesor": sv.ambil(r, sv.kol("Jenis Processor")),
			"sistemOperasi": sv.ambil(r, sv.kol("Sistem Operasi"))})
	}
	sub("infrastruktur")["server"] = server

	// Keamanan: seluruh subdomain, termasuk kerentanan, insiden, dan hasil audit
	subSheet := []string{"8.a Standar, Prosedur, dan Regu", "8.b Edukasi Kesadaran Keamanan", "8.c Identifikasi Kerentanan Kea", "8.d Peningkatan Keamanan",
		"8.e Penanganan Insiden Keamanan", "8.f Audit Keamanan", "8.g Kelaikan Keamanan"}
	namaSub := []string{"Standar, prosedur, dan regulasi", "Edukasi kesadaran", "Identifikasi kerentanan", "Peningkatan keamanan",
		"Penanganan insiden", "Audit keamanan", "Kelaikan keamanan"}
	katKeamanan := []obj{}
	var katKmn, hasilAudit, tindakLanjut []string
	for i, sh := range subSheet {
		semua := sheet(sh)
		if len(semua) < 2 {
			continue
		}
		t := buatTabel(sh, semua, "No")
		for _, r := range t.rows {
			rid, nama := t.ambil(r, 2), t.ambil(r, 3)
			if kosong(nama) {
				continue
			}
			tgl := t.ambil(r, 7)
			if tgl == "" {
				tgl = t.ambil(r, 5)
			}
			item := obj{"kategori": namaSub[i], "id": rid, "nama": nama, "uraian": t.ambil(r, 4), "tanggal": tanggalExcel(tgl),
				"hasilAudit": t.ambil(r, 9), "jenisAudit": t.ambil(r, 10), "tindakLanjut": t.ambil(r, 11)}
			katKeamanan = append(katKeamanan, item)
			katKmn = append(katKmn, namaSub[i])
			hasilAudit = append(hasilAudit, t.ambil(r, 9))
			tindakLanjut = append(tindakLanjut, t.ambil(r, 11))
		}
	}
	sub("keamanan")["perSubdomain"] = hitungUrut(katKmn, "")
	sub("keamanan")["perHasilAudit"] = hitungUrut(hasilAudit, "Belum diisi")
	sub("keamanan")["perTindakLanjut"] = hitungUrut(tindakLanjut, "Belum diisi")
	sub("keamanan")["katalog"] = katKeamanan

	// Peta Rencana: katalog kegiatan lengkap dengan estimasi nominal
	kp2 := map[string]int{"indikator": pr.kol("Indikator"), "nominal": pr.kol("Estimasi Nominal")}
	katPR := []obj{}
	for i, r := range keg {
		katPR = append(katPR, obj{"aktivitas": pr.ambil(r, kp["aktivitas"]), "sasaran": pr.ambil(r, kp["sasaran"]), "muatan": pr.ambil(r, kp["muatan"]),
			"indikator": pr.ambil(r, kp2["indikator"]), "uic": pr.ambil(r, kp["uic"]), "tahun": tahunKeg[i],
			"status": status[i], "nominal": pr.ambil(r, kp2["nominal"])})
	}
	sub("petaRencana")["katalog"] = katPR

	bInternal, err := keJSON(internal)
	if err != nil {
		return nil, err
	}

	return &Hasil{
		Publik:   bPublik,
		Internal: bInternal,
		Ringkasan: Ringkasan{
			Judul: judul, Diolah: diolah, Opd: len(perOpd), ProsesBisnis: len(probis), Iku: len(daftarIku),
			Layanan: len(lay), Data: len(dat), DataTerbuka: len(katalogData), Aplikasi: len(apl),
			PusatData: len(fkRows), Server: len(server), ItemKeamanan: len(katKeamanan), KegiatanPetaRencana: len(keg),
		},
	}, nil
}

func keJSON(v any) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	return bytes.TrimRight(buf.Bytes(), "\n"), nil
}
