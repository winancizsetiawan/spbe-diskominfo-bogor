export type Role = 'asn' | 'akademisi' | 'admin_opd' | 'super_admin'

export type StatusAkun = 'diundang' | 'aktif' | 'nonaktif'

export interface User {
  id: number
  nama: string
  email: string
  role: Role
  statusAkun: StatusAkun
  instansi: { id: number; nama: string }
}

export const ROLE_LABEL: Record<Role, string> = {
  asn: 'ASN',
  akademisi: 'Akademisi',
  admin_opd: 'Admin OPD',
  super_admin: 'Super Admin',
}
