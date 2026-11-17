import { BadgeCheck, Clock, KeyRound, Pencil } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { can, type Permission } from '@/auth/permissions'
import type { User } from '@/auth/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/toast'
import { formatTanggal } from '@/lib/format'
import { useSimulasiKedaluwarsaSandi } from '../api'
import type { ProfilSaya } from '../types'
import { TeleponDialog } from './TeleponDialog'
import { UbahSandiDialog } from './UbahSandiDialog'

/** Hak akses ditampilkan sebagai label turunan dari role, bukan wewenang tambahan (Design D2). */
const HAK_AKSES: { perm: Permission; label: string }[] = [
  { perm: 'konten:internal', label: 'Dokumen, SOP, pembelajaran, dan forum' },
  { perm: 'aplikasi:kelola', label: 'Kelola data aplikasi dan RAA' },
  { perm: 'validasi:ajukan', label: 'Ajukan validasi' },
  { perm: 'dasbor:instansi', label: 'Dasbor instansi' },
  { perm: 'validasi:putuskan', label: 'Putuskan validasi' },
  { perm: 'repositori:kelola', label: 'Kelola repositori' },
  { perm: 'moderasi', label: 'Moderasi forum' },
  { perm: 'pengguna:kelola', label: 'Kelola pengguna' },
  { perm: 'periode:kelola', label: 'Atur periode pembaruan' },
  { perm: 'audit:lihat', label: 'Lihat audit trail' },
  { perm: 'backup:kelola', label: 'Kelola backup' },
  { perm: 'dasbor:data', label: 'Perbarui data dasbor' },
]

// Halaman akun Keycloak untuk ubah kata sandi; kosong selama SSO belum terhubung (mode demo).
const URL_AKUN_SSO =
  import.meta.env.VITE_KEYCLOAK_URL && import.meta.env.VITE_KEYCLOAK_REALM
    ? `${import.meta.env.VITE_KEYCLOAK_URL.replace(/\/$/, '')}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}/account`
    : null

function Baris({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  )
}

export function InfoAkun({ profil, user }: { profil: ProfilSaya; user: User }) {
  const [ubahTelepon, setUbahTelepon] = useState(false)
  const [ubahSandi, setUbahSandi] = useState(false)
  const simulasi = useSimulasiKedaluwarsaSandi()

  const sisaHari = user.sisaHariSandi ?? 365
  const wajibGanti = user.wajibGantiSandi ?? false

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Data pegawai</h2>
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              <BadgeCheck className="size-4 text-emerald-600" aria-hidden /> Terverifikasi SSO · hanya baca
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Baris label="Nama lengkap">{profil.nama}</Baris>
          <Baris label="NIP">
            <span className="font-mono">{profil.nip}</span>
          </Baris>
          <Baris label="Instansi">{profil.instansi.nama}</Baris>
          <Baris label="Satuan kerja induk">{profil.satkerInduk}</Baris>
          <Baris label="Jabatan">{profil.jabatan}</Baris>
          <Baris label="Golongan">{profil.golongan}</Baris>
          <Baris label="Email kedinasan">{profil.email}</Baris>
        </dl>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Kontak</h2>
          <Button variant="secondary" onClick={() => setUbahTelepon(true)}>
            <Pencil className="size-4" aria-hidden /> Ubah
          </Button>
        </div>
        <dl>
          <Baris label="Nomor telepon / WhatsApp">
            {profil.noTelepon ?? <span className="text-slate-500 italic">Belum diisi</span>}
          </Baris>
        </dl>
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-900">Hak akses</h2>
        <p className="mt-1 text-sm text-slate-500">Ditentukan oleh role Anda dan diatur Super Admin.</p>
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Hak akses">
          {HAK_AKSES.filter((h) => can(user, h.perm)).map((h) => (
            <li key={h.perm}>
              <Badge tone="brand">{h.label}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Keamanan akun & Kebijakan Kata Sandi Tahunan</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sesuai kebijakan keamanan SPBE, kata sandi wajib diperbarui setiap 1 tahun (365 hari).
            </p>
          </div>
          <Badge tone={wajibGanti ? 'danger' : sisaHari <= 14 ? 'warning' : 'success'}>
            {wajibGanti ? 'Kedaluwarsa · Wajib Diganti' : `Aktif · Sisa ${sisaHari} hari`}
          </Badge>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Baris label="Terakhir diperbarui">
            {user.sandiDiubahPada ? formatTanggal(user.sandiDiubahPada) : 'Baru diaktifkan'}
          </Baris>
          <Baris label="Masa berlaku">
            {wajibGanti ? 'Telah melewati batas 365 hari' : `${sisaHari} hari lagi sebelum wajib ganti`}
          </Baris>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {URL_AKUN_SSO ? (
            <a
              href={URL_AKUN_SSO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <KeyRound className="size-4" aria-hidden /> Ubah kata sandi di SSO
            </a>
          ) : (
            <>
              <Button onClick={() => setUbahSandi(true)}>
                <KeyRound className="size-4" aria-hidden /> Ubah Kata Sandi
              </Button>
              <Button
                variant="secondary"
                disabled={simulasi.isPending}
                onClick={() =>
                  simulasi.mutate(true, {
                    onSuccess: () => toast.info('Simulasi diaktifkan: usia kata sandi diset > 365 hari.'),
                    onError: () =>
                      toast.error('Gagal: endpoint simulasi belum tersedia. Pastikan backend sudah di-restart dengan kode terbaru.'),
                  })
                }
              >
                <Clock className="size-4" aria-hidden /> Simulasikan Kedaluwarsa (&gt; 1 Tahun)
              </Button>
            </>
          )}
        </div>
      </Card>

      <TeleponDialog open={ubahTelepon} noTelepon={profil.noTelepon} onClose={() => setUbahTelepon(false)} />
      <UbahSandiDialog open={ubahSandi} onClose={() => setUbahSandi(false)} />
    </div>
  )
}
