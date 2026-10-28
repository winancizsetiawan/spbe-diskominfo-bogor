import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
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

export default defineConfig({
  plugins: [react(), tailwindcss(), mockUpload()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true, host: true }, // host: true agar dapat dibuka dari HP di jaringan yang sama
})
