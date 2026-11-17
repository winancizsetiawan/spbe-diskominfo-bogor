# Dokumen API

Daftar endpoint REST backend SPBE. Dibuat dari `backend/cmd/api/main.go` dan pemeriksaan akses di handler; kolom Akses adalah hasil pembacaan kode, bukan jaminan, jadi periksa ulang saat ada perubahan.

- Basis URL: `/api` (di server dilayani lewat nginx pada domain yang sama dengan FE).
- Format: JSON (`Content-Type: application/json`), kecuali unggah berkas (`multipart/form-data`) dan unduh berkas.
- Autentikasi: header `Authorization: Bearer <token akses Keycloak>`. Token diverifikasi tanda tangan, masa berlaku, penerbit, dan audiens; peran diambil dari klaim token. Mode `demo` hanya untuk pengembangan lokal.
- Galat: `{"message": "...", "errors": {"kolom": "pesan"}}`. `errors` hanya ada pada 422 (isian tidak valid).
- Kode status umum: 200/201/204 sukses, 401 belum masuk atau token tidak sah, 403 peran tidak berhak, 404 tidak ditemukan, 409 konflik keadaan, 413 berkas terlalu besar, 422 isian tidak valid, 429 terlalu banyak permintaan.
- Pembatasan: 600 permintaan per menit per alamat IP; lewat dari itu dijawab 429 dengan header `Retry-After`.
- Semua respons membawa header keamanan (`X-Content-Type-Options`, `X-Frame-Options`, CSP `default-src 'none'`, `Cache-Control: no-store`).

Jumlah endpoint: **80**

## health

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/health` | Publik | Check |

## dasbor

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/dasbor/publik` | Publik | Get publik |
| GET | `/api/dasbor/analitik` | Login | Get analitik |
| GET | `/api/dasbor/instansi` | Admin OPD, Super Admin | Get dasbor instansi |
| GET | `/api/dasbor/embed` | Login | Get dasbor embed |

## referensi

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/referensi/instansi` | Admin OPD, Super Admin | GetInstansi mengembalikan daftar seluruh instansi/OPD untuk pilihan formulir dan filter |
| GET | `/api/referensi/raa` | Admin OPD, Super Admin | GetReferensiRaa mengembalikan pohon hierarki RAA (Level 1, 2, 3) |

## aplikasi

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/aplikasi/ringkasan` | Admin OPD, Super Admin | GetRingkasan mengembalikan ringkasan statistik (total, sesuai, perlu penyesuaian, belum) |
| GET | `/api/aplikasi/siap-diajukan` | Admin OPD, Super Admin | GetSiapDiajukan mengembalikan daftar aplikasi yang berstatus draft/perlu revisi |
| GET | `/api/aplikasi` | Admin OPD, Super Admin | GetDaftar mengambil daftar antrean pengajuan berhalaman beserta tab statistik |
| GET | `/api/aplikasi/:id` | Admin OPD, Super Admin | GetDetail mengambil 1 data pengajuan lengkap beserta objek target yang ditinjau |
| POST | `/api/aplikasi` | Admin OPD, Super Admin | Create menambah aplikasi baru |
| PUT | `/api/aplikasi/:id` | Admin OPD, Super Admin | Update mengubah data aplikasi |

## flowchart

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/flowchart/opsi` | Admin OPD, Super Admin | GetOpsi mengembalikan pilihan aplikasi (dan SOP) untuk keperluan dropdown di form frontend |
| GET | `/api/flowchart` | Admin OPD, Super Admin | GetDaftar mengambil daftar antrean pengajuan berhalaman beserta tab statistik |
| GET | `/api/flowchart/:id` | Admin OPD, Super Admin | GetDetail mengambil 1 data pengajuan lengkap beserta objek target yang ditinjau |
| POST | `/api/flowchart` | Admin OPD, Super Admin | Create menambah aplikasi baru |
| PUT | `/api/flowchart/:id` | Admin OPD, Super Admin | Update mengubah data aplikasi |

## validasi

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/validasi` | Super Admin | GetDaftar mengambil daftar antrean pengajuan berhalaman beserta tab statistik |
| GET | `/api/validasi/:id` | Super Admin | GetDetail mengambil 1 data pengajuan lengkap beserta objek target yang ditinjau |
| POST | `/api/validasi` | Admin OPD | Ajukan menangani pengajuan data aplikasi/flowchart dari OPD ke Diskominfo |
| POST | `/api/validasi/:id/keputusan` | Super Admin | Putuskan menangani persetujuan/penolakan oleh Super Admin Diskominfo |

## dokumen

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/dokumen/berkas/:nama` | Publik | Berkas unduh |
| GET | `/api/dokumen/ringkasan` | Publik | GetRingkasan mengembalikan ringkasan statistik (total, sesuai, perlu penyesuaian, belum) |
| GET | `/api/dokumen/kategori` | Publik | Get kategori |
| GET | `/api/dokumen` | Publik | List |
| POST | `/api/dokumen/unggah/mulai` | Super Admin | Mulai unggah |
| POST | `/api/dokumen/unggah/berkas/:idSesi` | Super Admin | Hanya Super Admin. Tipe berkas diambil dari sesi yang sudah divalidasi pada tahap "mulai", bukan dari nama berkas kiriman klien; ukuran dan isi awal berkas diperiksa ulang di sini. |
| POST | `/api/dokumen/unggah/selesai` | Super Admin | Selesai unggah |
| GET | `/api/dokumen/:id` | Publik | Get by i d |
| GET | `/api/dokumen/:id/unduh` | Publik | Unduh |
| PATCH | `/api/dokumen/:id` | Super Admin | Ubah status |

## admin

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/admin/dokumen` | Super Admin | List admin |

## forum

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/forum/kategori` | Login | Get kategori |
| GET | `/api/forum/thread` | Login | List thread |
| POST | `/api/forum/thread` | Login | Buat thread |
| GET | `/api/forum/thread/:id` | Login | Get thread detail |
| POST | `/api/forum/thread/:id/balasan` | Login | Buat balasan |
| PUT | `/api/forum/balasan/:id/nilai` | Login | Toggle nilai balasan |
| POST | `/api/forum/laporan` | Login | Buat laporan |

## moderasi

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/moderasi` | Super Admin | List moderasi |
| POST | `/api/moderasi/tindakan` | Login (peran tertentu) | Tindakan moderasi |

## audit

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/audit` | Super Admin | List audit |

## backup

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/backup` | Super Admin | Get backup |
| POST | `/api/backup` | Super Admin | Mulai backup |

## periode

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/periode` | Super Admin | Get periode |
| POST | `/api/periode` | Super Admin | Buat periode |
| PUT | `/api/periode/:id` | Super Admin | Ubah periode |
| DELETE | `/api/periode/:id` | Super Admin | Hapus periode |

## kritik

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/kritik` | Publik | Kirim kritik |
| GET | `/api/kritik` | Super Admin | List kritik |

## auth

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/auth/login` | Publik | Login |
| POST | `/api/auth/ubah-sandi` | Login | Ubah sandi |
| POST | `/api/auth/simulasi-kedaluwarsa` | Login | Simulasi kedaluwarsa sandi (alat uji, hanya terdaftar bila `APP_ENV=development`) |

## me

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/me` | Login | Get me |

## profil

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/profil` | Login | Get profil |
| PUT | `/api/profil` | Login | Ubah profil |
| GET | `/api/profil/preferensi` | Login | Get preferensi |
| PUT | `/api/profil/preferensi` | Login | Ubah preferensi |
| GET | `/api/profil/aktivitas` | Login | List aktivitas saya |

## pengguna

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/pengguna/instansi` | Super Admin | Get instansi pengguna |
| GET | `/api/pengguna` | Super Admin | List pengguna |
| POST | `/api/pengguna` | Super Admin | Undang pengguna |
| PATCH | `/api/pengguna/:id` | Super Admin | Ubah pengguna |
| DELETE | `/api/pengguna/:id` | Super Admin | HapusPengguna menangani DELETE /api/pengguna/:id (Super Admin). |
| POST | `/api/pengguna/:id/undang-ulang` | Super Admin | Undang ulang |

## notifikasi

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/notifikasi/ringkas` | Login | Get ringkas notifikasi |
| GET | `/api/notifikasi` | Login | List notifikasi |
| POST | `/api/notifikasi/dibaca-semua` | Login | Tandai dibaca semua |
| POST | `/api/notifikasi/:id/dibaca` | Login | Tandai dibaca |

## kursus

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/kursus` | Login | List kursus |
| GET | `/api/kursus/:id` | Login | Get kursus detail |
| PUT | `/api/kursus/:id/materi/:materi/selesai` | Login | Tandai materi selesai |

## artikel

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/artikel` | Publik | List artikel |
| GET | `/api/artikel/:id` | Publik | Get artikel detail |
| POST | `/api/artikel` | Super Admin | Buat artikel |

## bantuan

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/bantuan` | Publik | Get bantuan |

## beranda

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/beranda/publik` | Publik | Get beranda publik |
| GET | `/api/beranda` | Login | Get beranda |

## cari

| Metode | Jalur | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/cari` | Publik | Cari |

## Catatan endpoint tertentu

### POST /api/artikel (Super Admin)

Menerbitkan berita atau artikel. Susunan field mengikuti formulir "Tambah Pengetahuan" SIMPAN BRIN.

| Field | Tipe | Aturan |
|---|---|---|
| `jenis` | string | `berita` atau `artikel` |
| `judul` | string | 5 sampai 200 karakter |
| `format` | string | `gambar`, `video`, `audio`, atau `teks` |
| `urlSumber` | string | opsional; URL lengkap `http://` atau `https://`, maksimal 500 karakter |
| `penulis` | string[] | 1 sampai 5 nama, tiap nama maksimal 100 karakter |
| `kolaborator` | string[] | opsional; maksimal 10 nama |
| `ringkasan` | string | 10 sampai 500 karakter, teks polos |
| `konten` | string | minimal 20 karakter, teks polos |
| `kategori` | string | 2 sampai 80 karakter |
| `label` | string[] | opsional; maksimal 10, tiap label maksimal 40 karakter |
| `tanggalTerbit` | string | opsional; `YYYY-MM-DD`, kosong berarti hari ini |
| `statusAkses` | string | `publik` atau `internal`; tulisan internal hanya tampil bagi yang sudah masuk |
| `unggulan` | boolean | opsional |

### Unggah dokumen (Super Admin)

1. `POST /api/dokumen/unggah/mulai` dengan metadata, nama berkas, tipe (`pdf`, `docx`, `xlsx`, `pptx`), dan ukuran. Dijawab `idSesi` (berlaku 10 menit).
2. `POST /api/dokumen/unggah/berkas/{idSesi}` dengan `multipart/form-data` berisi `file`. Tipe diambil dari sesi, bukan dari nama berkas kiriman. Isi awal berkas harus cocok dengan tipenya, dan ukuran maksimal 10 MB (413 bila lebih).
3. `POST /api/dokumen/unggah/selesai` dengan `{ "idSesi": "..." }` membuat dokumen.

### Unduh dokumen

`GET /api/dokumen/{id}/unduh` memeriksa hak akses lalu mengembalikan `url` bertanda tangan (`?e=<kedaluwarsa>&s=<tanda>`) yang berlaku 2 menit dan terikat ke satu berkas. Tautan itu dibuka dengan `GET /api/dokumen/berkas/{nama}`; berkas dikirim sebagai `attachment` dan tanpa tanda yang sah dijawab 403. Token ini hanya untuk satu unduhan dan bukan token sesi.
