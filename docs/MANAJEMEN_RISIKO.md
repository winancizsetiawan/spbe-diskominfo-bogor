# Dokumen manajemen risiko aplikasi

Memenuhi butir A.10 Buku Panduan: dokumen manajemen risiko beserta rencana tindak pengendalian untuk menjamin keberlangsungan layanan.

Ini **rancangan awal** yang disusun dari kondisi aplikasi dan hasil pemeriksaan terhadap Buku Panduan. Penilaian kemungkinan dan dampak, serta penunjukan penanggung jawab, perlu ditetapkan oleh pemilik aplikasi (Diskominfo) bersama Tim Asesmen.

Skala: **Kemungkinan** dan **Dampak** masing-masing Rendah (1), Sedang (2), Tinggi (3). **Tingkat** = Kemungkinan × Dampak: 1 sampai 2 rendah, 3 sampai 4 sedang, 6 sampai 9 tinggi.

| No | Risiko | Kemungkinan | Dampak | Tingkat | Pengendalian yang sudah ada | Rencana tindak lanjut | Penanggung jawab |
|---|---|---|---|---|---|---|---|
| R1 | Akses tanpa hak ke data atau fitur karena token tidak sah | 2 | 3 | 6 | BE memverifikasi tanda tangan JWT RS256, masa berlaku, penerbit, audiens; mode demo ditolak di produksi; penjaga peran di semua endpoint tulis | Uji dengan Keycloak sungguhan; pemantauan penolakan 401/403 | Tim pengembang |
| R2 | Pengguna dianggap orang lain karena identitas hanya dari peran | 1 | 3 | 3 | Identitas diambil dari email terverifikasi di token; email tak terdaftar ditolak; data Admin OPD dibatasi pada instansinya | Uji dengan Keycloak sungguhan; pastikan scope `email` aktif | Tim pengembang |
| R3 | Kehilangan data karena kegagalan disk atau kesalahan operasi | 2 | 3 | 6 | Backup harian `pg_dump` + arsip unggahan, 7 hari terakhir, folder khusus | Salin cadangan ke penyimpanan terpisah; uji pemulihan berkala (minimal tiap kuartal) | Pengelola server |
| R4 | Backup berhenti diam-diam (disk penuh, `pg_dump` hilang) | 2 | 3 | 6 | Riwayat backup mencatat status berhasil atau gagal beserta pesannya; peringatan saat start bila `pg_dump` tidak ada | Pantau halaman Backup dan log; peringatan bila tidak ada backup berhasil lebih dari 24 jam | Pengelola server |
| R5 | Berkas unggahan berbahaya (HTML/skrip, berkas palsu) | 2 | 3 | 6 | Unggah hanya Super Admin; tipe diambil dari sesi; isi awal berkas dicek; maksimal 10 MB; nama acak; unduh lewat tautan bertanda berumur 2 menit; `nosniff` dan `attachment` | Pindai antivirus pada folder unggahan; batasi jumlah berkas per periode | Tim pengembang |
| R6 | Serangan injeksi atau XSS lewat isian | 1 | 3 | 3 | Validasi panjang dan tipe di BE; GORM berparameter; isi tampil sebagai teks; CSP pada build produksi; header keamanan di API | Uji penetrasi oleh Tim Asesmen; audit dependensi (`npm audit`, `govulncheck`) berkala | Tim pengembang |
| R7 | Penyalahgunaan akun (tebak sandi, pencurian sandi) | 2 | 3 | 6 | Sandi dikelola SSO; captcha di mode demo; pembatas laju API | Atur kebijakan sandi, batas salah, masa berlaku, dan captcha di Keycloak (`PANDUAN_INSTALASI.md` bagian 6) | Pengelola SSO |
| R8 | Sesi dicuri atau tertinggal di perangkat bersama | 2 | 2 | 4 | Auto logout 15 menit di FE; token hanya di memori; PKCE | SSO Session Idle 15 menit dan Max 12 jam; token akses pendek | Pengelola SSO |
| R9 | Layanan mati karena beban atau gangguan server | 2 | 2 | 4 | Layanan dijalankan systemd dengan restart otomatis; health check `/api/health` | Pantau ketersediaan; uji beban; rencana server cadangan bila dinilai strategis | Pengelola server |
| R10 | Data internal dasbor (Excel) bocor | 2 | 2 | 4 | Berkas JSON internal tidak masuk git; endpoint internal wajib login; data publik dipisah dan dibatasi | Batasi akses folder `data/dasbor` ke akun layanan; catat siapa menerima berkas | Pemilik data |
| R11 | Data contoh atau akun uji tertinggal di produksi | 2 | 3 | 6 | Seeder hanya aktif di pengembangan (`SEED_DATA`); build produksi tanpa akun demo dan berkas contoh | Pemeriksaan sebelum serah terima; hapus pengguna, peran, dan tabel uji | Tim pengembang |
| R12 | Ketergantungan pada satu pengembang atau pengetahuan tidak terdokumentasi | 2 | 2 | 4 | Dokumen: struktur DB, API, instalasi, sequence diagram, spesifikasi | Alih pengetahuan kepada tim pengelola; pelatihan; helpdesk 1 tahun | Pemilik aplikasi |
| R13 | Kerentanan pada pustaka pihak ketiga | 2 | 2 | 4 | Dependensi dikunci (`go.sum`, `package-lock.json`) | Jadwalkan `npm audit` dan `govulncheck`; perbarui pustaka berkala | Tim pengembang |
| R15 | Kata sandi login prototipe tersimpan tidak aman | 1 | 3 | 3 | Hash PBKDF2-SHA256 berkunci; teks biasa lama di-hash saat start; sandi demo hanya di pengembangan; kunci akun setelah 5 kali salah | Putuskan apakah login lokal dipertahankan; bila ya, sambungkan ke penerbitan token | Tim pengembang |
| R14 | Pelanggaran data pribadi (email, telepon) | 1 | 3 | 3 | Sandi tidak disimpan; data pribadi terbatas pada kebutuhan; akses per peran | Penilaian dampak pelindungan data pribadi; tentukan masa simpan dan masking pada ekspor | Pemilik aplikasi |

## Rencana keberlangsungan layanan (ringkas)

1. **Gangguan aplikasi:** systemd memulai ulang layanan otomatis. Bila gagal berulang, periksa `journalctl -u spbe-api`, lalu pulihkan dari berkas biner terakhir yang baik.
2. **Kehilangan data:** pulihkan dari cadangan terbaru dengan `pg_restore` dan ekstrak arsip unggahan (langkah ada di `PANDUAN_INSTALASI.md` bagian 3). Sasaran titik pemulihan: maksimal 24 jam data (cadangan harian).
3. **SSO tidak tersedia:** pengguna tidak dapat masuk, sedangkan halaman publik tetap terbuka. Gunakan kunci publik yang sudah tersimpan di cache BE (berlaku 10 menit; setelah itu token baru ditolak sampai SSO pulih).
4. **Insiden keamanan:** cabut sesi di SSO, ganti kata sandi database dan kunci, periksa audit trail, dan laporkan sesuai prosedur Diskominfo.
