import { delay, http, HttpResponse } from 'msw'
import type { ArtikelDetail, Bantuan, JenisArtikel } from '@/features/konten/types'
import { notFound } from '../http'

const PER_PAGE = 6
const hariLalu = (h: number) => new Date(Date.now() - h * 86_400_000).toISOString()
const P = 'Diskominfo Kota Bogor'

// Hanya artikel berstatus terbit yang ada di sini; draft dikelola Super Admin dan tidak pernah dikirim ke publik.
export const artikel: ArtikelDetail[] = [
  { id: 1, jenis: 'berita', judul: 'Kota Bogor Perkuat Integrasi Layanan Digital Antar-OPD', ringkasan: 'Pemerintah Kota Bogor mempercepat integrasi layanan lewat portal SPBE terpadu.', penulis: P, tanggal: hariLalu(2), views: 412, konten: 'Pemerintah Kota Bogor mempercepat integrasi layanan digital antar perangkat daerah melalui portal SPBE terpadu.\n\nLangkah ini diharapkan mengurangi duplikasi aplikasi dan mempermudah pertukaran data antar-OPD.' },
  { id: 2, jenis: 'berita', judul: 'Pelatihan Arsitektur SPBE Diikuti 40 Admin OPD', ringkasan: 'Pelatihan penyusunan Referensi Arsitektur Aplikasi digelar dua hari.', penulis: P, tanggal: hariLalu(9), views: 268, konten: 'Sebanyak 40 admin OPD mengikuti pelatihan penyusunan Referensi Arsitektur Aplikasi (RAA).\n\nPeserta berlatih mengklasifikasikan aplikasi dan mengajukan data untuk divalidasi.' },
  { id: 3, jenis: 'berita', judul: 'Batas Waktu Pembaruan Data Aplikasi Triwulan Berjalan', ringkasan: 'Admin OPD diminta melengkapi data sebelum tenggat.', penulis: P, tanggal: hariLalu(14), views: 190, konten: 'Admin OPD diingatkan melengkapi dan mengajukan validasi data aplikasi sebelum tenggat periode berjalan.\n\nPengingat otomatis dikirim pada H-7, H-3, dan H-1.' },
  { id: 4, jenis: 'artikel', judul: 'Mengenal Referensi Arsitektur Aplikasi (RAA)', ringkasan: 'Penjelasan singkat RAA dan manfaatnya bagi perencanaan aplikasi pemerintah.', penulis: 'Tim Arsitektur SPBE', tanggal: hariLalu(20), views: 530, konten: 'RAA adalah acuan klasifikasi aplikasi pemerintah agar selaras dengan arsitektur SPBE.\n\nAplikasi yang klasifikasinya sesuai dianggap patuh; yang belum perlu disesuaikan.' },
  { id: 5, jenis: 'artikel', judul: 'Praktik Baik Backup Data Aplikasi Pemerintah', ringkasan: 'Backup harian dengan retensi tujuh hari dan uji pemulihan berkala.', penulis: 'Tim Keamanan Informasi', tanggal: hariLalu(33), views: 345, konten: 'Backup harian mencakup basis data dan berkas unggahan, disimpan di lokasi aman.\n\nSimpan tujuh backup terakhir dan uji pemulihan secara berkala.' },
  { id: 6, jenis: 'artikel', judul: 'Panduan Menulis Thread Forum yang Efektif', ringkasan: 'Cara merumuskan pertanyaan agar cepat dijawab komunitas.', penulis: 'Moderator Forum', tanggal: hariLalu(41), views: 121, konten: 'Tulis judul yang spesifik, jelaskan konteks, dan cantumkan langkah yang sudah dicoba.\n\nHindari membagikan data pribadi atau kredensial.' },
]

export const bantuan: Bantuan = {
  faq: [
    { id: 1, pertanyaan: 'Bagaimana cara mendapatkan akun?', jawaban: 'Akun dibuat lewat undangan oleh Super Admin. Anda akan menerima email untuk mengatur kata sandi.' },
    { id: 2, pertanyaan: 'Saya lupa kata sandi, apa yang harus dilakukan?', jawaban: 'Gunakan fitur lupa kata sandi di halaman masuk SSO. Kata sandi tidak dikelola di portal ini.' },
    { id: 3, pertanyaan: 'Siapa yang dapat mengunduh SOP?', jawaban: 'SOP hanya untuk pengguna internal yang sudah masuk.' },
    { id: 4, pertanyaan: 'Berapa ukuran maksimal berkas unggahan?', jawaban: 'Maksimal 10 MB per berkas, dengan tipe PDF, DOCX, atau XLSX.' },
    { id: 5, pertanyaan: 'Mengapa sesi saya berakhir sendiri?', jawaban: 'Demi keamanan, sesi berakhir otomatis setelah 15 menit tanpa aktivitas.' },
  ],
  panduan: [
    { id: 1, judul: 'Memulai', isi: 'Masuk dengan akun SSO, lalu buka Beranda untuk melihat ringkasan sesuai peran Anda.' },
    { id: 2, judul: 'Mencari dokumen', isi: 'Gunakan menu Pencarian atau halaman Dokumen. Filter jenis membantu mempersempit hasil.' },
    { id: 3, judul: 'Berdiskusi di forum', isi: 'Buat thread pada kategori yang sesuai, balas, nilai balasan bermanfaat, dan laporkan konten yang tidak pantas.' },
  ],
  video: [
    { id: 1, judul: 'Pengenalan Portal SPBE', url: 'https://www.youtube.com/' },
    { id: 2, judul: 'Mengajukan Validasi Data Aplikasi', url: 'https://www.youtube.com/' },
  ],
}

const ringkas = ({ konten: _k, ...a }: ArtikelDetail) => a

export const kontenHandlers = [
  http.get('/api/artikel', async ({ request }) => {
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const jenis = url.searchParams.get('jenis') as JenisArtikel | null
    await delay(250)
    const cocok = artikel.filter((a) => !jenis || jenis === ('semua' as string) || a.jenis === jenis).sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    return HttpResponse.json({
      items: cocok.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(ringkas),
      page,
      totalPages: Math.max(1, Math.ceil(cocok.length / PER_PAGE)),
      total: cocok.length,
    })
  }),

  http.get('/api/artikel/:id', async ({ params }) => {
    await delay(200)
    const a = artikel.find((x) => x.id === Number(params.id))
    if (!a) return notFound('Artikel tidak ditemukan.')
    a.views += 1
    return HttpResponse.json(a)
  }),

  http.get('/api/bantuan', async () => {
    await delay(200)
    return HttpResponse.json(bantuan)
  }),
]
