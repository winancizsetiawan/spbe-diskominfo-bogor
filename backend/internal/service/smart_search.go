package service

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"unicode/utf8"

	"spbe-backend/internal/domain"
)

// tingkatAksesCari menyeragamkan aturan visibilitas lintas modul tanpa percabangan if/else berulang.
type tingkatAksesCari int

const (
	aksesCariPublik tingkatAksesCari = iota
	aksesCariLogin
	aksesCariPengelolaInstansi
)

// dokumenIndeks adalah representasi terpadu satu item di dalam indeks pencarian pintar.
type dokumenIndeks struct {
	Tipe       string
	ID         uint
	Judul      string
	Isi        string
	Atribut    string // Kategori, nama OPD, label, kode, versi
	Meta       string
	URL        string
	Akses      tingkatAksesCari
	InstansiID uint
}

// bolehDiaksesCari adalah satu-satunya gerbang pemeriksa hak akses pencarian lintas modul.
func bolehDiaksesCari(d dokumenIndeks, u *domain.User) bool {
	switch d.Akses {
	case aksesCariPublik:
		return true
	case aksesCariLogin:
		return u != nil
	case aksesCariPengelolaInstansi:
		if u == nil {
			return false
		}
		if u.Role == domain.RoleSuperAdmin {
			return true
		}
		return u.Role == domain.RoleAdminOPD && d.InstansiID == u.Instansi.ID
	default:
		return false
	}
}

// kataHentiCari berisi kata tanya dan kata sambung umum agar vektor fokus pada inti kueri.
var kataHentiCari = map[string]bool{
	"apa": true, "apakah": true, "bagaimana": true, "cara": true, "siapa": true,
	"dimana": true, "kapan": true, "mengapa": true, "kenapa": true, "berapa": true,
	"yang": true, "dan": true, "di": true, "ke": true, "dari": true, "untuk": true,
	"pada": true, "adalah": true, "dengan": true, "atau": true, "ini": true,
	"itu": true, "saja": true, "bisa": true, "dapat": true, "dalam": true,
	"tentang": true, "terkait": true, "oleh": true, "jika": true, "bila": true,
	"sudah": true, "belum": true, "akan": true, "saya": true, "kami": true,
	"kita": true, "ada": true, "tidak": true, "agar": true, "supaya": true,
}

// kamusSinonimPintar memetakan kata ke istilah sepadan di domain pemerintahan & Arsitektur Digital.
var kamusSinonimPintar = map[string][]string{
	"backup":      {"cadangan", "pemulihan", "restore", "salinan"},
	"cadangan":    {"backup", "pemulihan", "restore"},
	"pemulihan":   {"backup", "cadangan", "restore"},
	"keamanan":    {"siber", "bssn", "iso", "sandi", "password", "2fa", "enkripsi", "pdp", "perlindungan", "privasi"},
	"siber":       {"keamanan", "bssn", "iso", "enkripsi"},
	"sandi":       {"password", "kredensial", "login", "akun", "keamanan"},
	"password":    {"sandi", "kredensial", "login", "akun"},
	"akun":        {"pengguna", "login", "masuk", "sso", "undangan", "sandi"},
	"login":       {"masuk", "akun", "sso", "autentikasi", "2fa"},
	"masuk":       {"login", "akun", "sso", "autentikasi"},
	"arsitektur":  {"spbe", "raa", "domain", "digital", "pemerintah", "peta"},
	"spbe":        {"arsitektur", "digital", "raa", "pemerintah"},
	"raa":         {"arsitektur", "referensi", "klasifikasi", "domain"},
	"aplikasi":    {"sistem", "layanan", "katalog", "portal"},
	"sistem":      {"aplikasi", "layanan", "portal"},
	"integrasi":   {"splp", "interoperabilitas", "api", "penghubung", "layanan"},
	"interoperabilitas": {"integrasi", "splp", "api", "data"},
	"data":        {"informasi", "pdp", "basisdata", "cadangan"},
	"informasi":   {"data", "berita", "artikel"},
	"evaluasi":    {"indeks", "penilaian", "kepatuhan", "validasi"},
	"regulasi":    {"peraturan", "perpres", "perwali", "uu", "kebijakan", "hukum"},
	"peraturan":   {"regulasi", "perpres", "perwali", "uu", "kebijakan"},
	"sop":         {"prosedur", "panduan", "alur", "tata", "pedoman", "standar"},
	"prosedur":    {"sop", "panduan", "alur", "pedoman"},
	"panduan":     {"pedoman", "bantuan", "sop", "petunjuk", "tutorial"},
	"bantuan":     {"faq", "panduan", "petunjuk", "tanya"},
	"flowchart":   {"diagram", "alur", "proses", "bisnis", "bpmn"},
	"diagram":     {"flowchart", "alur", "proses", "bpmn"},
	"alur":        {"flowchart", "diagram", "proses", "sop"},
	"dokumen":     {"berkas", "repositori", "file", "pdf", "unduh", "unggah"},
	"berkas":      {"dokumen", "file", "unggah", "unduh"},
	"unduh":       {"download", "dokumen", "berkas"},
	"unggah":      {"upload", "dokumen", "berkas"},
	"forum":       {"diskusi", "thread", "balasan", "komentar"},
	"diskusi":     {"forum", "thread", "balasan"},
	"kursus":      {"pembelajaran", "materi", "pelatihan", "belajar", "modul"},
	"pembelajaran": {"kursus", "materi", "pelatihan", "belajar"},
	"opd":         {"instansi", "dinas", "badan", "perangkat"},
	"instansi":    {"opd", "dinas", "perangkat"},
}

var labelTipeSingkat = map[string]string{
	"dokumen":   "Dokumen",
	"sop":       "SOP",
	"forum":     "Forum Diskusi",
	"berita":    "Berita & Artikel",
	"bantuan":   "Pusat Bantuan",
	"kursus":    "Kursus Pembelajaran",
	"aplikasi":  "Katalog Aplikasi",
	"flowchart": "Diagram Alur",
}

// akarKata melakukan stemming ringan Bahasa Indonesia agar kata berimbuhan cocok dengan kata dasarnya.
func akarKata(kata string) string {
	w := strings.ToLower(strings.TrimSpace(kata))
	if utf8.RuneCountInString(w) <= 4 {
		return w
	}
	for _, suf := range []string{"annya", "kannya", "nya", "kan", "an"} {
		if strings.HasSuffix(w, suf) && utf8.RuneCountInString(w)-len(suf) >= 4 {
			w = strings.TrimSuffix(w, suf)
			break
		}
	}
	if utf8.RuneCountInString(w) <= 4 {
		return w
	}
	for _, pref := range []string{"meng", "meny", "men", "mem", "me", "peng", "peny", "pen", "pem", "pe", "ber", "ter", "di", "ke"} {
		if strings.HasPrefix(w, pref) && utf8.RuneCountInString(w)-len(pref) >= 4 {
			w = strings.TrimPrefix(w, pref)
			break
		}
	}
	return w
}

// ekstrakKataBermakna mengambil kata kunci inti dari kueri (membuang kata tanya/sambung umum).
func ekstrakKataBermakna(q string) []string {
	semua := ekstrakKataKunci(q)
	inti := make([]string, 0, len(semua))
	for _, k := range semua {
		if !kataHentiCari[k] {
			inti = append(inti, k)
		}
	}
	if len(inti) == 0 {
		return semua
	}
	return inti
}

// jarakEditSatu memeriksa apakah dua kata hanya berbeda maksimal 1 karakter (toleransi salah ketik).
func jarakEditSatu(a, b string) bool {
	if a == b {
		return true
	}
	la, lb := len(a), len(b)
	if la < 5 || lb < 5 {
		return false
	}
	selisih := la - lb
	if selisih < -1 || selisih > 1 {
		return false
	}
	i, j, beda := 0, 0, 0
	for i < la && j < lb {
		if a[i] == b[j] {
			i++
			j++
			continue
		}
		beda++
		if beda > 1 {
			return false
		}
		if la > lb {
			i++
		} else if lb > la {
			j++
		} else {
			i++
			j++
		}
	}
	if i < la || j < lb {
		beda++
	}
	return beda <= 1
}

// bangunIndeksTerpadu mengumpulkan seluruh entitas dari database & bantuan statis ke satu struktur seragam.
func (s *PortalModulService) bangunIndeksTerpadu() []dokumenIndeks {
	indeks := make([]dokumenIndeks, 0, 128)

	// 1. Dokumen & SOP
	dokList, _ := s.repo.FindAllDokumen()
	for _, d := range dokList {
		if d.Status != domain.StatusDokBerlaku && d.Status != domain.StatusDokReview {
			continue
		}
		akses := aksesCariLogin
		if d.Status == domain.StatusDokBerlaku && d.Visibilitas == domain.VisibilitasPublik && d.Jenis != domain.JenisSOP {
			akses = aksesCariPublik
		}
		tipeItem := "dokumen"
		if d.Jenis == domain.JenisSOP {
			tipeItem = "sop"
		}
		katLabel := jenisDokLabel[d.Jenis]
		if d.Kategori != nil && d.Kategori.Nama != "" {
			katLabel = d.Kategori.Nama
		}
		sumber := ""
		if d.Sumber != nil {
			sumber = *d.Sumber
		}
		indeks = append(indeks, dokumenIndeks{
			Tipe:    tipeItem,
			ID:      d.ID,
			Judul:   d.Judul,
			Isi:     d.Deskripsi,
			Atribut: fmt.Sprintf("%s %s v%s %s %s", katLabel, jenisDokLabel[d.Jenis], d.Versi, sumber, d.TipeBerkas),
			Meta:    fmt.Sprintf("%s · v%s", katLabel, d.Versi),
			URL:     fmt.Sprintf("/dokumen/%d", d.ID),
			Akses:   akses,
		})
	}

	// 2. Forum Diskusi
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
		indeks = append(indeks, dokumenIndeks{
			Tipe:    "forum",
			ID:      t.ID,
			Judul:   t.Judul,
			Isi:     t.Konten,
			Atribut: fmt.Sprintf("%s %s %s", katNama, penulis.Nama, penulis.Instansi),
			Meta:    fmt.Sprintf("%s · %s", katNama, penulis.Nama),
			URL:     fmt.Sprintf("/forum/%d", t.ID),
			Akses:   aksesCariLogin,
		})
	}

	// 3. Berita & Artikel
	artikelList, _ := s.repo.FindAllArtikel("semua", true)
	for _, a := range artikelList {
		if a.StatusVerifikasi != "" && a.StatusVerifikasi != domain.StatusArtikelTerbit {
			continue
		}
		akses := aksesCariPublik
		if a.StatusAkses == domain.AksesInternal {
			akses = aksesCariLogin
		}
		jenisLabel := "Artikel"
		if a.Jenis == domain.JenisArtikelBerita {
			jenisLabel = "Berita"
		}
		labelGabung := strings.Join([]string(a.Label), " ")
		indeks = append(indeks, dokumenIndeks{
			Tipe:    "berita",
			ID:      a.ID,
			Judul:   a.Judul,
			Isi:     strings.TrimSpace(a.Ringkasan + " " + a.Konten),
			Atribut: fmt.Sprintf("%s %s %s %s", jenisLabel, a.Kategori, labelGabung, a.Penulis),
			Meta:    fmt.Sprintf("%s · %s", jenisLabel, a.Penulis),
			URL:     fmt.Sprintf("/berita/%d", a.ID),
			Akses:   akses,
		})
	}

	// 4. Pusat Bantuan (FAQ & Panduan)
	bantuan := DataBantuanStatis()
	seqBantuan := uint(1)
	for _, f := range bantuan.FAQ {
		indeks = append(indeks, dokumenIndeks{
			Tipe:    "bantuan",
			ID:      seqBantuan,
			Judul:   f.Pertanyaan,
			Isi:     f.Jawaban,
			Atribut: "FAQ Pusat Bantuan Tanya Jawab",
			Meta:    "Pusat bantuan",
			URL:     "/bantuan",
			Akses:   aksesCariPublik,
		})
		seqBantuan++
	}
	for _, p := range bantuan.Panduan {
		indeks = append(indeks, dokumenIndeks{
			Tipe:    "bantuan",
			ID:      seqBantuan,
			Judul:   p.Judul,
			Isi:     p.Isi,
			Atribut: "Panduan Pusat Bantuan Petunjuk",
			Meta:    "Pusat bantuan",
			URL:     "/bantuan",
			Akses:   aksesCariPublik,
		})
		seqBantuan++
	}

	// 5. Kursus Pembelajaran
	kursusList, _ := s.repo.FindAllKursus()
	for _, k := range kursusList {
		indeks = append(indeks, dokumenIndeks{
			Tipe:    "kursus",
			ID:      k.ID,
			Judul:   k.Judul,
			Isi:     k.Deskripsi,
			Atribut: fmt.Sprintf("%s %d jam pembelajaran kursus", k.Kategori, k.DurasiJam),
			Meta:    fmt.Sprintf("%s · %d jam", k.Kategori, k.DurasiJam),
			URL:     fmt.Sprintf("/pembelajaran/%d", k.ID),
			Akses:   aksesCariLogin,
		})
	}

	// 6. Katalog Aplikasi OPD
	aplList, _ := s.repo.FindAllAplikasi()
	for _, a := range aplList {
		kat := "Belum dikategorikan"
		if a.Kategori != nil && *a.Kategori != "" {
			kat = *a.Kategori
		}
		instNama := "Instansi"
		if a.Instansi.Nama != "" {
			instNama = a.Instansi.Nama
		}
		indeks = append(indeks, dokumenIndeks{
			Tipe:       "aplikasi",
			ID:         a.ID,
			Judul:      a.Nama,
			Isi:        a.Deskripsi,
			Atribut:    fmt.Sprintf("%s %s %s %s", instNama, kat, a.StatusRaa, a.StatusValidasi),
			Meta:       fmt.Sprintf("%s · %s", instNama, kat),
			URL:        "/katalog/aplikasi",
			Akses:      aksesCariPengelolaInstansi,
			InstansiID: a.InstansiID,
		})
	}

	// 7. Flowchart Proses Bisnis OPD
	fcList, _ := s.repo.FindAllFlowchart()
	for _, f := range fcList {
		instNama := ""
		if f.Instansi.Nama != "" {
			instNama = f.Instansi.Nama
		}
		indeks = append(indeks, dokumenIndeks{
			Tipe:       "flowchart",
			ID:         f.ID,
			Judul:      f.Nama,
			Isi:        f.Deskripsi,
			Atribut:    fmt.Sprintf("%s %s %s %s v%s", f.Kode, f.Kategori, f.Pic, instNama, f.Versi),
			Meta:       fmt.Sprintf("%s · v%s", f.Kode, f.Versi),
			URL:        fmt.Sprintf("/katalog/flowchart/%d", f.ID),
			Akses:      aksesCariPengelolaInstansi,
			InstansiID: f.InstansiID,
		})
	}

	return indeks
}

// buatVektorDokumen mengubah dokumen menjadi vektor bobot fitur (kata asli + akar kata) dengan bobot kolom.
func buatVektorDokumen(d dokumenIndeks) (map[string]float64, []string) {
	vektor := make(map[string]float64)
	tokenUnik := make(map[string]bool)

	tambahBagian := func(teks string, bobot float64) {
		tokens := polaKataKunci.FindAllString(strings.ToLower(teks), -1)
		for _, tok := range tokens {
			if utf8.RuneCountInString(tok) < 2 {
				continue
			}
			vektor[tok] += bobot
			tokenUnik[tok] = true
			akar := akarKata(tok)
			if akar != tok && utf8.RuneCountInString(akar) >= 3 {
				vektor[akar] += bobot * 0.85
			}
		}
	}

	tambahBagian(d.Judul, 3.2)
	tambahBagian(d.Atribut, 2.0)
	tambahBagian(d.Isi, 1.2)

	daftarToken := make([]string, 0, len(tokenUnik))
	for t := range tokenUnik {
		daftarToken = append(daftarToken, t)
	}
	return vektor, daftarToken
}

// buatVektorKueri mengubah kueri menjadi vektor dimensi konsep (termasuk akar kata & ekspansi sinonim domain).
func buatVektorKueri(kataInti []string) map[string]float64 {
	qVec := make(map[string]float64)
	for _, w := range kataInti {
		qVec[w] += 3.0
		akar := akarKata(w)
		if akar != w && utf8.RuneCountInString(akar) >= 3 {
			qVec[akar] += 2.4
		}
		for _, sin := range kamusSinonimPintar[w] {
			qVec[sin] += 1.4
			akarSin := akarKata(sin)
			if akarSin != sin && utf8.RuneCountInString(akarSin) >= 3 {
				qVec[akarSin] += 1.1
			}
		}
		if akar != w {
			for _, sin := range kamusSinonimPintar[akar] {
				qVec[sin] += 1.2
			}
		}
	}
	return qVec
}

// hitungSkorVektor menghitung kemiripan vektor TF-IDF + Cosine Similarity + pencocokan frasa/fuzzy.
func hitungSkorVektor(
	d dokumenIndeks,
	dVec map[string]float64,
	dTokens []string,
	qVec map[string]float64,
	idf map[string]float64,
	kataInti []string,
	kueriUtuh string,
) float64 {
	dot := 0.0
	normQ := 0.0
	normD := 0.0

	for term, qWeight := range qVec {
		wIDF := idf[term]
		if wIDF == 0 {
			wIDF = 1.0
		}
		qw := qWeight * wIDF
		normQ += qw * qw
		if dw, ok := dVec[term]; ok {
			dot += qw * (dw * wIDF)
		}
	}

	for term, dWeight := range dVec {
		wIDF := idf[term]
		if wIDF == 0 {
			wIDF = 1.0
		}
		dw := dWeight * wIDF
		normD += dw * dw
	}

	skorCosine := 0.0
	if normQ > 0 && normD > 0 && dot > 0 {
		skorCosine = (dot / (math.Sqrt(normQ) * math.Sqrt(normD))) * 10.0
	}

	judulLow := strings.ToLower(d.Judul)
	atributLow := strings.ToLower(d.Atribut)
	isiLow := strings.ToLower(d.Isi)
	gabungLow := judulLow + " " + atributLow + " " + isiLow

	skorTambahan := 0.0
	if len(kueriUtuh) >= 3 && strings.Contains(judulLow, kueriUtuh) {
		skorTambahan += 5.0
	} else if len(kueriUtuh) >= 3 && strings.Contains(gabungLow, kueriUtuh) {
		skorTambahan += 2.5
	}

	for _, w := range kataInti {
		if strings.Contains(judulLow, w) {
			skorTambahan += 3.0
			continue
		}
		if strings.Contains(atributLow, w) {
			skorTambahan += 2.0
			continue
		}
		if strings.Contains(isiLow, w) {
			skorTambahan += 1.5
			continue
		}

		// Pencocokan sinonim substring
		cocokSinonim := false
		for _, sin := range kamusSinonimPintar[w] {
			if strings.Contains(gabungLow, sin) {
				skorTambahan += 0.9
				cocokSinonim = true
				break
			}
		}
		if cocokSinonim {
			continue
		}

		// Toleransi salah ketik (fuzzy edit distance <= 1)
		for _, tok := range dTokens {
			if jarakEditSatu(w, tok) {
				skorTambahan += 1.1
				break
			}
		}
	}

	if skorCosine == 0 && skorTambahan == 0 {
		return 0
	}
	return skorCosine + skorTambahan
}

// pecahKalimat memisahkan teks menjadi kalimat-kalimat bersih untuk ekstraksi jawaban singkat.
func pecahKalimat(teks string) []string {
	bersih := strings.ReplaceAll(teks, "\r\n", ". ")
	bersih = strings.ReplaceAll(bersih, "\n", ". ")
	mentah := strings.FieldsFunc(bersih, func(r rune) bool {
		return r == '.' || r == '!' || r == '?'
	})
	hasil := make([]string, 0, len(mentah))
	for _, k := range mentah {
		trim := strings.TrimSpace(k)
		if utf8.RuneCountInString(trim) >= 12 {
			hasil = append(hasil, trim)
		}
	}
	if len(hasil) == 0 && strings.TrimSpace(teks) != "" {
		hasil = append(hasil, strings.TrimSpace(teks))
	}
	return hasil
}

// pilihKalimatTerbaik memilih kalimat dari dokumen yang paling menjawab kata kunci & sinonim kueri.
func pilihKalimatTerbaik(teks string, kataInti []string) string {
	kalimatList := pecahKalimat(teks)
	if len(kalimatList) == 0 {
		return strings.TrimSpace(teks)
	}
	terbaik := kalimatList[0]
	skorTerbaik := -1.0

	for idx, kal := range kalimatList {
		low := strings.ToLower(kal)
		skor := 0.0
		if idx == 0 {
			skor += 0.2 // Sedikit prioritas untuk kalimat pembuka bila skor sama
		}
		for _, w := range kataInti {
			akar := akarKata(w)
			if strings.Contains(low, w) {
				skor += 2.5
			} else if len(akar) >= 3 && strings.Contains(low, akar) {
				skor += 1.8
			}
			for _, sin := range kamusSinonimPintar[w] {
				if strings.Contains(low, sin) {
					skor += 1.0
				}
			}
		}
		if skor > skorTerbaik {
			skorTerbaik = skor
			terbaik = kal
		}
	}

	if utf8.RuneCountInString(terbaik) > 220 {
		runes := []rune(terbaik)
		terbaik = strings.TrimSpace(string(runes[:217])) + "…"
	}
	if !strings.HasSuffix(terbaik, ".") && !strings.HasSuffix(terbaik, "…") {
		terbaik += "."
	}
	return terbaik
}

// buatJawabanSingkat merangkum jawaban singkat 100% dari data internal portal yang lolos pencarian (tanpa pengetahuan luar).
func buatJawabanSingkat(hasil []hasilSkorIndeks, kataInti []string) *domain.JawabanSingkatDTO {
	if len(hasil) == 0 {
		return nil
	}

	utama := hasil[0].Dok
	kalimatUtama := pilihKalimatTerbaik(utama.Isi, kataInti)
	labelUtama := labelTipeSingkat[utama.Tipe]
	if labelUtama == "" {
		labelUtama = "Data Portal"
	}

	var bagianTeks []string
	if utama.Tipe == "bantuan" {
		bagianTeks = append(bagianTeks, fmt.Sprintf("Berdasarkan %s (“%s”): %s", labelUtama, utama.Judul, kalimatUtama))
	} else {
		bagianTeks = append(bagianTeks, fmt.Sprintf("Berdasarkan %s “%s” (%s): %s", labelUtama, utama.Judul, utama.Meta, kalimatUtama))
	}

	// Tambahkan rujukan pendukung kedua jika relevan dan bukan duplikat judul
	if len(hasil) > 1 && hasil[1].Skor >= hasil[0].Skor*0.55 && hasil[1].Dok.Judul != utama.Judul {
		kedua := hasil[1].Dok
		labelKedua := labelTipeSingkat[kedua.Tipe]
		if labelKedua == "" {
			labelKedua = "Data Portal"
		}
		kalimatKedua := pilihKalimatTerbaik(kedua.Isi, kataInti)
		bagianTeks = append(bagianTeks, fmt.Sprintf("Informasi terkait pada %s “%s”: %s", labelKedua, kedua.Judul, kalimatKedua))
	}

	batasSumber := 3
	if len(hasil) < batasSumber {
		batasSumber = len(hasil)
	}
	sumber := make([]domain.SumberJawabanDTO, 0, batasSumber)
	for i := 0; i < batasSumber; i++ {
		d := hasil[i].Dok
		sumber = append(sumber, domain.SumberJawabanDTO{
			Tipe:  d.Tipe,
			ID:    d.ID,
			Judul: d.Judul,
			Meta:  d.Meta,
			URL:   d.URL,
		})
	}

	keyakinan := "sedang"
	if hasil[0].Skor >= 6.0 {
		keyakinan = "tinggi"
	}

	return &domain.JawabanSingkatDTO{
		Teks:      strings.Join(bagianTeks, " "),
		Keyakinan: keyakinan,
		KataKunci: kataInti,
		Sumber:    sumber,
	}
}

type hasilSkorIndeks struct {
	Dok  dokumenIndeks
	Skor float64
}

// jalankanSmartSearch mengeksekusi pencarian berbasis vektor & ekstraksi jawaban singkat di atas indeks terpadu.
func (s *PortalModulService) jalankanSmartSearch(u *domain.User, q string) ([]hasilSkorIndeks, []string) {
	semuaIndeks := s.bangunIndeksTerpadu()

	// 1. Saring hak akses secara deklaratif dengan satu fungsi aturan
	diizinkan := make([]dokumenIndeks, 0, len(semuaIndeks))
	for _, d := range semuaIndeks {
		if bolehDiaksesCari(d, u) {
			diizinkan = append(diizinkan, d)
		}
	}

	kataInti := ekstrakKataBermakna(q)
	if len(kataInti) == 0 {
		return nil, nil
	}

	// 2. Bangun vektor dokumen dan tabel IDF (Inverse Document Frequency)
	vektorDokList := make([]map[string]float64, len(diizinkan))
	tokenDokList := make([][]string, len(diizinkan))
	df := make(map[string]int)

	for i, d := range diizinkan {
		vec, toks := buatVektorDokumen(d)
		vektorDokList[i] = vec
		tokenDokList[i] = toks
		for term := range vec {
			df[term]++
		}
	}

	totalDok := float64(len(diizinkan))
	idf := make(map[string]float64, len(df))
	for term, freq := range df {
		idf[term] = math.Log(1.0+(totalDok/float64(freq+1))) + 1.0
	}

	// 3. Bangun vektor kueri (termasuk ekspansi konsep & sinonim) lalu hitung skor vektor
	qVec := buatVektorKueri(kataInti)
	kueriUtuh := strings.ToLower(strings.TrimSpace(q))

	bernilai := make([]hasilSkorIndeks, 0, 16)
	for i, d := range diizinkan {
		skor := hitungSkorVektor(d, vektorDokList[i], tokenDokList[i], qVec, idf, kataInti, kueriUtuh)
		if skor > 0 {
			bernilai = append(bernilai, hasilSkorIndeks{Dok: d, Skor: skor})
		}
	}

	sort.SliceStable(bernilai, func(i, j int) bool {
		if math.Abs(bernilai[i].Skor-bernilai[j].Skor) > 1e-6 {
			return bernilai[i].Skor > bernilai[j].Skor
		}
		return strings.ToLower(bernilai[i].Dok.Judul) < strings.ToLower(bernilai[j].Dok.Judul)
	})

	return bernilai, kataInti
}
