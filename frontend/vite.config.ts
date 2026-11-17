import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Hanya mode pengembangan: pengganti Object Storage untuk mock unggah dokumen.
 * Menerima POST /mock-upload/* dan membalas 204, sehingga XMLHttpRequest dengan
 * progres unggahan berjalan sungguhan tanpa MinIO.
 */
function mockUpload(): Plugin {
  return {
    name: 'mock-upload',
    configureServer(server) {
      server.middlewares.use('/mock-upload', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        req.on('data', () => {})
        req.on('end', () => {
          res.statusCode = 204
          res.end()
        })
      })
    },
  }
}

/** Origin dari URL, atau null bila kosong/tidak valid. */
function origin(url: string | undefined) {
  try {
    return url ? new URL(url).origin : null
  } catch {
    return null
  }
}

/**
 * Hanya build: memasang Content-Security-Policy pada index.html (Buku Panduan B.9 dan B.13).
 * Tidak dipasang saat pengembangan karena HMR Vite butuh skrip inline.
 * frame-ancestors tidak bisa lewat <meta>; atur di server statis (lihat docs/PANDUAN_INSTALASI.md).
 */
function cspProduksi(keycloak: string | null): Plugin {
  const sso = keycloak ? ` ${keycloak}` : ''
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // atribut style dari React dan bpmn-js
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${sso}`,
    `frame-src 'self'${sso}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'csp-produksi',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`),
  }
}

/**
 * Hanya build produksi (bukan mode mock): buang artefak demo dari folder hasil build supaya
 * tidak ikut terpasang di server (Buku Panduan B.13: hapus data dummy dan uji coba).
 */
function bersihkanArtefakDemo(aktif: boolean): Plugin {
  let keluaran = ''
  return {
    name: 'bersihkan-artefak-demo',
    apply: 'build',
    configResolved(c) {
      keluaran = resolve(c.root, c.build.outDir)
    },
    closeBundle() {
      if (!aktif || !keluaran) return
      for (const f of ['mockServiceWorker.js', 'mock']) rmSync(resolve(keluaran, f), { recursive: true, force: true })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const produksiSungguhan = env.VITE_API_MOCK !== 'true' && env.VITE_AUTH_MODE !== 'mock'
  return {
    plugins: [react(), tailwindcss(), mockUpload(), cspProduksi(origin(env.VITE_KEYCLOAK_URL)), bersihkanArtefakDemo(produksiSungguhan)],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      strictPort: true,
      host: true, // agar dapat dibuka dari HP di jaringan yang sama
      // Dipakai saat VITE_API_MOCK=false; saat mock aktif, MSW mencegat /api lebih dulu.
      proxy: { '/api': 'http://localhost:8080' },
    },
  }
})
