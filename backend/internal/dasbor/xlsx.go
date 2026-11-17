// Package dasbor mengubah Excel "Matriks Evaluasi SPBE Architecture" menjadi data Dasbor Publik dan
// Dasbor Analitik. Ini port dari frontend/scripts/excel_dasbor_publik.py (hasilnya harus sama), agar
// Super Admin dapat memperbarui dasbor langsung dari web tanpa Python.
package dasbor

import (
	"archive/zip"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"unicode"
)

const (
	nsMain = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
	nsRel  = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
	// Batas ukuran setelah dekompresi per bagian xlsx, untuk menahan "zip bomb".
	batasBagian = 200 << 20
)

// ErrFormat menandai Excel yang tidak sesuai format matriks (pesannya aman ditampilkan ke pengguna).
type ErrFormat struct{ Pesan string }

func (e *ErrFormat) Error() string { return e.Pesan }

func galatFormat(format string, a ...any) *ErrFormat {
	return &ErrFormat{Pesan: fmt.Sprintf(format, a...)}
}

// spasi sama dengan \s pada regex Python untuk teks: whitespace Unicode ditambah \x1c-\x1f.
func spasi(r rune) bool { return unicode.IsSpace(r) || (r >= 0x1c && r <= 0x1f) }

type buku struct {
	z      *zip.Reader
	shared []string
	sheet  map[string]string // nama sheet -> path di dalam zip
}

func bacaBagian(z *zip.Reader, nama string) (io.ReadCloser, error) {
	for _, f := range z.File {
		if f.Name == nama {
			rc, err := f.Open()
			if err != nil {
				return nil, err
			}
			return struct {
				io.Reader
				io.Closer
			}{&pembatas{r: rc, sisa: batasBagian}, rc}, nil
		}
	}
	return nil, errors.New("bagian " + nama + " tidak ada")
}

type pembatas struct {
	r    io.Reader
	sisa int64
}

func (p *pembatas) Read(b []byte) (int, error) {
	if p.sisa <= 0 {
		return 0, galatFormat("Berkas Excel terlalu besar setelah diekstrak.")
	}
	if int64(len(b)) > p.sisa {
		b = b[:p.sisa]
	}
	n, err := p.r.Read(b)
	p.sisa -= int64(n)
	return n, err
}

func adaBagian(z *zip.Reader, nama string) bool {
	for _, f := range z.File {
		if f.Name == nama {
			return true
		}
	}
	return false
}

// teksDalam mengumpulkan semua teks <t> di bawah elemen yang sedang dibuka sampai elemen itu ditutup.
func teksDalam(d *xml.Decoder) (string, error) {
	var sb strings.Builder
	dalamT, kedalaman := false, 1
	for kedalaman > 0 {
		tok, err := d.Token()
		if err != nil {
			return "", err
		}
		switch t := tok.(type) {
		case xml.StartElement:
			kedalaman++
			if t.Name.Local == "t" {
				dalamT = true
			}
		case xml.EndElement:
			kedalaman--
			if t.Name.Local == "t" {
				dalamT = false
			}
		case xml.CharData:
			if dalamT {
				sb.Write(t)
			}
		}
	}
	return sb.String(), nil
}

func bukaXlsx(r io.ReaderAt, ukuran int64) (*buku, error) {
	z, err := zip.NewReader(r, ukuran)
	if err != nil {
		return nil, galatFormat("Berkas bukan Excel (.xlsx) yang valid.")
	}
	b := &buku{z: z, sheet: map[string]string{}}

	if adaBagian(z, "xl/sharedStrings.xml") {
		rc, err := bacaBagian(z, "xl/sharedStrings.xml")
		if err != nil {
			return nil, err
		}
		d := xml.NewDecoder(rc)
		for {
			tok, err := d.Token()
			if err == io.EOF {
				break
			}
			if err != nil {
				rc.Close()
				return nil, galatFormat("Berkas Excel rusak (sharedStrings).")
			}
			if s, ok := tok.(xml.StartElement); ok && s.Name.Local == "si" {
				teks, err := teksDalam(d)
				if err != nil {
					rc.Close()
					return nil, galatFormat("Berkas Excel rusak (sharedStrings).")
				}
				b.shared = append(b.shared, teks)
			}
		}
		rc.Close()
	}

	var wb struct {
		Sheets []struct {
			Name string `xml:"name,attr"`
			RID  string `xml:"http://schemas.openxmlformats.org/officeDocument/2006/relationships id,attr"`
		} `xml:"sheets>sheet"`
	}
	var rels struct {
		Rel []struct {
			ID     string `xml:"Id,attr"`
			Target string `xml:"Target,attr"`
		} `xml:"Relationship"`
	}
	for nama, tujuan := range map[string]any{"xl/workbook.xml": &wb, "xl/_rels/workbook.xml.rels": &rels} {
		rc, err := bacaBagian(z, nama)
		if err != nil {
			return nil, galatFormat("Berkas bukan Excel (.xlsx) yang valid.")
		}
		err = xml.NewDecoder(rc).Decode(tujuan)
		rc.Close()
		if err != nil {
			return nil, galatFormat("Berkas Excel rusak (%s).", nama)
		}
	}
	target := map[string]string{}
	for _, r := range rels.Rel {
		target[r.ID] = r.Target
	}
	for _, s := range wb.Sheets {
		t := strings.TrimLeft(target[s.RID], "/")
		if !strings.HasPrefix(t, "xl/") {
			t = "xl/" + t
		}
		b.sheet[s.Name] = t
	}
	return b, nil
}

func kolomKeAngka(ref string) int {
	n := 0
	for _, ch := range ref {
		if ch < 'A' || ch > 'Z' {
			break
		}
		n = n*26 + int(ch-'A'+1)
	}
	return n - 1
}

// baris membaca seluruh baris sheet seperti baca_xlsx.baris: sel kosong diisi "", baris kosong dilewati.
func (b *buku) baris(namaSheet string) ([][]string, error) {
	path, ada := b.sheet[namaSheet]
	if !ada {
		return nil, galatFormat("Sheet \"%s\" tidak ditemukan di Excel.", strings.TrimSpace(namaSheet))
	}
	rc, err := bacaBagian(b.z, path)
	if err != nil {
		return nil, galatFormat("Sheet \"%s\" tidak dapat dibaca.", namaSheet)
	}
	defer rc.Close()
	d := xml.NewDecoder(rc)

	var hasil [][]string
	var sel map[int]string
	adaIsi := false
	for {
		tok, err := d.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			var ef *ErrFormat
			if errors.As(err, &ef) {
				return nil, ef
			}
			return nil, galatFormat("Sheet \"%s\" rusak.", namaSheet)
		}
		switch t := tok.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "row":
				sel, adaIsi = map[int]string{}, false
			case "c":
				var ref, tipe string
				for _, a := range t.Attr {
					switch a.Name.Local {
					case "r":
						ref = a.Value
					case "t":
						tipe = a.Value
					}
				}
				nilai, punyaNilai, err := bacaSel(d, tipe, b.shared)
				if err != nil {
					return nil, galatFormat("Sheet \"%s\" rusak.", namaSheet)
				}
				if !punyaNilai {
					continue
				}
				v := strings.TrimFunc(nilai, spasi)
				sel[kolomKeAngka(ref)] = v
				// Python menganggap <v/> kosong (None) sebagai isi, jadi baris tetap dihitung.
				if v != "" || nilai == "\x00none" {
					adaIsi = true
				}
				if nilai == "\x00none" {
					sel[kolomKeAngka(ref)] = ""
				}
			}
		case xml.EndElement:
			if t.Name.Local == "row" && sel != nil {
				if len(sel) > 0 && adaIsi {
					lebar := 0
					for i := range sel {
						if i+1 > lebar {
							lebar = i + 1
						}
					}
					r := make([]string, lebar)
					for i, v := range sel {
						r[i] = v
					}
					hasil = append(hasil, r)
				}
				sel = nil
			}
		}
	}
	return hasil, nil
}

// bacaSel membaca isi <c>. punyaNilai false bila sel tanpa <v> (bukan inlineStr), seperti `continue` di Python.
func bacaSel(d *xml.Decoder, tipe string, shared []string) (string, bool, error) {
	var v *string
	inline := ""
	kedalaman := 1
	for kedalaman > 0 {
		tok, err := d.Token()
		if err != nil {
			return "", false, err
		}
		switch t := tok.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "v":
				s, err := teksLangsung(d)
				if err != nil {
					return "", false, err
				}
				v = &s
			case "is":
				s, err := teksDalam(d)
				if err != nil {
					return "", false, err
				}
				inline = s
			default:
				kedalaman++
			}
		case xml.EndElement:
			kedalaman--
		}
	}
	if tipe == "inlineStr" {
		return inline, true, nil
	}
	if v == nil {
		return "", false, nil
	}
	if *v == "" {
		return "\x00none", true, nil
	}
	if tipe == "s" {
		i, err := strconv.Atoi(strings.TrimSpace(*v))
		if err != nil || i < 0 || i >= len(shared) {
			return "", false, errors.New("indeks shared string")
		}
		return shared[i], true, nil
	}
	return *v, true, nil
}

func teksLangsung(d *xml.Decoder) (string, error) {
	var sb strings.Builder
	for {
		tok, err := d.Token()
		if err != nil {
			return "", err
		}
		switch t := tok.(type) {
		case xml.CharData:
			sb.Write(t)
		case xml.EndElement:
			return sb.String(), nil
		}
	}
}
