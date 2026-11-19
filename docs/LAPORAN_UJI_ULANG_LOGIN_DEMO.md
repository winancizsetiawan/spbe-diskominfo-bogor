# Laporan uji ulang login demo SPBE Diskominfo Bogor

**Tanggal:** 19 November 2026  
**Revisi:** `a6278d4`  
**Status:** Gagal. Empat dari empat akun demo gagal masuk lewat formulir.

## Lingkungan dan cakupan

Playwright menjalankan `frontend/scripts/uji_login.py` melalui Microsoft Edge headless pada `http://127.0.0.1:5173`. Vite dijalankan dengan `VITE_AUTH_MODE=mock` dan `VITE_API_MOCK=true`. Setiap akun diuji dalam sesi browser terpisah. Status HTTP dicatat tanpa menyimpan kata sandi dalam log.

## Hasil

| Akun | Hasil yang diharapkan | Hasil aktual |
| --- | --- | --- |
| ASN | Masuk ke `/beranda` | Gagal, HTTP 403 |
| Akademisi | Masuk ke `/beranda` | Gagal, HTTP 403 |
| Admin OPD | Masuk ke `/beranda` | Gagal, HTTP 403 |
| Super Admin | Masuk ke `/beranda` | Gagal, HTTP 403 |

Keempat akun tetap berada di `/masuk` dengan pesan “Terjadi kesalahan pada server. Silakan coba lagi.”

| Skenario | Hasil QA | Bukti |
| --- | --- | --- |
| CAPTCHA salah | Lulus | Formulir menampilkan pesan validasi CAPTCHA. |
| Kolom wajib kosong | Lulus | Formulir menampilkan pesan bahwa kolom wajib diisi. |
| Kata sandi salah | Belum terverifikasi | Permintaan mendapat HTTP 403 dan menampilkan pesan kesalahan server. Skrip menandainya lulus karena menerima pesan galat apa pun. |
| Buka `/forum` tanpa sesi, lalu login | Gagal | Portal mengarah ke `/masuk?kembali=%2Fforum`. Setelah formulir dikirim, permintaan login mendapat HTTP 403 dan pengguna tetap di halaman masuk. |

## Reproduksi dan tindak lanjut

1. Jalankan frontend dengan kedua pengaturan mock di atas.
2. Buka `/masuk`, pilih satu akun contoh, isi CAPTCHA yang benar, lalu klik **Masuk ke Akun**.
3. Periksa respons `POST /api/auth/login` di tab Network. Pada uji ulang, responsnya HTTP 403 untuk semua akun uji.

[Handler autentikasi mock](../frontend/src/mocks/handlers/auth.ts) belum menangani `POST /api/auth/login`. [Formulir login](../frontend/src/features/auth/LoginPage.tsx) menghentikan alur saat menerima HTTP 403 sebelum mencapai validasi akun demo lokal. Prioritas perbaikan adalah memastikan permintaan login ditangani di mode mock dan memperketat pemeriksaan kasus kata sandi salah di [skrip QA](../frontend/scripts/uji_login.py).

Uji ulang ini mencakup formulir akun demo. Logout setelah login, Keycloak, dan TND belum diverifikasi. Kode aplikasi tidak diubah.
