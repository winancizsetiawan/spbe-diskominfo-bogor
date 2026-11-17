# Panduan instalasi dan konfigurasi di server Linux

Memenuhi butir A.9 Buku Panduan (instalasi dan konfigurasi aplikasi di server Linux). Contoh memakai Ubuntu Server 24.04 LTS. Nama domain, jalur sertifikat, dan kata sandi di bawah adalah **contoh** dan harus diganti.

Susunan: nginx melayani berkas FE dan meneruskan `/api` ke back end (Go) di `127.0.0.1:8080`. Back end memakai PostgreSQL di server yang sama dan memverifikasi token dari Keycloak (SSO Pemkot Bogor).

## 1. Paket dasar

```bash
sudo apt update
sudo apt install -y nginx ufw ca-certificates curl gnupg
# PostgreSQL 17 dan klien (pg_dump) dari repositori resmi PGDG
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt noble-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt update && sudo apt install -y postgresql-17 postgresql-client-17
```

Go dan Node.js hanya dibutuhkan di mesin build (boleh mesin lain). Di server cukup berkas hasil build.

## 2. Database

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE spbe LOGIN PASSWORD 'GANTI-DENGAN-SANDI-KUAT';
CREATE DATABASE spbe_bogor OWNER spbe;
SQL
```

Ganti kata sandi bawaan (`postgres`) milik pengguna `postgres` dan pastikan PostgreSQL hanya mendengarkan `localhost` (`listen_addresses = 'localhost'` di `postgresql.conf`). Pengguna `spbe` cukup memiliki database `spbe_bogor`; tabel dibuat otomatis oleh aplikasi saat pertama berjalan.

Untuk akses baca saja bagi Diskominfo (data warehouse, butir C.p):

```sql
CREATE ROLE dwh_diskominfo LOGIN PASSWORD 'GANTI';
GRANT CONNECT ON DATABASE spbe_bogor TO dwh_diskominfo;
GRANT USAGE ON SCHEMA public TO dwh_diskominfo;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dwh_diskominfo;
ALTER DEFAULT PRIVILEGES FOR ROLE spbe IN SCHEMA public GRANT SELECT ON TABLES TO dwh_diskominfo;
```

## 3. Back end

Build di mesin build, lalu salin ke server:

```bash
cd backend
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o spbe-api ./cmd/api
```

Di server:

```bash
sudo useradd --system --home /opt/spbe --shell /usr/sbin/nologin spbe
sudo mkdir -p /opt/spbe/backend /etc/spbe
sudo cp spbe-api /opt/spbe/backend/
sudo mkdir -p /opt/spbe/backend/data/dasbor /opt/spbe/backend/uploads /opt/spbe/backend/backups
# letakkan dasborPublik.json dan dasborInternal.json (data internal, kirim lewat jalur tertutup) di data/dasbor/
sudo chown -R spbe:spbe /opt/spbe && sudo chmod 700 /opt/spbe/backend/backups
```

Berkas `/etc/spbe/backend.env` (`sudo chmod 600`, pemilik `spbe`):

```ini
APP_ENV=production
PORT=8080
CORS_ALLOWED_ORIGINS=https://spbe.kotabogor.go.id
TRUSTED_PROXIES=127.0.0.1

DB_HOST=localhost
DB_PORT=5432
DB_USER=spbe
DB_PASSWORD=GANTI-DENGAN-SANDI-KUAT
DB_NAME=spbe_bogor
DB_SSLMODE=disable
DB_TIMEZONE=Asia/Jakarta

AUTH_MODE=keycloak
KEYCLOAK_ISSUER=https://sso.kotabogor.go.id/realms/spbe
KEYCLOAK_JWKS_URL=https://sso.kotabogor.go.id/realms/spbe/protocol/openid-connect/certs
KEYCLOAK_CLIENT_ID=spbe-web

PG_DUMP_PATH=/usr/bin/pg_dump
BACKUP_DIR=/opt/spbe/backend/backups
BACKUP_RETENSI=7
BACKUP_JAM=02:00
UPLOADS_DIR=/opt/spbe/backend/uploads

# Jangan isi data contoh di produksi
SEED_DATA=false
```

Server menolak start bila `APP_ENV=production` tetapi `AUTH_MODE=demo`, atau bila `KEYCLOAK_ISSUER` dan `KEYCLOAK_JWKS_URL` kosong.

Layanan systemd `/etc/systemd/system/spbe-api.service`:

```ini
[Unit]
Description=SPBE API
After=network.target postgresql.service

[Service]
User=spbe
WorkingDirectory=/opt/spbe/backend
EnvironmentFile=/etc/spbe/backend.env
ExecStart=/opt/spbe/backend/spbe-api
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=/opt/spbe/backend

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now spbe-api
curl -s http://127.0.0.1:8080/api/health
```

Setelah menyala, log harus memuat `Backup otomatis berikutnya: ...`. Bila muncul `[PERINGATAN] Backup tidak aktif`, periksa `PG_DUMP_PATH` dan paket `postgresql-client-17`. Cadangan harian berisi `spbe-<waktu>.dump` (database) dan `spbe-<waktu>-uploads.zip` (berkas unggahan). Salin folder `backups` ke penyimpanan terpisah secara berkala (butir B.7: cadangan harus tersimpan aman).

Pemulihan:

```bash
pg_restore -U spbe -h localhost -d spbe_bogor --clean --if-exists --no-owner spbe-<waktu>.dump
unzip -o spbe-<waktu>-uploads.zip -d /opt/spbe/backend/uploads
```

## 4. Front end

Di mesin build:

```bash
cd frontend
npm ci
VITE_AUTH_MODE=keycloak VITE_API_MOCK=false \
VITE_KEYCLOAK_URL=https://sso.kotabogor.go.id \
VITE_KEYCLOAK_REALM=spbe VITE_KEYCLOAK_CLIENT_ID=spbe-web \
npm run build
```

Hasilnya di `frontend/dist`. Build produksi:

- tidak memuat akun demo maupun data contoh (sudah dicek: tidak ada kata sandi demo dan nama contoh di bundel);
- membuang `mockServiceWorker.js` dan `mock/` dari folder hasil build;
- memasang Content-Security-Policy pada `index.html`, dengan origin SSO diambil dari `VITE_KEYCLOAK_URL`.

Salin ke server:

```bash
sudo mkdir -p /var/www/spbe && sudo rsync -a --delete dist/ /var/www/spbe/
```

## 5. nginx dan HTTPS

Gunakan sertifikat SSL Pemerintah Daerah dari Diskominfo atau sertifikat resmi lain, bukan sertifikat gratis (butir D.2). Berkas `/etc/nginx/sites-available/spbe`:

```nginx
server {
    listen 80;
    server_name spbe.kotabogor.go.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name spbe.kotabogor.go.id;

    ssl_certificate     /etc/ssl/spbe/fullchain.pem;
    ssl_certificate_key /etc/ssl/spbe/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    root /var/www/spbe;
    index index.html;
    client_max_body_size 11m;       # unggahan maksimal 10 MB + pembungkus multipart
    server_tokens off;

    # Header keamanan untuk halaman web. CSP isi dipasang di index.html saat build;
    # frame-ancestors hanya bisa lewat header.
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Content-Security-Policy "frame-ancestors 'none'" always;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri /index.html;
    }

    # berkas build ber-hash boleh di-cache lama; index.html tidak
    location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
    location = /index.html { add_header Cache-Control "no-store"; }
}
```

Catatan: `add_header` di dalam `location` menghapus `add_header` tingkat `server` untuk lokasi itu. Untuk `/assets/` dan `/index.html` ulangi header keamanan di atas bila diperlukan.

```bash
sudo ln -s /etc/nginx/sites-available/spbe /etc/nginx/sites-enabled/spbe
sudo nginx -t && sudo systemctl reload nginx
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

Port 8080 dan 5432 tidak dibuka ke luar. Pembatas laju back end (600 permintaan per menit per IP) memakai IP asli klien karena `TRUSTED_PROXIES=127.0.0.1`; tanpa itu semua pengguna akan tampak berasal dari IP nginx.

## 6. Konfigurasi SSO (Keycloak)

Banyak butir Buku Panduan B.1 dan B.2 dipenuhi di SSO, bukan di portal. Pengaturan berikut perlu dikonfigurasi dan **buktinya (tangkapan layar) disimpan untuk Tim Asesmen**.

| Butir panduan | Pengaturan Keycloak |
|---|---|
| Realm dan client | Realm `spbe`. Client `spbe-web`: public client, Standard flow, **PKCE S256**, Valid redirect URIs dan Web origins hanya `https://spbe.kotabogor.go.id` |
| Peran aplikasi | Realm roles: `super_admin`, `admin_opd`, `asn`, `akademisi`. Token memuat peran di `realm_access.roles`; BE memakai peran tertinggi yang ada |
| Verifikasi email saat pendaftaran | Realm settings → Login → **Verify email** aktif |
| Kata sandi minimal 8, huruf besar/kecil, angka, simbol | Authentication → Policies → Password policy: Minimum Length 8, Uppercase Characters 1, Lowercase Characters 1, Digits 1, Special Characters 1 |
| Masa berlaku kata sandi 1 tahun | Password policy: **Expire Password** 365 hari |
| Wajib ganti sandi saat pertama masuk (akun dibuat admin) | Buat pengguna dengan sandi sementara dan required action **Update Password** (undangan dari portal juga memakai ini) |
| Batas salah sandi lalu tertahan | Realm settings → Security defenses → **Brute force detection**: Max login failures sesuai keputusan mentor (3) atau panduan (5), Wait increment 3 menit, Permanent lockout nonaktif |
| Reset sandi mandiri | Realm settings → Login → **Forgot password** aktif |
| Auto logout 10 sampai 15 menit | Realm settings → Sessions → **SSO Session Idle** 15 menit (FE juga logout sendiri setelah 15 menit tanpa aktivitas) |
| Autentikasi ulang berkala 12 jam | Sessions → **SSO Session Max** 12 jam |
| Satu akun tidak dipakai bersamaan di beda perangkat | Authentication flow dengan **User session count limiter** (maksimal 1 sesi, tolak sesi baru atau akhiri sesi lama) |
| Logout membatalkan token | Client: aktifkan back-channel/front-channel logout; **Access Token Lifespan** pendek (5 menit) |
| 2FA opsional | Authentication → flow browser: tambahkan **OTP Form** sebagai Conditional/Alternative agar pengguna dapat mengaktifkannya sendiri |
| Captcha atau operasi hitung pada login dan pendaftaran | Halaman login produksi adalah halaman Keycloak, jadi captcha harus dipasang di Keycloak (mis. ekstensi reCAPTCHA atau sejenis). Captcha di portal hanya berlaku pada mode demo |
| Checklist pernyataan kebenaran data | Tidak ada pendaftaran mandiri (akun lewat undangan). Bila pendaftaran dibuka, tambahkan di tema Keycloak |

Isian `KEYCLOAK_ISSUER` harus sama persis dengan klaim `iss` pada token (termasuk nama realm). Cek dengan mendekode token uji.

## 7. Pemeriksaan setelah instalasi

```bash
curl -I https://spbe.kotabogor.go.id                      # 200, ada header keamanan
curl -I http://spbe.kotabogor.go.id                       # 301 ke HTTPS
curl -s https://spbe.kotabogor.go.id/api/health           # {"status":...}
curl -s -o /dev/null -w "%{http_code}\n" https://spbe.kotabogor.go.id/api/aplikasi   # 401 tanpa token
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer demo.super_admin" https://spbe.kotabogor.go.id/api/pengguna   # 401, token demo ditolak
journalctl -u spbe-api -n 30 --no-pager                   # tidak ada PERINGATAN AUTH_MODE=demo
```

Setelah satu malam, pastikan `backups` berisi set cadangan baru dan halaman Backup di aplikasi menampilkan ukuran nyata.

## 8. Batasan yang masih ada sebelum produksi

Ini keadaan kode saat dokumen ini dibuat. Selesaikan sebelum aplikasi dipakai pengguna sungguhan:

1. **Pengguna dikenali dari email terverifikasi di token** (sudah selesai). BE memakai klaim `email` dan `email_verified`; token tanpa email terverifikasi ditolak, dan email yang belum terdaftar di tabel pengguna dijawab 401/403 (tidak ada cadangan ke pengguna lain). Pastikan client Keycloak menyertakan scope `email` dan setiap pengguna memiliki email terverifikasi.
2. **Data Admin OPD dibatasi pada instansinya sendiri** (sudah selesai): daftar, detail, ubah, ringkasan, dan pengajuan validasi aplikasi dan flowchart. Super Admin melihat semua instansi.
3. **Pengguna pertama (Super Admin).** Dengan `SEED_DATA=false` tidak ada pengguna awal. Buat satu baris Super Admin langsung di tabel `pengguna` (dengan email yang sama dengan akun SSO-nya, status `aktif`), lalu undang pengguna lain dari menu Pengguna.
4. **Captcha pada login** harus dipasang di Keycloak (bagian 6).
5. **Login lokal prototipe (`/api/auth/login`).** Kata sandi disimpan sebagai hash PBKDF2-SHA256 berkunci (600.000 iterasi); nilai teks biasa lama otomatis di-hash saat BE menyala, dan kata sandi demo di kode hanya berlaku saat `APP_ENV=development`. Endpoint ini tidak menerbitkan token, jadi di produksi login tetap lewat SSO dan endpoint ini tidak dipakai. Putuskan apakah login lokal dipertahankan atau dihapus.

Sebelum serah terima, pastikan tidak ada data contoh tersisa di database (user, peran, tabel, dan kolom uji; butir B.13).
