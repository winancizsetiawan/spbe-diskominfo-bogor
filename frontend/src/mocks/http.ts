import { HttpResponse } from 'msw'
import type { User } from '@/auth/types'
import { USERS } from './db'

/** Token mode demo berbentuk `demo.<role>` (lihat auth/mockAdapter.ts). */
export function currentUser(request: Request): User | null {
  const header = request.headers.get('Authorization') ?? ''
  const prefix = 'Bearer demo.'
  if (!header.startsWith(prefix)) return null
  return USERS[header.slice(prefix.length)] ?? null
}

export const unauthorized = () => HttpResponse.json({ message: 'Sesi tidak valid.' }, { status: 401 })

export const notFound = (message = 'Data tidak ditemukan.') => HttpResponse.json({ message }, { status: 404 })

export const conflict = (message: string) => HttpResponse.json({ message }, { status: 409 })

export const invalid = (errors: Record<string, string>) =>
  HttpResponse.json({ message: 'Periksa kembali isian Anda.', errors }, { status: 422 })
