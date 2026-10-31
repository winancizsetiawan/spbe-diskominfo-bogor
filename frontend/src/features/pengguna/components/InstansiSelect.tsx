import type { SelectHTMLAttributes } from 'react'
import type { Role } from '@/auth/types'
import { inputClass } from '@/components/ui/Field'
import { instansiBolehUntuk, type InstansiPengguna } from '../types'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  instansi: InstansiPengguna[] | undefined
  /** Role terpilih; Admin OPD hanya boleh memilih instansi berjenis OPD. */
  role: Role
}

/** Pilihan instansi yang disaring menurut role. Dipakai form undang dan form ubah. */
export const InstansiSelect = ({ instansi, role, ...props }: Props) => (
  <select className={inputClass} disabled={!instansi} {...props}>
    <option value="">Pilih instansi…</option>
    {instansi
      ?.filter((i) => instansiBolehUntuk(role, i))
      .map((i) => (
        <option key={i.id} value={i.id}>
          {i.nama} ({i.jenis})
        </option>
      ))}
  </select>
)
