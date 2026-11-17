# Struktur database

Dibuat otomatis dari database PostgreSQL yang berjalan (`spbe_bogor`) pada tanggal pembuatan dokumen ini. Tabel dibuat oleh GORM (`AutoMigrate`) dari model di `backend/internal/domain`. Bila model berubah, jalankan ulang pembuatan dokumen agar tetap sesuai.

Jumlah tabel: **27**

## Daftar tabel

- [`aplikasi`](#aplikasi) (15 kolom)
- [`artikel`](#artikel) (15 kolom)
- [`audit_log`](#audit_log) (7 kolom)
- [`dokumen`](#dokumen) (15 kolom)
- [`flowchart`](#flowchart) (13 kolom)
- [`flowchart_aplikasi`](#flowchart_aplikasi) (2 kolom)
- [`flowchart_dokumen`](#flowchart_dokumen) (2 kolom)
- [`flowchart_riwayat`](#flowchart_riwayat) (6 kolom)
- [`forum_balasan`](#forum_balasan) (7 kolom)
- [`forum_balasan_nilai`](#forum_balasan_nilai) (3 kolom)
- [`forum_laporan`](#forum_laporan) (8 kolom)
- [`forum_thread`](#forum_thread) (9 kolom)
- [`instansi`](#instansi) (5 kolom)
- [`kategori_dokumen`](#kategori_dokumen) (2 kolom)
- [`kategori_forum`](#kategori_forum) (2 kolom)
- [`kritik_saran`](#kritik_saran) (5 kolom)
- [`kursus`](#kursus) (8 kolom)
- [`kursus_materi`](#kursus_materi) (6 kolom)
- [`kursus_progres`](#kursus_progres) (4 kolom)
- [`kursus_sertifikat`](#kursus_sertifikat) (5 kolom)
- [`node_raa`](#node_raa) (4 kolom)
- [`notifikasi`](#notifikasi) (8 kolom)
- [`pengajuan_validasi`](#pengajuan_validasi) (12 kolom)
- [`pengguna`](#pengguna) (14 kolom)
- [`periode_pembaruan`](#periode_pembaruan) (7 kolom)
- [`profil_pengguna`](#profil_pengguna) (7 kolom)
- [`riwayat_backup`](#riwayat_backup) (7 kolom)

## aplikasi

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('aplikasi_id_seq'::regclass)` | kunci utama |
| `instansi_id` | bigint | ya |  | relasi ke `instansi.id` |
| `nama` | varchar(150) | ya |  |  |
| `deskripsi` | text | ya |  |  |
| `kategori` | varchar(100) | tidak |  |  |
| `raa_level1` | varchar(20) | tidak |  |  |
| `raa_level2` | varchar(20) | tidak |  |  |
| `raa_level3` | varchar(20) | tidak |  |  |
| `status_validasi` | varchar(30) | ya | `'draft'::character varying` |  |
| `status_raa` | varchar(30) | ya | `'belum'::character varying` |  |
| `nilai_kesesuaian` | bigint | ya | `0` |  |
| `catatan_validasi` | text | tidak |  |  |
| `diperbarui_pada` | timestamp with time zone | tidak |  |  |
| `created_at` | timestamp with time zone | tidak |  |  |
| `updated_at` | timestamp with time zone | tidak |  |  |

Indeks: `idx_aplikasi_instansi_id`

## artikel

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('artikel_id_seq'::regclass)` | kunci utama |
| `jenis` | varchar(20) | ya |  |  |
| `judul` | varchar(200) | ya |  |  |
| `ringkasan` | varchar(500) | ya |  |  |
| `penulis` | varchar(300) | ya |  |  |
| `tanggal` | timestamp with time zone | tidak |  |  |
| `views` | bigint | ya | `0` |  |
| `konten` | text | ya |  |  |
| `format` | varchar(10) | ya | `'teks'::character varying` |  |
| `url_sumber` | varchar(500) | ya | `''::character varying` |  |
| `kolaborator` | jsonb | ya | `'[]'::jsonb` |  |
| `kategori` | varchar(80) | ya | `''::character varying` |  |
| `label` | jsonb | ya | `'[]'::jsonb` |  |
| `status_akses` | varchar(10) | ya | `'publik'::character varying` |  |
| `unggulan` | boolean | ya | `false` |  |

Indeks: `idx_artikel_jenis`, `idx_artikel_status_akses`, `idx_artikel_tanggal`

## audit_log

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('audit_log_id_seq'::regclass)` | kunci utama |
| `user_id` | bigint | tidak |  | relasi ke `pengguna.id` |
| `aksi` | varchar(30) | ya |  |  |
| `hasil` | varchar(20) | ya | `'berhasil'::character varying` |  |
| `deskripsi` | varchar(500) | ya |  |  |
| `ip_address` | varchar(60) | tidak |  |  |
| `waktu` | timestamp with time zone | tidak |  |  |

Indeks: `idx_audit_log_aksi`, `idx_audit_log_hasil`, `idx_audit_log_user_id`, `idx_audit_log_waktu`

## dokumen

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('dokumen_id_seq'::regclass)` | kunci utama |
| `jenis` | varchar(30) | ya |  |  |
| `judul` | varchar(150) | ya |  |  |
| `deskripsi` | text | ya |  |  |
| `tipe_berkas` | varchar(10) | ya |  |  |
| `ukuran_mb` | numeric(6,2) | ya |  |  |
| `versi` | varchar(20) | ya |  |  |
| `sumber` | varchar(100) | tidak |  |  |
| `status` | varchar(20) | ya | `'draft'::character varying` |  |
| `visibilitas` | varchar(20) | ya | `'internal'::character varying` |  |
| `jumlah_unduhan` | bigint | ya | `0` |  |
| `id_kategori` | bigint | tidak |  | relasi ke `kategori_dokumen.id` |
| `path_berkas` | varchar(255) | tidak |  |  |
| `tanggal_rilis` | timestamp with time zone | tidak |  |  |
| `updated_at` | timestamp with time zone | tidak |  |  |

Indeks: `idx_dokumen_id_kategori`, `idx_dokumen_jenis`, `idx_dokumen_status`, `idx_dokumen_tanggal_rilis`, `idx_dokumen_visibilitas`

## flowchart

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('flowchart_id_seq'::regclass)` | kunci utama |
| `kode` | varchar(30) | ya |  |  |
| `nama` | varchar(150) | ya |  |  |
| `deskripsi` | text | tidak |  |  |
| `kategori` | varchar(30) | ya |  |  |
| `jenis` | varchar(20) | ya |  |  |
| `versi` | varchar(20) | ya | `'1.0'::character varying` |  |
| `pic` | varchar(100) | ya |  |  |
| `instansi_id` | bigint | ya |  | relasi ke `instansi.id` |
| `status` | varchar(30) | ya | `'draft'::character varying` |  |
| `catatan_validasi` | text | tidak |  |  |
| `bpmn_xml` | text | tidak |  |  |
| `diperbarui_pada` | timestamp with time zone | tidak |  |  |

Indeks: `idx_flowchart_instansi_id`, `idx_flowchart_kode`

## flowchart_aplikasi

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `flowchart_id` | bigint | ya |  | kunci utama, relasi ke `flowchart.id` |
| `aplikasi_id` | bigint | ya |  | kunci utama, relasi ke `aplikasi.id` |

## flowchart_dokumen

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `flowchart_id` | bigint | ya |  | kunci utama, relasi ke `flowchart.id` |
| `dokumen_id` | bigint | ya |  | kunci utama, relasi ke `dokumen.id` |

## flowchart_riwayat

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('flowchart_riwayat_id_seq'::r…` | kunci utama |
| `flowchart_id` | bigint | ya |  | relasi ke `flowchart.id` |
| `versi` | varchar(20) | tidak |  |  |
| `catatan` | varchar(300) | tidak |  |  |
| `oleh` | varchar(150) | tidak |  |  |
| `tanggal` | timestamp with time zone | tidak |  |  |

Indeks: `idx_flowchart_riwayat_flowchart_id`

## forum_balasan

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('forum_balasan_id_seq'::regcl…` | kunci utama |
| `thread_id` | bigint | ya |  | relasi ke `forum_thread.id` |
| `konten` | text | ya |  |  |
| `penulis_id` | bigint | ya |  | relasi ke `pengguna.id` |
| `tersembunyi` | boolean | ya | `false` |  |
| `dibuat_pada` | timestamp with time zone | tidak |  |  |
| `updated_at` | timestamp with time zone | tidak |  |  |

Indeks: `idx_forum_balasan_dibuat_pada`, `idx_forum_balasan_penulis_id`, `idx_forum_balasan_tersembunyi`, `idx_forum_balasan_thread_id`

## forum_balasan_nilai

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `balasan_id` | bigint | ya |  | kunci utama, relasi ke `forum_balasan.id` |
| `user_id` | bigint | ya |  | kunci utama |
| `created_at` | timestamp with time zone | tidak |  |  |

## forum_laporan

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('forum_laporan_id_seq'::regcl…` | kunci utama |
| `target_tipe` | varchar(20) | ya |  |  |
| `target_id` | bigint | ya |  |  |
| `pelapor_id` | bigint | ya |  |  |
| `pelapor` | varchar(120) | ya |  |  |
| `alasan` | varchar(500) | ya |  |  |
| `status` | varchar(20) | ya | `'baru'::character varying` |  |
| `dibuat_pada` | timestamp with time zone | tidak |  |  |

Indeks: `idx_forum_laporan_dibuat_pada`, `idx_forum_laporan_pelapor_id`, `idx_forum_laporan_status`, `idx_target_laporan`

## forum_thread

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('forum_thread_id_seq'::regclass)` | kunci utama |
| `id_kategori` | bigint | ya |  | relasi ke `kategori_forum.id` |
| `judul` | varchar(150) | ya |  |  |
| `konten` | text | ya |  |  |
| `penulis_id` | bigint | ya |  | relasi ke `pengguna.id` |
| `dilihat` | bigint | ya | `0` |  |
| `status` | varchar(20) | ya | `'aktif'::character varying` |  |
| `dibuat_pada` | timestamp with time zone | tidak |  |  |
| `updated_at` | timestamp with time zone | tidak |  |  |

Indeks: `idx_forum_thread_dibuat_pada`, `idx_forum_thread_id_kategori`, `idx_forum_thread_penulis_id`, `idx_forum_thread_status`

## instansi

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('instansi_id_seq'::regclass)` | kunci utama |
| `nama` | varchar(150) | ya |  |  |
| `jenis` | varchar(50) | ya | `'OPD'::character varying` |  |
| `created_at` | timestamp with time zone | tidak |  |  |
| `updated_at` | timestamp with time zone | tidak |  |  |

Indeks: `idx_instansi_nama`

## kategori_dokumen

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('kategori_dokumen_id_seq'::re…` | kunci utama |
| `nama` | varchar(100) | ya |  |  |

Indeks: `idx_kategori_dokumen_nama`

## kategori_forum

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('kategori_forum_id_seq'::regc…` | kunci utama |
| `nama` | varchar(100) | ya |  |  |

Indeks: `idx_kategori_forum_nama`

## kritik_saran

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('kritik_saran_id_seq'::regclass)` | kunci utama |
| `nama` | varchar(100) | ya |  |  |
| `email` | varchar(150) | ya |  |  |
| `pesan` | text | ya |  |  |
| `dibuat_pada` | timestamp with time zone | tidak |  |  |

Indeks: `idx_kritik_saran_dibuat_pada`

## kursus

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('kursus_id_seq'::regclass)` | kunci utama |
| `judul` | varchar(150) | ya |  |  |
| `deskripsi` | text | ya |  |  |
| `kategori` | varchar(100) | ya |  |  |
| `tingkat` | varchar(30) | ya |  |  |
| `durasi_jam` | bigint | ya | `1` |  |
| `ada_sertifikat` | boolean | ya | `true` |  |
| `created_at` | timestamp with time zone | tidak |  |  |

## kursus_materi

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('kursus_materi_id_seq'::regcl…` | kunci utama |
| `kursus_id` | bigint | ya |  | relasi ke `kursus.id` |
| `judul` | varchar(150) | ya |  |  |
| `tipe` | varchar(20) | ya | `'video'::character varying` |  |
| `url` | varchar(255) | ya |  |  |
| `urutan` | bigint | ya | `1` |  |

Indeks: `idx_kursus_materi_kursus_id`

## kursus_progres

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `user_id` | bigint | ya |  | kunci utama |
| `materi_id` | bigint | ya |  | kunci utama |
| `kursus_id` | bigint | ya |  |  |
| `selesai_pada` | timestamp with time zone | tidak |  |  |

Indeks: `idx_kursus_progres_kursus_id`

## kursus_sertifikat

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `user_id` | bigint | ya |  | kunci utama |
| `kursus_id` | bigint | ya |  | kunci utama |
| `nomor` | varchar(100) | ya |  |  |
| `kursus_judul` | varchar(150) | ya |  |  |
| `diterbitkan_pada` | timestamp with time zone | tidak |  |  |

Indeks: `idx_kursus_sertifikat_nomor`

## node_raa

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `kode` | varchar(20) | ya |  | kunci utama |
| `nama` | varchar(200) | ya |  |  |
| `parent_kode` | varchar(20) | tidak |  | relasi ke `node_raa.kode` |
| `level` | bigint | ya |  |  |

Indeks: `idx_node_raa_parent_kode`

## notifikasi

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('notifikasi_id_seq'::regclass)` | kunci utama |
| `user_id` | bigint | ya |  |  |
| `kategori` | varchar(30) | ya |  |  |
| `judul` | varchar(150) | ya |  |  |
| `pesan` | varchar(500) | ya |  |  |
| `url_tujuan` | varchar(255) | ya |  |  |
| `sudah_dibaca` | boolean | ya | `false` |  |
| `dibuat_pada` | timestamp with time zone | tidak |  |  |

Indeks: `idx_notifikasi_dibuat_pada`, `idx_notifikasi_kategori`, `idx_notifikasi_sudah_dibaca`, `idx_notifikasi_user_id`

## pengajuan_validasi

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('pengajuan_validasi_id_seq'::…` | kunci utama |
| `jenis_data` | varchar(20) | ya |  |  |
| `status` | varchar(30) | ya | `'menunggu'::character varying` |  |
| `instansi_id` | bigint | ya |  | relasi ke `instansi.id` |
| `aplikasi_id` | bigint | tidak |  | relasi ke `aplikasi.id` |
| `flowchart_id` | bigint | tidak |  | relasi ke `flowchart.id` |
| `pengaju` | varchar(150) | ya |  |  |
| `tanggal_pengajuan` | timestamp with time zone | tidak |  |  |
| `tanggal_putusan` | timestamp with time zone | tidak |  |  |
| `catatan` | text | tidak |  |  |
| `created_at` | timestamp with time zone | tidak |  |  |
| `updated_at` | timestamp with time zone | tidak |  |  |

Indeks: `idx_pengajuan_validasi_aplikasi_id`, `idx_pengajuan_validasi_flowchart_id`, `idx_pengajuan_validasi_instansi_id`

## pengguna

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('pengguna_id_seq'::regclass)` | kunci utama |
| `keycloak_sub` | varchar(100) | tidak |  |  |
| `nama` | varchar(150) | ya |  |  |
| `email` | varchar(150) | ya |  |  |
| `role` | varchar(30) | ya |  |  |
| `status_akun` | varchar(30) | ya | `'aktif'::character varying` |  |
| `instansi_id` | bigint | ya |  | relasi ke `instansi.id` |
| `login_terakhir` | timestamp with time zone | tidak |  |  |
| `created_at` | timestamp with time zone | tidak |  |  |
| `updated_at` | timestamp with time zone | tidak |  |  |
| `gagal_login` | bigint | ya | `0` |  |
| `terkunci_hingga` | timestamp with time zone | tidak |  |  |
| `kata_sandi` | varchar(255) | tidak |  |  |
| `sandi_diubah_pada` | timestamp with time zone | tidak |  |  |

Indeks: `idx_pengguna_email`, `idx_pengguna_keycloak_sub`

## periode_pembaruan

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('periode_pembaruan_id_seq'::r…` | kunci utama |
| `nama` | varchar(100) | ya |  |  |
| `tanggal_mulai` | varchar(10) | ya |  |  |
| `tenggat` | varchar(10) | ya |  |  |
| `dibuat_oleh` | varchar(120) | ya |  |  |
| `created_at` | timestamp with time zone | tidak |  |  |
| `updated_at` | timestamp with time zone | tidak |  |  |

Indeks: `idx_periode_pembaruan_nama`, `idx_periode_pembaruan_tanggal_mulai`, `idx_periode_pembaruan_tenggat`

## profil_pengguna

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `user_id` | bigint | ya | `nextval('profil_pengguna_user_id_seq'…` | kunci utama |
| `n_ip` | varchar(50) | tidak |  |  |
| `jabatan` | varchar(100) | tidak |  |  |
| `golongan` | varchar(50) | tidak |  |  |
| `satker_induk` | varchar(150) | tidak |  |  |
| `no_telepon` | varchar(30) | tidak |  |  |
| `kanal_email` | boolean | ya | `true` |  |

## riwayat_backup

| Kolom | Tipe | Wajib isi | Bawaan | Keterangan |
|---|---|---|---|---|
| `id` | bigint | ya | `nextval('riwayat_backup_id_seq'::regc…` | kunci utama |
| `tipe` | varchar(20) | ya |  |  |
| `status` | varchar(20) | ya |  |  |
| `ukuran_mb` | numeric(8,2) | tidak |  |  |
| `oleh` | varchar(120) | tidak |  |  |
| `waktu` | timestamp with time zone | tidak |  |  |
| `pesan_gagal` | varchar(255) | tidak |  |  |

Indeks: `idx_riwayat_backup_status`, `idx_riwayat_backup_waktu`
