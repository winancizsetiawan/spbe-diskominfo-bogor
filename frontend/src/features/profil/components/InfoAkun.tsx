import { BadgeCheck, Clock, KeyRound, Pencil, ShieldCheck, ShieldOff } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ApiError } from '@/api/client'
import { can, type Permission } from '@/auth/permissions'
import type { User } from '@/auth/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/toast'
import { TwoFAModal } from '@/features/auth/TwoFAModal'
import { formatTanggal } from '@/lib/format'
import { useAktifkan2FA, useMulaiSetup2FA, useNonaktifkan2FA, useSimulasiKedaluwarsaSandi } from '../api'
import type { ProfilSaya } from '../types'
import { DataPegawaiDialog } from './DataPegawaiDialog'
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
  { perm: 'audit:lihat', label: 'Lihat catatan aktivitas' },
  { perm: 'backup:kelola', label: 'Kelola cadangan data' },
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
  const [ubahPegawai, setUbahPegawai] = useState(false)
  const [ubahTelepon, setUbahTelepon] = useState(false)
  const [ubahSandi, setUbahSandi] = useState(false)
  const [setup2FA, setSetup2FA] = useState<{ secret: string; uri: string } | null>(null)
  const [galat2FA, setGalat2FA] = useState<string | null>(null)
  const simulasi = useSimulasiKedaluwarsaSandi()
  const mulai2FA = useMulaiSetup2FA()
  const aktifkan2FA = useAktifkan2FA()
  const nonaktifkan2FA = useNonaktifkan2FA()
  const twoFaAktif = user.twoFaAktif ?? true

  const sisaHari = user.sisaHariSandi ?? 365
  const wajibGanti = user.wajibGantiSandi ?? false

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Data pegawai</h2>
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              <BadgeCheck className="size-4 text-emerald-600" aria-hidden /> Terverifikasi {user.sumberAkun === 'tnd' ? 'TND' : 'SSO'}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setUbahPegawai(true)}>
            <Pencil className="size-4" aria-hidden /> Ubah
          </Button>
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
        <p className="mt-1 text-sm text-slate-500">Ditentukan oleh peran Anda dan diatur Super Admin.</p>
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Hak akses">
          {HAK_AKSES.filter((h) => can(user, h.perm)).map((h) => (
            <li key={h.perm}>
              <Badge tone="brand">{h.label}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      {user.sumberAkun === 'tnd' ? (
        <Card>
          <h2 className="font-semibold text-slate-900">Keamanan akun</h2>
          <p className="mt-1 text-sm text-slate-600">
            Anda masuk dengan NIP dan kata sandi akun TND Pemkot Bogor. Kata sandi tidak disimpan di portal Arsitektur Pemerintah Digital; untuk menggantinya,
            gunakan aplikasi TND.
          </p>
        </Card>
      ) : (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Keamanan akun & Kebijakan Kata Sandi Tahunan</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sesuai kebijakan keamanan Arsitektur Pemerintah Digital, kata sandi wajib diperbarui setiap 1 tahun (365 hari).
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
                      toast.error('Gagal: fitur simulasi belum tersedia. Pastikan server portal sudah dimulai ulang.'),
                  })
                }
              >
                <Clock className="size-4" aria-hidden /> Simulasikan Kedaluwarsa (&gt; 1 Tahun)
              </Button>
            </>
          )}
        </div>
      </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Autentikasi Dua Faktor (2FA)</h2>
            <p className="mt-1 text-sm text-slate-500">
              Keamanan tambahan saat login menggunakan kode 6 digit dari Google Authenticator atau Microsoft Authenticator.
            </p>
          </div>
          <Badge tone={twoFaAktif ? 'success' : 'neutral'}>{twoFaAktif ? 'Aktif' : 'Nonaktif'}</Badge>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {twoFaAktif ? (
            <Button
              variant="secondary"
              disabled={nonaktifkan2FA.isPending}
              onClick={() =>
                nonaktifkan2FA.mutate(undefined, {
                  onSuccess: () => toast.success('Autentikasi Dua Faktor (2FA) telah dinonaktifkan.'),
                  onError: () => toast.error('Gagal menonaktifkan 2FA.'),
                })
              }
            >
              <ShieldOff className="size-4" aria-hidden />
              {nonaktifkan2FA.isPending ? 'Memproses...' : 'Nonaktifkan 2FA'}
            </Button>
          ) : (
            <Button
              disabled={mulai2FA.isPending}
              onClick={() => {
                setGalat2FA(null)
                mulai2FA.mutate(undefined, {
                  onSuccess: (res) => setSetup2FA(res),
                  onError: () => toast.error('Gagal menyiapkan QR Code 2FA.'),
                })
              }}
            >
              <ShieldCheck className="size-4" aria-hidden />
              {mulai2FA.isPending ? 'Menyiapkan...' : 'Aktifkan 2FA'}
            </Button>
          )}
        </div>
      </Card>

      <DataPegawaiDialog open={ubahPegawai} profil={profil} onClose={() => setUbahPegawai(false)} />
      <TeleponDialog open={ubahTelepon} noTelepon={profil.noTelepon} onClose={() => setUbahTelepon(false)} />
      <UbahSandiDialog open={ubahSandi} onClose={() => setUbahSandi(false)} />
      <TwoFAModal
        open={setup2FA !== null}
        butuhSetup={true}
        uri={setup2FA?.uri}
        secret={setup2FA?.secret}
        memuat={aktifkan2FA.isPending}
        galat={galat2FA}
        onBatal={() => {
          setSetup2FA(null)
          setGalat2FA(null)
        }}
        onVerifikasi={(kode) => {
          setGalat2FA(null)
          aktifkan2FA.mutate(kode, {
            onSuccess: () => {
              setSetup2FA(null)
              toast.success('Autentikasi Dua Faktor (2FA) berhasil diaktifkan.')
            },
            onError: (err) => {
              setGalat2FA(err instanceof ApiError ? err.fieldErrors?.kode ?? err.message : 'Kode 2FA tidak valid.')
            },
          })
        }}
      />
    </div>
  )
}
