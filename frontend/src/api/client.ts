import { authAdapter } from '@/auth/adapter'
import { authReady } from '@/auth/ready'

export interface Paged<T> {
  items: T[]
  page: number
  totalPages: number
  total: number
}

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

// Buku Panduan: jangan tampilkan detail error sistem ke pengguna.
const GENERIC_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi.'

export type ApiInit = Omit<RequestInit, 'body'> & { json?: unknown }

async function send(path: string, init: ApiInit, forceRefresh: boolean) {
  const { json, ...rest } = init
  const token = await authAdapter.getToken(forceRefresh)
  const headers = new Headers(rest.headers)
  headers.set('Accept', 'application/json')
  if (json !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(`/api${path}`, {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  })
}

/** Panggil API portal. 401 dicoba ulang sekali dengan token baru, lalu diarahkan ke login. */
export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  await authReady
  let res = await send(path, init, false)
  if (res.status === 401 && authAdapter.hasSession()) {
    res = await send(path, init, true)
    if (res.status === 401) {
      authAdapter.login(window.location.pathname + window.location.search)
      throw new ApiError(401, 'Sesi Anda berakhir. Silakan masuk kembali.')
    }
  }
  if (!res.ok) {
    if (res.status >= 500) throw new ApiError(res.status, GENERIC_ERROR)
    const body = (await res.json().catch(() => ({}))) as {
      message?: string
      errors?: Record<string, string>
    }
    throw new ApiError(res.status, body.message ?? GENERIC_ERROR, body.errors)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
