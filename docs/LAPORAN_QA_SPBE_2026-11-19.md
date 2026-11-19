# Laporan QA Portal SPBE Diskominfo Bogor

**Tanggal:** 19 November 2026  
**Revisi:** `a6278d4`  
**Cakupan:** build produksi, tes Go, login, halaman publik dan internal, hak akses, perubahan data, dasbor, tampilan mobile, serta backup dan pemulihan.

## Lingkungan pengujian

Pengujian browser menggunakan Playwright dan Microsoft Edge headless. Matriks halaman dijalankan dua kali, dengan API mock dan dengan API Go yang terhubung ke klaster PostgreSQL 17 baru berisi data seed. Alur yang menulis data memakai klaster, direktori unggahan, dan direktori backup sementara yang terpisah. API QA dijalankan dari luar direktori proyek sehingga konfigurasi `backend/.env` tidak dimuat.

## Ringkasan hasil

| Pemeriksaan | Hasil |
| --- | --- |
| Build frontend produksi | Lulus, termasuk pemeriksaan TypeScript |
| Build dan tes backend | Lulus, 6 paket dengan tes |
| Login dengan API Go dan PostgreSQL | 4/4 akun masuk. Logout ASN, penolakan sandi salah (HTTP 401), dan kembali ke forum lulus |
| Login dengan API mock | 0/4 akun masuk, seluruhnya menerima HTTP 403. Validasi CAPTCHA salah dan kolom kosong lulus |
| Matriks halaman menggunakan API mock | 165/178 sesuai ekspektasi skrip |
| Matriks halaman menggunakan API Go | 165/178 sesuai ekspektasi skrip |
| Alur perubahan data dengan API Go dan PostgreSQL | 30/30 lulus menurut pemeriksaan skrip |
| Pemeriksaan tambahan | 6/6 lulus, mencakup 4 halaman mobile, pindah ke peran Verifikator, dan Audit Trail |
| Dasbor dengan data sintetis | 14/14 pemeriksaan tab antarmuka lulus. Impor Excel, pembatasan data publik, dan pemulihan versi lulus pada 8/8 pemeriksaan API |
| Pemulihan backup PostgreSQL | Dump dipulihkan ke database baru. Empat pengguna hasil seed terbaca dan arsip unggahan berisi PDF uji |

### Matriks halaman

| Sesi | Lulus | Total |
| --- | ---: | ---: |
| Publik | 31 | 33 |
| ASN | 33 | 35 |
| Akademisi | 32 | 35 |
| Admin OPD | 35 | 37 |
| Super Admin | 34 | 38 |

Angka mentah sama di kedua lingkungan. Pada masing-masing run, 10 pemeriksaan mencatat HTTP 404 karena lingkungan awal belum memiliki data dasbor, 2 hasil berasal dari ekspektasi atau deteksi skrip yang keliru, dan 1 menunjukkan selisih aturan membuat flowchart.

Sesudah pengujian awal, tujuh domain dasbor publik dan tujuh domain dasbor analitik berhasil dibuka dengan data sintetis. Di API, Super Admin berhasil mempratinjau dan menerapkan dua versi Excel serta memulihkan versi pertama. Pada kedua versi, katalog publik hanya berisi baris berstatus Terbuka, sedangkan katalog internal juga memuat baris Tertutup. ASN mendapat HTTP 403 saat membuka API pengelolaan data dasbor.

### Alur perubahan data

| Peran | Lulus | Cakupan |
| --- | ---: | --- |
| Publik | 1/1 | Kirim kritik dan saran |
| ASN | 7/7 | Buat, balas, dan laporkan thread. Ubah profil dan preferensi. Selesaikan materi dan tandai notifikasi dibaca |
| Akademisi | 2/2 | Balas thread dan beri nilai balasan |
| Admin OPD | 5/5 | Buat dan ubah aplikasi, ajukan validasi, buat flowchart, dan terima notifikasi keputusan |
| Super Admin | 15/15 | Putuskan validasi, unggah dan ubah status dokumen, moderasi, undang dan kelola pengguna, kelola periode, jalankan backup, serta lihat kritik masuk |

## Temuan

1. **Tinggi. Formulir demo gagal dengan API mock.** Dengan `VITE_AUTH_MODE=mock` dan `VITE_API_MOCK=true`, kirim formulir `/masuk` dengan akun demo dan CAPTCHA yang benar. Keempat akun mendapat HTTP 403 dan tetap di halaman masuk. Handler mock belum menangani `POST /api/auth/login`. Dengan API Go QA, keempat akun menerima HTTP 200 dan mencapai `/beranda`. [Formulir login](../frontend/src/features/auth/LoginPage.tsx) · [Handler mock](../frontend/src/mocks/handlers/auth.ts)
2. **Sedang. Aturan pembuatan flowchart berbeda.** Super Admin ditolak saat membuka `/katalog/flowchart/baru`. Frontend dan mock membatasi fitur ini ke Admin OPD, sedangkan handler Go memakai pemeriksaan peran yang menerima Admin OPD dan Super Admin. Pembuatan melalui UI oleh Admin OPD berhasil. Pembuatan melalui API sebagai Super Admin tidak diuji. [Form flowchart](../frontend/src/features/flowchart/pages/FlowchartFormPage.tsx) · [Handler Go](../backend/internal/handler/flowchart.go)
3. **Sedang. Skrip QA menghasilkan klasifikasi yang keliru.** Skrip login mock menghitung pesan kesalahan server sebagai keberhasilan kasus sandi salah. Saat memakai backend, skrip login asli berhenti karena mengharapkan menu SOP untuk Akademisi. Pemeriksaan login terarah kemudian memverifikasi keempat akun. Matriks halaman juga salah mengklasifikasikan Audit Trail karena teks “Akses ditolak” muncul sebagai label aktivitas. Pemeriksaan terarah mengonfirmasi Super Admin membuka halaman tersebut dan API mengembalikan HTTP 200. [Skrip login](../frontend/scripts/uji_login.py) · [Skrip akses](../frontend/scripts/uji_role.py) · [Aturan SOP](../frontend/src/auth/permissions.ts)
4. **Rendah. Panduan mode pengembangan berbeda dari konfigurasi.** README frontend menyatakan API mock aktif secara bawaan, sedangkan `.env.development` menetapkan `VITE_API_MOCK=false`. [README frontend](../frontend/README.md)

## Batas verifikasi

Pengujian tampilan mobile mencakup beranda publik, login, beranda ASN, dan halaman pengguna Super Admin pada viewport 390 px. Keempat halaman tampil tanpa overflow horizontal. Pengujian Verifikator mencakup peralihan dari ASN, membuka antrean verifikasi, dan penolakan akses ke Backup.

Keycloak, layanan TND, pengiriman email, dan matriks Excel resmi belum diverifikasi terhadap layanan atau data produksi. Skenario lintas browser selain Edge dan pengujian beban juga belum dijalankan. Kode aplikasi tidak diubah.

## Bukti lokal

Artefak hasil pengujian disimpan pada folder sementara Windows untuk sesi ini.

- [Login dengan backend QA](C:/Users/V14/AppData/Local/Temp/spbe-qa-full/login-backend/hasil_terarah.json) · [Login dengan mock](C:/Users/V14/AppData/Local/Temp/spbe-qa-full/login/hasil_login.json)
- [Matriks halaman dengan backend QA](C:/Users/V14/AppData/Local/Temp/spbe-qa-full/role-backend/hasil.json) · [Matriks halaman dengan mock](C:/Users/V14/AppData/Local/Temp/spbe-qa-full/role/hasil.json)
- [Alur perubahan data](C:/Users/V14/AppData/Local/Temp/spbe-qa-full/alur/hasil_alur.json) · [Mobile, Verifikator, dan Audit Trail](C:/Users/V14/AppData/Local/Temp/spbe-qa-full/tambahan.json)
- [Tab dasbor](C:/Users/V14/AppData/Local/Temp/spbe-qa-full/dasbor-sintetis.json) · [Impor dan versi Excel](C:/Users/V14/AppData/Local/Temp/spbe-qa-full/dasbor-excel.json)
