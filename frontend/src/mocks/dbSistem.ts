import { geser, hariIni, pengingatDari, statusPeriode, type Periode, type RiwayatBackup } from '@/features/sistem/types'

/** Periode disimpan tanpa kolom turunan (status dan pengingat dihitung saat dibaca). */
export interface PeriodeRow extends Pick<Periode, 'id' | 'nama' | 'tanggalMulai' | 'tenggat' | 'dibuatOleh'> {}

const hari = hariIni()

export const periode: PeriodeRow[] = [
  { id: 1, nama: 'Triwulan II 2026', tanggalMulai: geser(hari, -120), tenggat: geser(hari, -30), dibuatOleh: 'Lukman Hakim' },
  { id: 2, nama: 'Triwulan III 2026', tanggalMulai: geser(hari, -27), tenggat: geser(hari, 5), dibuatOleh: 'Lukman Hakim' },
  { id: 3, nama: 'Triwulan IV 2026', tanggalMulai: geser(hari, 20), tenggat: geser(hari, 80), dibuatOleh: 'Lukman Hakim' },
]

let periodeSeq = periode.length
export const nextPeriodeId = () => ++periodeSeq

export function kePeriode(row: PeriodeRow): Periode {
  return { ...row, status: statusPeriode(row), pengingat: pengingatDari(row.tenggat) }
}

export const RETENSI_BACKUP = 7
export const JADWAL_BACKUP = 'Setiap hari pukul 02.00 WIB'

const pukul2 = (hariLalu: number) => {
  const d = new Date()
  d.setDate(d.getDate() - hariLalu)
  d.setHours(2, 0, 0, 0)
  return d.toISOString()
}

// Tujuh backup otomatis terakhir; satu gagal untuk memperlihatkan penanganan kegagalan.
export const backup: RiwayatBackup[] = [
  { id: 1, tipe: 'otomatis', status: 'berhasil', ukuranMb: 812.4, oleh: null, waktu: pukul2(7), pesanGagal: null },
  { id: 2, tipe: 'otomatis', status: 'berhasil', ukuranMb: 815.1, oleh: null, waktu: pukul2(6), pesanGagal: null },
  { id: 3, tipe: 'otomatis', status: 'gagal', ukuranMb: null, oleh: null, waktu: pukul2(5), pesanGagal: 'Ruang penyimpanan tidak mencukupi.' },
  { id: 4, tipe: 'otomatis', status: 'berhasil', ukuranMb: 821.9, oleh: null, waktu: pukul2(4), pesanGagal: null },
  { id: 5, tipe: 'otomatis', status: 'berhasil', ukuranMb: 824.0, oleh: null, waktu: pukul2(3), pesanGagal: null },
  { id: 6, tipe: 'manual', status: 'berhasil', ukuranMb: 826.3, oleh: 'Lukman Hakim', waktu: new Date(Date.now() - 2.5 * 86_400_000).toISOString(), pesanGagal: null },
  { id: 7, tipe: 'otomatis', status: 'berhasil', ukuranMb: 829.8, oleh: null, waktu: new Date(Date.now() - 8 * 3_600_000).toISOString(), pesanGagal: null },
]

let backupSeq = backup.length
export const nextBackupId = () => ++backupSeq

/** Simpan hanya N backup terakhir; yang lebih lama dihapus (Revisi 5.14). */
export function pangkasBackup() {
  backup.sort((a, b) => b.waktu.localeCompare(a.waktu))
  backup.length = Math.min(backup.length, RETENSI_BACKUP)
}
