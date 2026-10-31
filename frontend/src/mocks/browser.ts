import { getResponse } from 'msw'
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * Nyalakan mock API. Bila Service Worker tidak dapat didaftarkan (mis. browser
 * tertanam yang memblokirnya), fetch ke /api/* dicegat langsung di halaman.
 */
export async function startMocks() {
  try {
    await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass', quiet: true })
  } catch (err) {
    console.warn('[mock] Service Worker tidak tersedia, memakai fallback fetch.', err)
    const fetchAsli = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const request = new Request(input, init)
      if (new URL(request.url).pathname.startsWith('/api/')) {
        const response = await getResponse(handlers, request)
        if (response) return response
      }
      return fetchAsli(input, init)
    }
  }
}
