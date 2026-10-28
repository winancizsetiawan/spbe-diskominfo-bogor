# Frontend Portal SPBE Kota Bogor

React + Vite + TypeScript + Tailwind. Rancangan lengkap: `../Praproses/Revisi/Rancangan_Frontend.md`.

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:5173. Mode bawaan (`.env.development`) memakai login demo dan mock API, jadi tidak perlu backend atau Keycloak: klik **Masuk** lalu pilih peran.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Dev server |
| `npm run typecheck` | Cek tipe TypeScript |
| `npm run build` | Typecheck + build produksi ke `dist/` |

## Mode

| Variabel | Nilai | Arti |
|---|---|---|
| `VITE_AUTH_MODE` | `mock` / `keycloak` | Login demo atau SSO Keycloak. **Bawaan: `keycloak`** bila tidak diset, jadi build tanpa konfigurasi tidak membuka login demo. Kode login demo tidak ikut ke bundle kecuali diminta `mock` |
| `VITE_API_MOCK` | `true` / `false` | MSW mencegat `/api/*` atau diteruskan ke backend |

Mock API memakai Service Worker MSW. Bila browser memblokir Service Worker, `fetch` ke `/api/*` dicegat langsung di halaman (lihat `src/mocks/browser.ts`).

Unggah dokumen di mode mock mengirim berkas ke `POST /mock-upload/*`, yang dijawab oleh middleware dev server di `vite.config.ts` (pengganti MinIO). Middleware ini hanya aktif saat `npm run dev`.

## Menambah fitur

1. Buat `src/features/<fitur>/` berisi `types.ts`, `api.ts` (hook TanStack Query), `pages/`, `components/`.
2. Ganti `soon(...)` di `src/app/router.tsx` dengan halaman baru.
3. Tambahkan handler mock di `src/mocks/handlers/` dan daftarkan di `handlers/index.ts`.
4. Hak akses baru: tambahkan di `src/auth/permissions.ts`; menu di `src/app/navigation.ts`.
