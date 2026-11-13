# Kontrak API Dasbor

Kedua endpoint di bawah sudah ada di BE: [`backend/internal/handler/dasbor_arsitektur.go`](../../backend/internal/handler/dasbor_arsitektur.go).
BE membaca `dasborPublik.json` dan `dasborInternal.json` dari folder `DASBOR_DATA_DIR` (bawaan `backend/data/dasbor`,
tidak masuk git). Bila berkasnya belum ada, BE membalas **404** dan FE menampilkan "Data dasbor belum tersedia";
bagian statistik di halaman depan disembunyikan.

**Memperbarui data:** jalankan `python frontend/scripts/excel_dasbor_publik.py "<matriks>.xlsx"`. Skrip menulis ke
`frontend/src/mocks/dataNyata/` (mode mock) dan menyalin ke `backend/data/dasbor/`. BE membaca ulang berkas yang
berubah tanpa perlu restart.

| Endpoint | Akses | Dipakai di |
|---|---|---|
| `GET /api/dasbor/publik` | Publik, tanpa login | `/dasbor-publik`, statistik di halaman depan (`/`) |
| `GET /api/dasbor/analitik` | Semua role yang sudah login; tanpa token → **401** | `/dasbor/analitik` (menu "Dasbor Analitik") |

## Bentuk respons

Tipe lengkap: [`src/features/dasbor-publik/types.ts`](../src/features/dasbor-publik/types.ts) (`DasborPublik`).
Contoh data nyata dibuat oleh [`scripts/excel_dasbor_publik.py`](../scripts/excel_dasbor_publik.py) dari matriks Excel
arsitektur SPBE (berkasnya tidak masuk git: `src/mocks/dataNyata/`).

Garis besar:

```
{
  sumber: { judul, diolah },
  perOpd: [{ opd, akronim, prosesBisnis, layanan, data, aplikasi }],
  prosesBisnis: { jumlahUnit, jumlahProsesBisnis, perSektor[], perUrusan[], perJenis[], iku[], katalog[] },
  layanan:      { jumlahLayanan, jumlahUnit, perTarget[], perMetode[], perArea[], katalog[] },
  data:         { jumlahData, jumlahJenis, perSifat[], perJenis[], perValiditas[], perKelompok[], tidakDitampilkan, katalog[] },
  aplikasi:     { jumlahAplikasi, jumlahUnit, perKepemilikan[], perJenis[], perFungsi[], perBasis[], opdTeratas[], katalog[] },
  infrastruktur:{ perKategori[], jumlahPusatData, pusatDataPerKepemilikan[], pusatDataPerTier[], jumlahJaringanIntra },
  keamanan:     { jumlahStandar, standarPerJenis[], edukasiPerTahun[] },
  petaRencana:  { totalKegiatan, sudahDilakukan, perStatus[], perMuatan[], perTahun[], trenTahunan[], opdTeratas[], sasaranTeratas[] }
}
```

Semua `per...[]` berbentuk `{ label, nilai }`, urut dari nilai terbesar (kecuali per tahun: urut tahun).

## Perbedaan publik dan analitik (WAJIB ditegakkan di server)

`/dasbor/publik` **tidak boleh** memuat kolom berikut; `/dasbor/analitik` memuat semuanya:

| Domain | Hanya di `/dasbor/analitik` |
|---|---|
| Layanan | `katalog[].risiko`, `katalog[].mitigasi` |
| Data | baris data bersifat Terbatas/Tertutup di `katalog` (publik hanya Terbuka; jumlah sisanya di `tidakDitampilkan`), `katalog[].sifat` |
| Aplikasi | `katalog[].url`, `lisensi`, `database`, `bahasa`, `sistemOperasi`, `lokasiServer`, `pengembang` |
| Infrastruktur | `katalog[]`, `pusatData[]`, `server[]` |
| Keamanan | `perSubdomain[]`, `perHasilAudit[]`, `perTindakLanjut[]`, `katalog[]` (termasuk kerentanan, insiden, hasil audit) |
| Peta Rencana | `katalog[]` (termasuk `nominal`) |

Menyembunyikan kolom hanya di FE tidak cukup: data yang terkirim ke peramban tetap bisa dibaca siapa pun.
