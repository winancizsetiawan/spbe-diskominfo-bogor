# Sequence diagram

Memenuhi butir A.5 Buku Panduan (Sequence Diagram untuk tahapan utama aplikasi). Ditulis dengan sintaks [Mermaid](https://mermaid.js.org); GitHub menampilkannya sebagai gambar. Alur dibaca dari kode FE dan BE yang ada.

Singkatan: **FE** = aplikasi web (React), **BE** = API (Go), **SSO** = Keycloak, **DB** = PostgreSQL.

## 1. Masuk lewat SSO dan memanggil API

```mermaid
sequenceDiagram
    actor P as Pengguna
    participant FE
    participant SSO as SSO (Keycloak)
    participant BE
    participant DB

    P->>FE: Buka halaman internal
    FE->>SSO: Authorization Code + PKCE (S256)
    SSO-->>P: Form login (sandi, captcha, OTP bila aktif)
    P->>SSO: Kirim kredensial
    SSO-->>FE: Kode otorisasi
    FE->>SSO: Tukar kode dengan token akses
    SSO-->>FE: Token akses (disimpan di memori)
    FE->>BE: GET /api/me (Authorization: Bearer token)
    BE->>SSO: Ambil kunci publik (JWKS), di-cache 10 menit
    BE->>BE: Periksa tanda tangan RS256, kedaluwarsa, penerbit, audiens, ambil peran
    BE->>DB: Ambil data pengguna
    DB-->>BE: Pengguna
    BE-->>FE: 200 data pengguna + peran
    FE-->>P: Beranda sesuai peran
    Note over FE: 15 menit tanpa aktivitas, FE logout otomatis
```

## 2. Unggah dokumen (Super Admin)

```mermaid
sequenceDiagram
    actor A as Super Admin
    participant FE
    participant BE
    participant FS as Folder uploads
    participant DB

    A->>FE: Pilih berkas + isi metadata
    FE->>BE: POST /api/dokumen/unggah/mulai (nama, tipe, ukuran, metadata)
    BE->>BE: Validasi peran, metadata, tipe (pdf/docx/xlsx/pptx), ukuran maks 10 MB
    BE-->>FE: idSesi (berlaku 10 menit)
    FE->>BE: POST /api/dokumen/unggah/berkas/{idSesi} (multipart, dengan token)
    BE->>BE: Cek login + peran, ukuran nyata, isi awal berkas cocok dengan tipe
    BE->>FS: Simpan sebagai {idSesi}.{tipe} (nama acak)
    BE-->>FE: 204
    FE->>BE: POST /api/dokumen/unggah/selesai {idSesi}
    BE->>DB: Simpan dokumen (status draft)
    BE-->>FE: 201 dokumen
    FE-->>A: Dokumen muncul di Repositori
```

## 3. Unduh dokumen

```mermaid
sequenceDiagram
    actor U as Pengguna
    participant FE
    participant BE
    participant FS as Folder uploads

    U->>FE: Klik Unduh
    FE->>BE: GET /api/dokumen/{id}/unduh
    BE->>BE: Cek hak akses (status, visibilitas, login)
    alt tidak berhak
        BE-->>FE: 401 atau 404
        FE-->>U: Arahkan ke halaman masuk / pesan tidak tersedia
    else berhak
        BE-->>FE: url bertanda (?e=kedaluwarsa&s=tanda), berlaku 2 menit
        FE->>BE: GET /api/dokumen/berkas/{nama}?e=...&s=...
        BE->>BE: Periksa nama berkas, tanda tangan HMAC, masa berlaku
        BE->>FS: Baca berkas
        BE-->>FE: Berkas (attachment, nosniff)
        FE-->>U: Berkas terunduh
    end
```

## 4. Ajukan dan putuskan validasi data aplikasi

```mermaid
sequenceDiagram
    actor O as Admin OPD
    actor S as Super Admin
    participant FE
    participant BE
    participant DB

    O->>FE: Pilih aplikasi siap diajukan, klik Ajukan
    FE->>BE: POST /api/validasi {idAplikasi...}
    BE->>BE: Cek peran Admin OPD
    BE->>DB: Buat pengajuan (menunggu), ubah status aplikasi
    BE->>DB: Buat notifikasi untuk Super Admin
    BE-->>FE: 200 (berhasil / dilewati beserta alasan)
    S->>FE: Buka Validasi, pilih pengajuan
    FE->>BE: GET /api/validasi/{id}
    BE-->>FE: Detail pengajuan
    S->>FE: Setujui, minta revisi, atau tolak (catatan wajib bila revisi/tolak)
    FE->>BE: POST /api/validasi/{id}/keputusan
    BE->>BE: Cek peran Super Admin, validasi catatan
    BE->>DB: Simpan keputusan + ubah status aplikasi
    BE->>DB: Buat notifikasi untuk pengaju
    BE-->>FE: 200 pengajuan
    Note over O: Admin OPD menerima notifikasi (lonceng)
```

## 5. Tambah berita atau artikel (Super Admin)

```mermaid
sequenceDiagram
    actor A as Super Admin
    participant FE
    participant BE
    participant DB

    A->>FE: Tambah, pilih Berita atau Artikel
    FE-->>A: Formulir (judul, format, URL, penulis, kolaborator, ringkasan, detail, kategori, label, tanggal, status akses, unggulan)
    A->>FE: Simpan
    FE->>FE: Validasi isian di sisi klien
    FE->>BE: POST /api/artikel
    BE->>BE: Cek peran Super Admin
    BE->>BE: Validasi semua field, bersihkan daftar (hapus kosong dan kembar)
    alt isian tidak valid
        BE-->>FE: 422 + pesan per kolom
        FE-->>A: Pesan tampil di bawah kolom
    else valid
        BE->>DB: Simpan tulisan
        BE-->>FE: 201 tulisan
        FE-->>A: Buka halaman tulisan
    end
    Note over BE: Tulisan berakses internal tidak muncul di daftar atau pencarian publik
```

## 6. Backup harian

```mermaid
sequenceDiagram
    participant J as Penjadwal (02:00)
    actor A as Super Admin
    participant BE
    participant DB
    participant PG as pg_dump
    participant FS as Folder backups

    alt otomatis
        J->>BE: Waktu backup tiba
    else manual
        A->>BE: POST /api/backup
    end
    BE->>DB: Catat riwayat (berjalan)
    BE->>PG: Jalankan pg_dump (sandi lewat lingkungan proses)
    PG->>FS: spbe-{waktu}.dump
    BE->>FS: Arsipkan folder uploads ke spbe-{waktu}-uploads.zip
    BE->>FS: Hapus set lama, sisakan 7 terbaru
    BE->>DB: Perbarui riwayat (berhasil + ukuran nyata, atau gagal + pesan)
    BE->>DB: Catat ke audit trail
```
