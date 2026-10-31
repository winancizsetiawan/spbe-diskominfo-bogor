import { ApiError } from '@/api/client'

export function errorMessage(err: unknown) {
  if (err instanceof ApiError) return err.message
  return 'Tidak dapat terhubung ke server. Periksa koneksi Anda.'
}

export function isStatus(err: unknown, status: number) {
  return err instanceof ApiError && err.status === status
}
