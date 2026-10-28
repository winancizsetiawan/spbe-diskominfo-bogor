import { BadgeCheck, KeyRound, Pencil } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { can, type Permission } from '@/auth/permissions'
import type { User } from '@/auth/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { ProfilSaya } from '../types'
import { TeleponDialog } from './TeleponDialog'

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
        <h2 className="font-semibold text-slate-900">Keamanan akun</h2>
        <p className="mt-1 text-sm text-slate-500">
          Kata sandi dikelola di SSO Pemkot Bogor. Portal tidak menyimpan kata sandi Anda.
        </p>
        {URL_AKUN_SSO ? (
          <a
            href={URL_AKUN_SSO}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <KeyRound className="size-4" aria-hidden /> Ubah kata sandi di SSO
          </a>
        ) : (
          <>
            <Button variant="secondary" className="mt-3" disabled aria-describedby="sso-belum">
              <KeyRound className="size-4" aria-hidden /> Ubah kata sandi di SSO
            </Button>
            <p id="sso-belum" className="mt-2 text-xs text-slate-500">
              Tersedia setelah portal terhubung ke SSO Pemkot Bogor (mode demo aktif).
            </p>
          </>
        )}
      </Card>

      <TeleponDialog open={ubahTelepon} noTelepon={profil.noTelepon} onClose={() => setUbahTelepon(false)} />
    </div>
  )
}
