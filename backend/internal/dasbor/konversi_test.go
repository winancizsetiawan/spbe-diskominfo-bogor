package dasbor

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestHitungMenirukanCounter(t *testing.T) {
	got := hitung([]string{"b", "a", "-", "b", "a", "c", ""}, true, 0, "Kosong")
	want := []obj{{"label": "b", "nilai": 2}, {"label": "a", "nilai": 2}, {"label": "Kosong", "nilai": 2}, {"label": "c", "nilai": 1}}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("most_common: %v", got)
	}
	got = hitung([]string{"2024", "2022", "2024"}, false, 0, "")
	if got[0]["label"] != "2022" || got[1]["nilai"] != 2 {
		t.Fatalf("urut label: %v", got)
	}
}

func TestKanonikMenyatukanVariasi(t *testing.T) {
	got := kanonik([]string{"Sudah", "sudah", "Dalam-Proses", "Dalam Proses", "Dalam Proses", "-"})
	want := []string{"Sudah", "Sudah", "Dalam Proses", "Dalam Proses", "Dalam Proses", ""}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("kanonik: %v", got)
	}
}

func TestBukanExcelDitolakDenganPesan(t *testing.T) {
	_, err := Konversi(bytes.NewReader([]byte("bukan zip")), 9, time.Now())
	var ef *ErrFormat
	if !errors.As(err, &ef) {
		t.Fatalf("harus ErrFormat, dapat %v", err)
	}
}

func TestSheetHilangMenyebutNamanya(t *testing.T) {
	var buf bytes.Buffer
	z := zip.NewWriter(&buf)
	tulis := func(n, isi string) { w, _ := z.Create(n); w.Write([]byte(isi)) }
	tulis("xl/workbook.xml", `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Lain" sheetId="1" r:id="rId1"/></sheets></workbook>`)
	tulis("xl/_rels/workbook.xml.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`)
	tulis("xl/worksheets/sheet1.xml", `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>`)
	z.Close()
	_, err := Konversi(bytes.NewReader(buf.Bytes()), int64(buf.Len()), time.Now())
	if err == nil || !strings.Contains(err.Error(), "1-Domain Proses Bisnis") {
		t.Fatalf("pesan harus menyebut sheet yang hilang: %v", err)
	}
}

// TestParitasDenganSkripPython membandingkan hasil Go dengan keluaran excel_dasbor_publik.py untuk Excel yang sama.
// Jalankan dengan DASBOR_PARITAS_XLSX=<file.xlsx> dan DASBOR_PARITAS_DIR=<folder hasil skrip Python>.
func TestParitasDenganSkripPython(t *testing.T) {
	xlsx, dir := os.Getenv("DASBOR_PARITAS_XLSX"), os.Getenv("DASBOR_PARITAS_DIR")
	if xlsx == "" || dir == "" {
		t.Skip("DASBOR_PARITAS_XLSX / DASBOR_PARITAS_DIR tidak diisi")
	}
	isi, err := os.ReadFile(xlsx)
	if err != nil {
		t.Fatal(err)
	}
	h, err := Konversi(bytes.NewReader(isi), int64(len(isi)), time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if r, err := RingkasanDari(h.Internal); err != nil || r != h.Ringkasan {
		t.Errorf("RingkasanDari harus sama dengan ringkasan konversi: %+v vs %+v", r, h.Ringkasan)
	}
	for nama, gob := range map[string][]byte{"dasborPublik.json": h.Publik, "dasborInternal.json": h.Internal} {
		pyb, err := os.ReadFile(filepath.Join(dir, nama))
		if err != nil {
			t.Fatal(err)
		}
		var a, b map[string]any
		json.Unmarshal(gob, &a)
		json.Unmarshal(pyb, &b)
		delete(a["sumber"].(map[string]any), "diolah")
		delete(b["sumber"].(map[string]any), "diolah")
		for k := range b {
			if !reflect.DeepEqual(a[k], b[k]) {
				t.Errorf("%s: bagian %q berbeda dari skrip Python", nama, k)
				bedaPertama(t, k, a[k], b[k])
			}
		}
		if len(a) != len(b) {
			t.Errorf("%s: jumlah bagian %d vs %d", nama, len(a), len(b))
		}
	}
}

func bedaPertama(t *testing.T, jalur string, a, b any) {
	switch bv := b.(type) {
	case map[string]any:
		av, _ := a.(map[string]any)
		for k := range bv {
			if !reflect.DeepEqual(av[k], bv[k]) {
				bedaPertama(t, jalur+"."+k, av[k], bv[k])
				return
			}
		}
		for k := range av {
			if _, ada := bv[k]; !ada {
				t.Logf("  %s.%s hanya ada di Go", jalur, k)
				return
			}
		}
	case []any:
		av, _ := a.([]any)
		if len(av) != len(bv) {
			t.Logf("  %s: panjang Go %d, Python %d", jalur, len(av), len(bv))
		}
		for i := range bv {
			if i >= len(av) || !reflect.DeepEqual(av[i], bv[i]) {
				var x any
				if i < len(av) {
					x = av[i]
				}
				bedaPertama(t, jalur+"["+string(rune('0'+i%10))+"]", x, bv[i])
				return
			}
		}
	default:
		t.Logf("  %s: Go=%v Python=%v", jalur, a, b)
	}
}
