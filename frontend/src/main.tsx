import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import './index.css'

async function enableMocks() {
  if (import.meta.env.VITE_API_MOCK !== 'true') return
  const { startMocks } = await import('@/mocks/browser')
  await startMocks()
}

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// Aplikasi tetap dirender walaupun mock gagal dinyalakan.
enableMocks()
  .catch((err: unknown) => console.error('[mock] Gagal menyalakan mock API.', err))
  .finally(render)
