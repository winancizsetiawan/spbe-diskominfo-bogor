import { authHandlers } from './auth'
import { berandaHandlers } from './beranda'
import { cariHandlers } from './cari'
import { dasborHandlers } from './dasbor'
import { dokumenHandlers } from './dokumen'
import { flowchartHandlers } from './flowchart'
import { forumHandlers } from './forum'
import { kontenHandlers } from './konten'
import { kritikHandlers } from './kritik'
import { pembelajaranHandlers } from './pembelajaran'
import { katalogHandlers } from './katalog'
import { moderasiHandlers } from './moderasi'
import { notifikasiHandlers } from './notifikasi'
import { penggunaHandlers } from './pengguna'
import { profilHandlers } from './profil'
import { repositoriHandlers } from './repositori'
import { sistemHandlers } from './sistem'
import { validasiHandlers } from './validasi'

export const handlers = [
  ...authHandlers,
  ...forumHandlers,
  ...katalogHandlers,
  ...validasiHandlers,
  ...dokumenHandlers,
  ...repositoriHandlers,
  ...moderasiHandlers,
  ...notifikasiHandlers,
  ...profilHandlers,
  ...penggunaHandlers,
  ...flowchartHandlers,
  ...berandaHandlers,
  ...dasborHandlers,
  ...sistemHandlers,
  ...cariHandlers,
  ...kontenHandlers,
  ...kritikHandlers,
  ...pembelajaranHandlers,
]
