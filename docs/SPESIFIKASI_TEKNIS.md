# Spesifikasi teknis dan kebutuhan server

Dokumen ini memenuhi butir Laporan Akhir "Software Construction" dan "Spesifikasi Kebutuhan Server" pada Buku Panduan Standarisasi Aplikasi (bagian A.5).

Versi di bawah dibaca dari `backend/go.mod` dan `frontend/package.json`. Angka kebutuhan server di bagian 3 adalah **usulan awal** dan perlu divalidasi lewat uji beban sebelum diajukan ke Tim Asesmen.

## 1. Kesesuaian dengan standar (bagian C Buku Panduan)

| Ketentuan | Pilihan di aplikasi ini |
|---|---|
| Bahasa pemrograman open source | Go (back end), TypeScript/JavaScript, HTML, CSS (front end) |
| Basis data open source | PostgreSQL 17 |
| Arsitektur framework yang diizinkan | Golang untuk back end dan React JS untuk front end (opsi keempat di butir C.f) |
| Berjalan di server Linux | Ya (Go menghasilkan satu berkas biner; Node.js hanya dibutuhkan untuk proses build FE) |
| Web responsif | Ya (diuji pada lebar 390, 768, dan 1440 px) |
| Bahasa Indonesia | Ya |

## 2. Versi komponen

### Back end

| Komponen | Versi | Fungsi |
|---|---|---|
| Go | 1.27 | Bahasa dan kompiler |
| Gin | 1.12.0 | Framework HTTP |
| GORM | 1.31.2 | ORM |
| gorm.io/driver/postgres | 1.6.3 | Driver PostgreSQL |
| gin-contrib/cors | 1.7.10 | Pengaturan CORS |
| godotenv | 1.5.1 | Membaca berkas `.env` |
| PostgreSQL | 17 | Basis data |
| pg_dump (postgresql-client-17) | 17 | Cadangan database harian |

Autentikasi memakai verifikasi JWT RS256 buatan sendiri di `internal/auth` (hanya pustaka standar Go), jadi tidak ada dependensi pihak ketiga tambahan untuk itu.

### Front end

| Komponen | Versi | Fungsi |
|---|---|---|
| React | 19.3 | Pustaka antarmuka |
| React Router | 8.5 | Navigasi halaman |
| TanStack Query | 5.105 | Pengambilan dan cache data |
| React Hook Form | 7.91 | Formulir dan validasi |
| Tailwind CSS | 4.3 | Gaya |
| Vite | 8.3 | Build dan server pengembangan |
| TypeScript | 7.0 | Bahasa |
| bpmn-js | 18.31 | Editor dan penampil flowchart BPMN |
| keycloak-js | 26.2 | Login SSO (Authorization Code + PKCE) |
| MSW | 3.0 | API tiruan, hanya untuk pengembangan dan demo |
| Node.js (hanya build) | 26 | Menjalankan proses build |

### Layanan pendukung

| Layanan | Keterangan |
|---|---|
| Keycloak (SSO Pemkot Bogor) | Penyedia identitas. Daftar pengaturan wajib ada di `PANDUAN_INSTALASI.md` bagian 6 |
| nginx | Server web statis, proxy `/api`, TLS, header keamanan |

## 3. Kebutuhan server (usulan awal)

Beban yang diperkirakan: ratusan pengguna terdaftar (ASN, akademisi, Admin OPD), akses bersamaan puluhan pengguna, dokumen berukuran maksimal 10 MB per berkas.

| Sumber daya | Usulan minimum | Alasan |
|---|---|---|
| Processor | 2 vCPU | Go ringan; `pg_dump` harian dan build FE bersifat sesaat |
| RAM | 4 GB | PostgreSQL 1 GB, aplikasi dan nginx di bawah 1 GB, sisa untuk cache sistem |
| Penyimpanan | 60 GB SSD | Sistem 15 GB, database dan unggahan awal 10 GB, cadangan 7 hari (sekitar 7 kali ukuran data), ruang tumbuh |
| Jaringan | 100 Mbps internal Pemkot | Akses lewat jaringan internal sesuai butir B.8 |
| Sistem operasi | Ubuntu Server 24.04 LTS (atau Linux setara) | Sesuai butir C.e |

Pertumbuhan penyimpanan terbesar datang dari folder unggahan dan cadangan. Hitung ulang dengan rumus:
`ruang cadangan ≈ 7 × (ukuran database + ukuran folder uploads dalam bentuk zip)`.

Aplikasi ini belum termasuk kategori "besar, tinggi, dan strategis" (butir D.3) yang memerlukan server aplikasi, penyimpanan, dan cadangan terpisah. Keputusan akhir ada pada Perangkat Daerah dan Diskominfo.

## 4. Struktur folder yang dipakai saat berjalan

| Folder | Isi | Dicadangkan | Masuk git |
|---|---|---|---|
| `backend/uploads/dokumen` | Berkas unggahan, nama acak 32 karakter heksadesimal | Ya (arsip zip) | Tidak |
| `backend/data/dasbor` | `dasborPublik.json` dan `dasborInternal.json` (data internal dari Excel) | Disarankan | Tidak |
| `backend/backups` | Hasil `pg_dump` dan arsip unggahan, 7 set terakhir | Salin berkala ke penyimpanan terpisah | Tidak |

## 5. Variabel konfigurasi back end

Semua lewat environment atau `backend/.env` (contoh di `backend/.env.example`).

| Variabel | Bawaan | Keterangan |
|---|---|---|
| `APP_ENV` | `development` | `production` mengaktifkan mode release dan menolak `AUTH_MODE=demo` |
| `PORT` | `8080` | Port HTTP |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Daftar origin tepercaya, dipisah koma. Jangan memakai `*` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSLMODE`, `DB_TIMEZONE` | lihat `.env.example` | Koneksi PostgreSQL. Ganti sandi bawaan di produksi |
| `AUTH_MODE` | `demo` (pengembangan), `keycloak` (lainnya) | `demo` hanya untuk lokal |
| `KEYCLOAK_ISSUER`, `KEYCLOAK_JWKS_URL`, `KEYCLOAK_CLIENT_ID` | kosong | Wajib bila `AUTH_MODE=keycloak` |
| `PG_DUMP_PATH`, `BACKUP_DIR`, `BACKUP_RETENSI`, `BACKUP_JAM`, `UPLOADS_DIR` | `pg_dump`, `./backups`, `7`, `02:00`, `./uploads` | Cadangan harian |
| `TRUSTED_PROXIES` | kosong | Isi `127.0.0.1` bila di belakang nginx pada server yang sama |
| `DASBOR_DATA_DIR` | `./data/dasbor` | Lokasi JSON dasbor |
