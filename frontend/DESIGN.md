# DESIGN.md: Portal SPBE Kota Bogor

Arah desain antarmuka frontend. Dua sumber:
- **Isi dan batasan:** folder `Praproses` (PRD, Buku Panduan Standarisasi Aplikasi, dokumen revisi). Bila dokumen ini berbeda dengan dokumen revisi, dokumen revisi yang berlaku.
- **Bahasa visual:** gabungan dua referensi yang dipilih pemilik desain, "Sentinel" (dasbor hijau, krem, pasir) dan "Chrono desk" (dasbor putih, biru, tabel rapat). Audit dan penggabungannya ada di bagian 6.

Butir bertanda **[belum diputuskan]** tidak punya dasar di sumber mana pun dan harus diputuskan pemilik desain.

## 1. Identitas

- **Produk:** portal komunitas dan repositori pengetahuan SPBE milik Dinas Komunikasi dan Informatika Kota Bogor: Dokumen dan SOP, Forum, Pembelajaran, Berita, katalog aplikasi dan arsitektur, dasbor. (PRD)
- **Pemilik:** Pemerintah Kota Bogor. Tidak ada penjualan, harga, atau konversi.
- **Tujuan:** satu sumber data arsitektur SPBE yang tervalidasi, wadah berbagi pengetahuan ASN, dan sarana literasi SPBE bagi publik. (PRD)
- **Yang harus terasa:** resmi dan tepercaya, tetapi tidak kaku. PRD menyebut kelemahan web sebelumnya "terlalu kaku" dan meminta "tampilan modern, ramah pengguna, visualisasi grafik yang menarik, menu yang mudah dipahami orang awam".

## 2. Pengguna

| Pengguna | Tujuan utama | Dampak ke desain |
|---|---|---|
| Umum (tanpa akun) | Membaca berita, mencari dokumen publik, melihat ringkasan | Halaman depan jelas tanpa login; menu hanya yang bisa diakses |
| ASN dan Akademisi | Mencari dokumen dan SOP, berdiskusi, belajar | Pencarian dan daftar yang cepat dipindai |
| Admin OPD | Mengelola aplikasi dan flowchart instansi, mengajukan validasi | Tabel, formulir, status yang tegas |
| Super Admin | Memutuskan validasi, moderasi, mengelola pengguna dan sistem | Padat informasi, antrean kerja jelas |

Akun hanya lewat undangan; tidak ada pendaftaran mandiri. (Revisi K2)

## 3. Nada dan bahasa

- **Kata kunci:** resmi, jelas, ramah, tertata. (turunan PRD, butir Usability)
- **Bahasa:** Indonesia; istilah asing hanya yang sudah serapan. (Buku Panduan C.r)
- **Istilah yang sudah diputuskan:**
  - "Ajukan Semua RAA", bukan "Validasi Semua RAA" (K16, D14)
  - "Bukti penyelesaian", bukan "Sertifikasi Kompetensi"; tanpa poin SKP (K11, D17)
  - "Terverifikasi SSO", bukan "Terverifikasi SIASN BKN" (D3)
  - Status akun: Diundang, Aktif, Nonaktif (D15)
  - Footer: "© 2026 Pemerintah Kota Bogor" (D1)
  - "Login" dan "Thread" boleh tetap sebagai istilah serapan; alternatifnya "Masuk" dan "Topik" (D12). **[belum diputuskan]**
- **Dihindari:** janji yang tidak ada di sistem ("AI" untuk pencarian yang masih kata kunci, sertifikat kompetensi, integrasi BKN, push notification). Data tiruan diberi keterangan "mode demo".

## 4. Batasan wajib dari Buku Panduan

| Ketentuan | Penerapan |
|---|---|
| Responsif di desktop, laptop, layar kecil (C.a, PRD) | Mulai dari 375px; tanpa geser horizontal; uji di 375, 768, desktop |
| Logo resmi Pemerintah Kota Bogor di setiap halaman (C.m) | Di header, sidebar, dan halaman Masuk |
| Copyright atas nama Pemerintah Kota Bogor dengan tahun (C.m) | Footer publik, kaki sidebar internal, dan halaman Masuk |
| Menu Manajemen Pengetahuan: FAQ, SOP, Panduan, Video (C.n) | Halaman Bantuan dan SOP |
| Kontak kami dan Kritik & Saran (Dashboard, C) | Halaman Kritik & Saran |
| Laporan PDF; data pribadi di-mask (C.t) | Setiap ekspor PDF |
| Pesan kesalahan tidak membuka detail sistem (Keamanan) | Pesan galat ramah dan umum |
| Captcha di login (Keycloak, bagian 1.2) | Di mode demo hanya simulasi dan diberi tanda Demo |
| Auto logout 15 menit tanpa aktivitas | Beri peringatan sebelum sesi berakhir **[belum diputuskan]** |

## 5. Struktur dan navigasi

- **Halaman publik:** menu atas. Pengunjung: Beranda, Berita, Dokumen, Kritik & Saran, Bantuan. SOP, Pembelajaran, Forum tidak ditampilkan karena tidak bisa diakses.
- **Halaman internal (sudah masuk):** **menu samping kiri**, bukan menu atas. Alasan: Revisi D5 dan D6 mencatat navbar Admin OPD dan Super Admin terlalu penuh; sidebar memuat belasan menu tanpa dropdown "Kelola". Di HP menjadi laci yang dibuka dari tombol Menu.
- **Kelompok menu samping:**
  - Umum (semua login): Beranda, Dokumen, SOP, Pembelajaran, Forum, Notifikasi, Profil.
  - Kelola (Admin OPD): Data Aplikasi, Klasifikasi RAA, Flowchart, Dasbor Instansi.
  - Sistem (Super Admin): Pengguna, Validasi, Repositori, Moderasi, Periode, Audit Trail, Backup.
- Filter, pencarian, dan halaman disimpan di URL agar bisa dibagikan dan tombol Kembali bekerja. (Rancangan Frontend, bagian 5)

## 6. Bahasa visual: audit dua referensi dan penggabungannya

### 6.1 Audit

| | Sentinel (hijau, krem, pasir) | Chrono desk (putih, biru, pastel) |
|---|---|---|
| **Kuat** | Identitas hangat dan khas; menu samping berwarna dengan tab aktif putih yang melengkung; panel konten putih berlatar krem; donat dengan angka besar di tengah; grafik batang dengan satu batang yang disorot; garis pemisah tipis | Hierarki jelas; judul sapaan besar; ringkasan angka di atas; tabel dengan anatomi lengkap (centang, tanggal di bawah nama, status, aksi); status berisi ikon dan teks; pagination dengan "item per halaman"; filter dropdown |
| **Lemah** | Kontras rendah: angka batang abu pucat, teks emas di atas krem, tombol emas berteks putih, status pucat. Ilustrasi sudut generik. Latar peach terlalu jenuh. Radius sangat besar dan bayangan tebal | Empat kartu angka berwarna pastel berbeda (biru, ungu, hijau, kuning) tanpa makna: warna sebagai hiasan. Kolom cari berbingkai gradien. Aksi hanya ikon (mata, pena, tempat sampah) tanpa label. Merah hanya untuk tempat sampah tanpa konfirmasi |
| **Warna** | Hijau + emas + krem (hangat) | Biru + ungu + pastel pelangi (dingin) |

**Penyebab bentrok:** keduanya hangat melawan dingin. Biru Chrono di atas hijau Sentinel menghasilkan dua warna merek yang bersaing; pastel pelangi menambah empat warna lagi tanpa makna.

### 6.2 Keputusan penggabungan

| Unsur | Diambil dari | Diubah |
|---|---|---|
| Warna merek hijau, pasir, krem | Sentinel | Krem diredam (bukan peach); emas digelapkan agar terbaca |
| Menu samping dengan tab aktif putih melengkung | Sentinel | Dipertahankan; tinggi item 44px |
| Panel konten putih di atas krem | Sentinel | Radius 16px (bukan sekitar 28px); bayangan tipis |
| Donat angka tengah dan batang yang disorot | Sentinel | Angka dan label memakai warna gelap; ada tabel data untuk pembaca layar |
| Sapaan besar, ringkasan angka di atas | Chrono | Kartu angka satu gaya (putih berbingkai), bukan empat warna pastel |
| Anatomi tabel dan pagination | Chrono | Aksi baris berlabel teks ("Tinjau"), bukan ikon saja |
| Status berisi ikon dan teks | Chrono | Warna disesuaikan palet hijau; kontras dihitung |
| Filter dropdown dan kolom cari | Chrono | Kolom cari satu bingkai tanpa gradien |
| Biru sebagai warna merek | Chrono | **Dibuang.** Biru hanya muncul sebagai warna status "Perlu Revisi" |
| Ungu dan pastel pelangi | Chrono | **Dibuang** |
| Ilustrasi orang di sidebar | Sentinel | **Dibuang.** Diganti lambang Kota Bogor dan foto Balai Kota |
| Ikon aplikasi berwarna (kartu integrasi) | Sentinel | **Dibuang**; tidak relevan |

### 6.3 Warna

Satu warna merek (hijau), satu aksen hangat (pasir), latar krem. Hijau dipilih karena hijau ada pada lambang Kota Bogor dan Bogor dikenal sebagai Kota Hujan **[cocokkan dengan nilai warna resmi lambang]**. Kontras dihitung dengan rumus WCAG 2.

**Token inti**

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `hijau-900` | `#0E3B2C` | Judul, teks kuat di atas terang |
| `hijau-800` | `#14503B` | Latar menu samping |
| `hijau-700` | `#1B6B4D` | Tombol utama, tautan, batang grafik utama |
| `hijau-100` | `#DDEFE5` | Latar item aktif ringan, tint |
| `hijau-50` | `#F0F8F3` | Latar baris terpilih |
| `pasir-300` | `#E3CF93` | Tombol sekunder, penanda "perlu tindakan" |
| `pasir-100` | `#F5EBCB` | Latar sorotan angka |
| `pasir-800` | `#6B4F0F` | Teks di atas pasir-100 |
| `pasir-600` | `#8F6B14` | Batang atau garis pasir pada grafik |
| `krem` | `#FAF6EE` | Latar halaman |
| `putih` | `#FFFFFF` | Panel, kartu, tabel |
| `tinta` | `#1C2420` | Teks utama |
| `netral-700` | `#3D4A43` | Teks sekunder |
| `netral-500` | `#66736B` | Keterangan, placeholder |
| `netral-200` | `#E3E8E4` | Garis dan bingkai |
| `bendera-merah` | `#CE1126` | Hanya garis 4px di paling atas halaman |

**Status** (selalu ikon + teks, latar tint, teks gelap)

| Status | Teks | Latar | Ikon |
|---|---|---|---|
| Draft | `#3D4A43` | `#EEF1EF` | titik kosong |
| Menunggu | `#92400E` | `#FEF3C7` | jam |
| Disetujui | `#166534` | `#DCFCE7` | centang |
| Perlu Revisi | `#1E40AF` | `#DBEAFE` | pena |
| Ditolak | `#991B1B` | `#FEE2E2` | silang |

Status Disetujui memakai hijau yang berdekatan dengan warna merek. Itu aman karena status tidak pernah berdiri sendiri: selalu berbentuk pil ber-ikon dan bertulisan, dan warna merek tidak dipakai untuk pil.

**Kontras yang dihitung**

| Pasangan | Rasio | Syarat |
|---|---|---|
| Putih di `hijau-700` (tombol) | 6,45 | 4,5 (lulus) |
| Putih di `hijau-800` (sidebar) | 9,37 | 4,5 (lulus) |
| `hijau-100` di `hijau-800` (teks sidebar) | 7,83 | 4,5 (lulus) |
| `hijau-700` di krem dan di putih (tautan) | 5,98 dan 6,45 | 4,5 (lulus) |
| `tinta` di krem | 14,73 | 4,5 (lulus) |
| `netral-700` di putih | 9,30 | 4,5 (lulus) |
| `netral-500` di putih / di krem | 4,97 / 4,61 | 4,5 (lulus, tipis) |
| `pasir-800` di `pasir-100` | 6,41 | 4,5 (lulus) |
| `tinta` di `pasir-300` (tombol sekunder) | 10,29 | 4,5 (lulus) |
| Status: menunggu, disetujui, perlu revisi, ditolak, draft | 6,37 / 6,49 / 7,15 / 6,80 / 8,17 | 4,5 (lulus) |
| `hijau-700` vs putih (batang) | 6,45 | 3 untuk grafik (lulus) |
| `pasir-600` vs putih (batang) | 4,91 | 3 untuk grafik (lulus) |
| `pasir-500` `#C9A24A` vs putih | 2,40 | 3 untuk grafik (**gagal**, jangan dipakai untuk grafik) |

Catatan: `netral-500` hanya untuk keterangan kecil dan placeholder; jangan dipakai untuk teks yang harus dibaca penuh.

**Aturan pemakaian warna**
1. Satu aksen aktif per layar: hijau untuk aksi, pasir hanya untuk menandai yang perlu tindakan.
2. Kartu angka semuanya putih berbingkai; satu kartu boleh berlatar `pasir-100` bila berisi hal yang menunggu keputusan.
3. Biru, merah, kuning, dan hijau status hanya di pil status dan pesan sistem.
4. Grafik memakai hijau untuk data utama; pasir-600 untuk pembanding atau sorotan. Maksimal dua warna kecuali grafik status (lima status di atas).
5. Teks tidak boleh bergantung pada warna saja.

**Mode gelap** tidak termasuk lingkup saat ini (tidak ada di Praproses).

### 6.4 Tipografi

- Satu keluarga: **Plus Jakarta Sans**, bobot 400, 500, 600, 700. Alasan: font terbuka berlisensi OFL, dirancang di Indonesia, mendukung Latin lengkap, dan mirip karakter geometris pada kedua referensi (Montserrat di Sentinel, Plus Jakarta Sans di Chrono). **[belum diputuskan oleh pemilik desain]**
- Dimuat dari berkas sendiri (self-host), bukan dari CDN, agar sesuai kebijakan CSP dan jaringan Pemda (Buku Panduan: CSP).
- Skala: 12, 14, 16, 20, 28, 36 px. Isi 16px, tinggi baris 1,5; tabel 14px.
- Judul halaman 28px bobot 700 pada halaman kerja; 36px hanya pada hero halaman depan.
- Angka di tabel dan kartu rata kanan atau memakai angka tabular bila font mendukung.
- Tanpa teks kapital berjarak lebar.

### 6.5 Bentuk, jarak, dan kerapatan

- Radius: 8px untuk kontrol, 12px untuk kartu, 16px untuk panel besar. Pil status 999px.
- Garis 1px `netral-200`; bayangan hanya untuk elemen melayang (dropdown, dialog).
- Jarak kelipatan 4px.
- Dua kerapatan: **longgar** untuk halaman publik dan baca; **padat** untuk halaman kerja (baris tabel 56px, tinggi kontrol 44px).
- Target sentuh minimal 44px.

### 6.6 Komponen kunci

| Komponen | Spesifikasi |
|---|---|
| Menu samping | Lebar 264px, latar `hijau-800`. Item aktif: latar putih dengan ujung melengkung ke panel konten, teks `hijau-900`. Kelompok menu dipisah garis tipis. Kaki: lambang, nama pengguna, "© 2026 Pemerintah Kota Bogor". Di HP menjadi laci |
| Panel konten | Putih, radius 16px, di atas latar krem; di HP penuh lebar tanpa radius |
| Kartu angka | Putih, bingkai 1px, label 14px `netral-700`, angka 28px bobot 700 `hijau-900`, keterangan 12px |
| Tabel | Kepala `krem` huruf 14px bobot 600; baris 56px; kolom pertama berisi nama dan tanggal di bawahnya; kolom status berisi pil; kolom aksi berisi tombol teks ("Tinjau") dan menu titik tiga. Centang hanya bila ada aksi massal |
| Pil status | Ikon 14px + teks 12px bobot 600, tinggi 24px, radius 999px |
| Pagination | "Menampilkan [5] item per halaman", tombol Sebelumnya, nomor halaman, Berikutnya; semua 44px |
| Kolom cari | Satu bingkai 1px, fokus cincin 3px `hijau-700`; tanpa gradien |
| Donat | Angka besar di tengah, label di bawahnya, daftar nilai di samping, tabel data tersembunyi untuk pembaca layar |
| Grafik batang | Nilai tampil di atas batang dengan teks `tinta`; batang yang dipilih `hijau-700`, lainnya `hijau-100` dengan bingkai; sumbu berlabel |
| Tombol | Utama: `hijau-700`, teks putih. Sekunder: `pasir-300`, teks `tinta`. Tersier: bingkai `hijau-700`, teks `hijau-700`. Bahaya: `#991B1B`, selalu dengan dialog konfirmasi |
| Tab | Garis bawah 3px `hijau-700` pada tab aktif; angka jumlah di samping nama |

### 6.7 Citra

- Lambang Kota Bogor dan foto asli Balai Kota. Tanpa ilustrasi generik, tanpa emoji, tanpa foto stok.
- Foto Balai Kota dipakai di hero halaman depan dan halaman Masuk, berlapis `hijau-900` agar teks terbaca. Kontras teks di atas foto dihitung sebelum dikirim **[belum dihitung]**.
- Foto harus milik Pemkot atau berlisensi jelas **[perlu konfirmasi sumber dan izin]**.
- Ikon: lucide-react, hanya untuk membantu makna.
- Garis bendera merah-putih 4px di paling atas halaman publik dan internal sebagai penanda resmi.

### 6.8 Gerak

- Gerak hanya untuk umpan balik (muat, berhasil, buka dialog, laci menu). Durasi 150 sampai 200 ms.
- Hormati `prefers-reduced-motion`. Tanpa animasi dekoratif berulang.

## 7. Pola antarmuka per jenis halaman

| Jenis | Halaman | Pola |
|---|---|---|
| Publik | Landing, Berita, Dokumen, Bantuan, Kritik & Saran, Cari | Menu atas; hero foto Balai Kota dengan kolom cari; daftar dokumen dan berita; hasil pencarian menandai fallback (5.9) |
| Baca dan diskusi | Detail dokumen, SOP, Forum, Pembelajaran | Menu samping; teks nyaman dibaca; aksi (balas, nilai, laporkan) dekat konten |
| Kerja | Data Aplikasi, RAA, Flowchart, Validasi, Pengguna, Repositori, Moderasi | Menu samping; judul + breadcrumb; tab status; alat (cari, filter); tabel; pagination |
| Dasbor | Beranda tiap role, Dasbor Instansi, Analitik | Menu samping; sapaan; kartu angka; donat atau batang; antrean terbaru; embed Metabase hanya di dasbor lanjutan |
| Sistem | Periode, Audit Trail, Backup | Tabel dan formulir sederhana; Audit Trail hanya baca |
| Masuk | `/masuk` | Satu tugas; foto Balai Kota di kiri, formulir di kanan; tetap memuat lambang dan hak cipta |

Keadaan wajib di setiap halaman data: memuat, kosong, galat (dengan jalan keluar), dan tanpa hak akses (403). (Rancangan Frontend, bagian 6)

## 8. Aksesibilitas

- Tautan lompat ke konten, landmark, satu H1 per halaman, `lang="id"`.
- Semua kolom isian berlabel; kontrol ikon punya nama aksesibel.
- Navigasi keyboard penuh; indikator fokus terlihat (minimal 3:1) di semua kontrol, termasuk kolom isian.
- Kursor pointer pada setiap kontrol yang bisa diklik.
- Judul tab berbeda di tiap halaman.
- Status tidak hanya lewat warna; aksi yang merusak butuh konfirmasi.
- Menu samping dan laci HP bisa dipakai dengan keyboard; laci menjebak fokus dan menutup dengan Escape.

## 9. Dial (untuk antislop)

| Dial | Nilai | Alasan |
|---|---|---|
| ENERGY | 2 | Hangat dan modern, tetapi tetap alat kerja pemerintah |
| RHYTHM | 2 | Halaman kerja seragam; halaman depan dan Masuk sedikit lebih bervariasi |
| MOTION | 1 | Hanya umpan balik |

## 10. Dampak ke kode saat ini

Kode di folder `frontend` masih memakai biru indigo dan menu atas. Menerapkan dokumen ini berarti:
1. Ganti token `brand-*` di `src/index.css` dengan hijau, pasir, dan krem di atas.
2. Pasang font Plus Jakarta Sans (self-host).
3. Ganti navbar internal dengan menu samping; navbar atas tetap untuk halaman publik.
4. Ubah `StatCard` menjadi satu gaya putih berbingkai.
5. Ubah tabel (aksi berlabel, pil status berikon) dan pagination.

Ini belum dikerjakan.

## 11. Yang masih terbuka

1. Nilai warna resmi lambang Kota Bogor (hijau dan pasir saat ini perkiraan dari referensi).
2. Persetujuan font Plus Jakarta Sans.
3. Istilah "Login/Thread" atau "Masuk/Topik".
4. Sumber dan izin foto Balai Kota; kontras teks di atas foto.
5. Peringatan sebelum sesi berakhir karena tidak aktif.
6. Cara menandai data demo selama backend belum ada.
7. Label pencarian: "Cari dengan AI" atau "Pencarian pintar", sampai Smart Search benar-benar berjalan.
