"""Uji alur yang mengubah data, per role, lewat UI (login mode demo).

Pemakaian: python frontend/scripts/uji_alur.py <folder-hasil>
FE di http://localhost:5173 (VITE_API_MOCK=false agar tersimpan di BE). Data uji diberi penanda "[UJI]".
Cadangkan database dulu bila ingin mengembalikan isinya setelah uji.
"""
import json, re, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
OUT = Path(sys.argv[1]); (OUT / 'shots').mkdir(parents=True, exist_ok=True)
TAG = time.strftime('%H%M%S')
NAMA_APL = f'[UJI] Aplikasi Uji {TAG}'
JUDUL_THREAD = f'[UJI] Thread uji otomatis {TAG}'
EMAIL_BARU = f'uji.{TAG}@example.go.id'
PERIODE = f'[UJI] Periode {TAG}'
JUDUL_DOK = f'[UJI] Dokumen uji {TAG}'

hasil = []


class Sesi:
    def __init__(self, browser, role):
        self.role = role
        self.ctx = browser.new_context(viewport={'width': 1366, 'height': 900})
        if role:
            self.ctx.add_init_script(f"sessionStorage.setItem('spbe.demoRole','{role}')")
        self.page = self.ctx.new_page()
        self.mut = []
        self.page.on('response', self._catat)

    def _catat(self, r):
        if '/api/' in r.url and r.request.method != 'GET':
            self.mut.append(f"{r.request.method} {re.sub(r'[?].*', '', r.url.split('/api', 1)[1])} → {r.status}")

    def buka(self, path):
        self.page.goto(BASE + path, wait_until='networkidle'); self.page.wait_for_timeout(500)

    def toast(self):
        try:
            self.page.locator('[role=status]').first.wait_for(timeout=4000)
        except Exception:
            pass
        return ' | '.join(t.strip() for t in self.page.locator('[role=status]').all_inner_texts() if t.strip())

    def dialog(self):
        return self.page.locator('dialog[open]').first

    def cari(self, sel, teks):
        self.page.fill(sel, teks); self.page.press(sel, 'Enter')
        self.page.wait_for_load_state('networkidle'); self.page.wait_for_timeout(700)

    def tutup(self):
        self.ctx.close()


def uji(role, nama, sesi, fn):
    """Jalankan satu alur; fn mengembalikan (ok, keterangan)."""
    sesi.mut.clear()
    try:
        ok, ket = fn(sesi)
    except Exception as e:
        ok, ket = False, 'galat skrip/UI: ' + str(e).splitlines()[0][:160]
    api = ', '.join(sesi.mut)
    gagal_api = any(re.search(r'→ [45]\d\d$', m) for m in sesi.mut)
    if gagal_api:
        ok = False
    if not ok:
        sesi.page.screenshot(path=str(OUT / 'shots' / f"{role}_{re.sub(r'[^a-z0-9]+', '_', nama.lower())[:40]}.png"), full_page=True)
    hasil.append({'role': role, 'alur': nama, 'ok': ok, 'ket': ket, 'api': api})
    print(('  ✓ ' if ok else '  x ') + f'[{role}] {nama} :: {ket} :: {api}')


# ---------------- Publik ----------------
def kritik(s):
    s.buka('/kritik-saran')
    s.page.fill('#kritik-nama', 'Penguji Otomatis')
    s.page.fill('#kritik-email', 'penguji@example.com')
    s.page.fill('#kritik-pesan', f'[UJI] Kritik dan saran dari pengujian otomatis {TAG}. Mohon abaikan pesan ini.')
    s.page.get_by_role('button', name='Kirim').click()
    t = s.toast(); s.page.wait_for_timeout(500)
    return any('/kritik → 2' in m for m in s.mut), t or s.page.locator('main').inner_text()[:120]


# ---------------- ASN ----------------
def buat_thread(s):
    s.buka('/forum/baru')
    s.page.select_option('#idKategori', '1')
    s.page.fill('#judul', JUDUL_THREAD)
    s.page.fill('#konten', f'Isi thread dari pengujian otomatis {TAG}. Thread ini dibuat untuk menguji alur pembuatan diskusi.')
    s.page.get_by_role('button', name='Terbitkan thread').click()
    s.page.wait_for_url(re.compile(r'/forum/\d+$'), timeout=8000); s.page.wait_for_load_state('networkidle')
    s.page.locator('h1', has_text=JUDUL_THREAD).first.wait_for(timeout=8000)
    h1 = s.page.locator('h1').first.inner_text()
    global URL_THREAD
    URL_THREAD = s.page.url.replace(BASE, '')
    return h1.strip() == JUDUL_THREAD, f'{s.toast()} → {URL_THREAD} — judul: {h1}'


def balas_thread(s):
    s.buka(URL_THREAD)
    isi = f'[UJI] Balasan otomatis {TAG} untuk menguji alur balasan.'
    s.page.fill('#balasan', isi)
    s.page.get_by_role('button', name='Kirim balasan').click()
    t = s.toast(); s.page.wait_for_timeout(600)
    s.buka(URL_THREAD)
    return isi in s.page.locator('main').inner_text(), f'{t}; balasan tampil setelah dimuat ulang'


def lapor_thread(s):
    s.buka(URL_THREAD)
    s.page.get_by_role('button', name='Laporkan thread').click()
    s.dialog().locator('#alasan-laporan').fill(f'[UJI] Laporan otomatis {TAG}, abaikan.')
    s.dialog().get_by_role('button', name='Kirim laporan').click()
    t = s.toast()
    return any('/forum/laporan → 2' in m for m in s.mut), t


def ubah_telepon(s):
    s.buka('/profil')
    nomor = '0812' + TAG + '99'
    s.page.locator('main').get_by_role('button', name='Ubah', exact=True).first.click()
    s.dialog().locator('#telepon').fill(nomor)
    s.dialog().get_by_role('button', name='Simpan').click()
    t = s.toast(); s.buka('/profil')
    return nomor in s.page.locator('main').inner_text(), f'{t}; nomor {nomor} tampil setelah dimuat ulang'


def ubah_preferensi(s):
    s.buka('/profil')
    s.page.get_by_role('tab', name='Preferensi').click(); s.page.wait_for_timeout(500)
    cb = s.page.get_by_role('switch', name='Notifikasi email')
    awal = cb.is_checked()
    cb.click(force=True); s.page.wait_for_timeout(300)
    simpan = s.page.locator('main').get_by_role('button', name=re.compile('Simpan'))
    if simpan.count():
        simpan.first.click()
    t = s.toast()
    s.buka('/profil'); s.page.get_by_role('tab', name='Preferensi').click(); s.page.wait_for_timeout(500)
    akhir = s.page.get_by_role('switch', name='Notifikasi email').is_checked()
    return any('/profil/preferensi → 2' in m for m in s.mut) and akhir != awal, f'{t}; notifikasi email {awal} → {akhir} (tersimpan setelah dimuat ulang)'


def materi_selesai(s):
    s.buka('/pembelajaran/1')
    btn = s.page.get_by_role('button', name=re.compile('^Tandai selesai')).first
    nama = btn.inner_text().strip()
    btn.click(); t = s.toast(); s.page.wait_for_timeout(500)
    return any('/selesai → 2' in m for m in s.mut), f'{nama}; {t}'


def notif_dibaca(s):
    s.buka('/notifikasi')
    s.page.get_by_role('button', name='Tandai semua dibaca').click()
    t = s.toast(); s.page.wait_for_timeout(500); s.buka('/notifikasi')
    sisa = s.page.locator('main').inner_text()
    return 'belum dibaca' not in sisa, f'{t}; tidak ada lagi "belum dibaca"'


# ---------------- Akademisi ----------------
def nilai_balasan(s):
    s.buka(URL_THREAD)
    btn = s.page.locator('main button', has_text=re.compile(r'^\s*\d+\s*$')).first
    awal = btn.inner_text().strip()
    btn.click(); s.page.wait_for_timeout(800)
    akhir = s.page.locator('main button', has_text=re.compile(r'^\s*\d+\s*$')).first.inner_text().strip()
    return any('/nilai → 2' in m for m in s.mut), f'jumlah nilai {awal} → {akhir}'


# ---------------- Admin OPD ----------------
def tambah_aplikasi(s):
    s.buka('/katalog/aplikasi/baru')
    s.page.fill('#nama', NAMA_APL)
    s.page.fill('#deskripsi', f'Aplikasi dari pengujian otomatis {TAG}.')
    s.page.select_option('#kategori', 'Lainnya')
    s.page.select_option('#raa1', index=1); s.page.wait_for_timeout(300)
    if s.page.locator('#raa2 option').count() > 1:
        s.page.select_option('#raa2', index=1); s.page.wait_for_timeout(300)
    if s.page.locator('#raa3 option').count() > 1:
        s.page.select_option('#raa3', index=1)
    s.page.get_by_role('button', name='Simpan sebagai Draft').click()
    t = s.toast(); s.page.wait_for_timeout(800)
    s.buka('/katalog/aplikasi')
    s.cari('#cari-aplikasi', TAG)
    return NAMA_APL in s.page.locator('main').inner_text(), f'{t}; muncul di daftar Data Aplikasi'


def ubah_aplikasi(s):
    s.buka('/katalog/aplikasi')
    s.cari('#cari-aplikasi', TAG)
    s.page.locator('main a[href$="/ubah"]').first.click(); s.page.wait_for_load_state('networkidle'); s.page.wait_for_timeout(500)
    baru = f'Deskripsi diubah oleh pengujian otomatis {TAG}.'
    s.page.fill('#deskripsi', baru)
    s.page.get_by_role('button', name=re.compile('Simpan')).first.click()
    t = s.toast(); s.page.wait_for_timeout(500)
    return any(re.search(r'PUT /aplikasi/\d+ → 2', m) for m in s.mut), t


def ajukan_validasi(s):
    s.buka('/katalog/aplikasi')
    s.cari('#cari-aplikasi', TAG)
    s.page.get_by_role('button', name=f'Ajukan validasi {NAMA_APL}').click()
    s.dialog().get_by_role('button', name='Ajukan', exact=True).click()
    t = s.toast(); s.page.wait_for_timeout(800)
    s.cari('#cari-aplikasi', TAG)
    return any('POST /validasi → 2' in m for m in s.mut), f'{t}; baris: ' + s.page.locator('main tbody tr').first.inner_text().replace('\n', ' · ')[:120]


def buat_flowchart(s):
    s.buka('/katalog/flowchart/baru')
    s.page.fill('#nama', f'[UJI] Proses uji {TAG}')
    s.page.select_option('#kategori', 'utama')
    s.page.select_option('#jenis', 'as_is')
    s.page.fill('#pic', 'Penguji Otomatis')
    s.page.fill('#deskripsi', f'Flowchart dari pengujian otomatis {TAG}.')
    cb = s.page.locator('main input[type=checkbox]')
    if cb.count():
        cb.first.check()
    s.page.get_by_role('button', name='Simpan sebagai Draft').click()
    t = s.toast(); s.page.wait_for_timeout(800)
    galat = ' | '.join(x.strip() for x in s.page.locator('main p.text-red-600, main [role=alert]').all_inner_texts() if x.strip())
    return any('POST /flowchart → 2' in m for m in s.mut), f'{t} {galat}'.strip() + f'; url {s.page.url.replace(BASE, "")}'


# ---------------- Super Admin ----------------
def putuskan_validasi(s):
    s.buka('/admin/validasi')
    s.cari('#cari-validasi', TAG)
    tautan = s.page.get_by_role('link', name=re.compile(f'pengajuan .*{TAG}'))
    if not tautan.count():
        return False, 'pengajuan aplikasi uji tidak ada di daftar Validasi'
    tautan.first.click(); s.page.wait_for_load_state('networkidle'); s.page.wait_for_timeout(500)
    radio = s.page.locator('main input[name=keputusan]')
    pilihan = [radio.nth(i).get_attribute('value') for i in range(radio.count())]
    s.page.locator('main input[name=keputusan][value=disetujui]').check() if 'disetujui' in pilihan else radio.first.check()
    s.page.fill('#catatan', f'[UJI] Disetujui oleh pengujian otomatis {TAG}.')
    s.page.get_by_role('button', name='Simpan keputusan').click()
    t = s.toast(); s.page.wait_for_timeout(500)
    return any('/keputusan → 2' in m for m in s.mut), f'pilihan {pilihan}; {t}'


def unggah_dokumen(s):
    berkas = OUT / 'dokumen_uji.pdf'
    berkas.write_bytes(b'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')
    s.buka('/admin/repositori/baru')
    s.page.locator('main input[type=file]').set_input_files(str(berkas))
    s.page.select_option('#jenis', 'pedoman'); s.page.wait_for_timeout(300)
    s.page.fill('#judul', JUDUL_DOK)
    s.page.fill('#deskripsi', f'Dokumen dari pengujian otomatis {TAG}.')
    s.page.fill('#versi', '1.0')
    s.page.locator('main input[name=visibilitas]').first.check()
    s.page.get_by_role('button', name='Unggah sebagai Draft').click()
    s.page.wait_for_timeout(2500); t = s.toast()
    s.buka('/admin/repositori'); s.cari('#cari-repositori', TAG)
    return JUDUL_DOK in s.page.locator('main').inner_text(), f'{t}; muncul di Repositori'


def ubah_status_dokumen(s):
    s.buka('/admin/repositori'); s.cari('#cari-repositori', TAG)
    s.page.locator('main').get_by_role('button', name=re.compile('Ubah status')).first.click()
    s.dialog().locator('input[name=status-baru][value=review]').check()
    s.dialog().get_by_role('button', name='Simpan').click()
    t = s.toast(); s.page.wait_for_timeout(800)
    s.cari('#cari-repositori', TAG)
    return any(re.search(r'PATCH /dokumen/\d+ → 2', m) for m in s.mut), f'{t}; baris: ' + s.page.locator('main tbody tr').first.inner_text().replace('\n', ' · ')[:120]


def moderasi(s):
    s.buka('/admin/moderasi'); s.cari('#cari-moderasi', TAG)
    teks = s.page.locator('main').inner_text()
    if JUDUL_THREAD not in teks:
        return False, 'laporan thread uji tidak muncul di Moderasi'
    s.page.locator('main').get_by_role('button', name='Abaikan laporan').first.click()
    d = s.page.locator('dialog[open]')
    if d.count():
        if d.first.locator('textarea').count():
            d.first.locator('textarea').fill(f'[UJI] Diabaikan oleh pengujian otomatis {TAG}.')
        d.first.get_by_role('button').last.click()
    t = s.toast(); s.page.wait_for_timeout(500)
    return any('/moderasi/tindakan → 2' in m for m in s.mut), f'laporan thread uji ditemukan lalu diabaikan; {t}'


def sembunyikan(s):
    s.buka('/admin/moderasi')
    s.page.get_by_role('button', name=re.compile('^Semua')).first.click(); s.page.wait_for_timeout(500)
    s.cari('#cari-moderasi', TAG)
    s.page.locator('main').get_by_role('button', name='Sembunyikan').first.click()
    s.dialog().locator('#alasan-moderasi').fill(f'[UJI] Disembunyikan oleh pengujian otomatis {TAG}.')
    s.dialog().get_by_role('button', name='Ya, sembunyikan').click()
    t = s.toast(); s.page.wait_for_timeout(500)
    return any('/moderasi/tindakan → 2' in m for m in s.mut), t


def undang_pengguna(s):
    s.buka('/admin/pengguna')
    s.page.get_by_role('button', name='Tambah Pengguna').click()
    d = s.dialog()
    d.locator('#nama').fill(f'Penguji {TAG}'); d.locator('#email').fill(EMAIL_BARU)
    d.locator('#role').select_option('asn'); d.locator('#idInstansi').select_option('1')
    d.get_by_role('button', name='Kirim undangan').click()
    t = s.toast(); s.page.wait_for_timeout(500)
    s.cari('#cari-pengguna', TAG)
    return EMAIL_BARU in s.page.locator('main').inner_text(), f'{t}; muncul di daftar'


def ubah_peran(s):
    s.buka('/admin/pengguna'); s.cari('#cari-pengguna', TAG)
    s.page.get_by_role('button', name=re.compile(f'^Ubah.*{TAG}')).first.click()
    d = s.dialog(); d.locator('#ubah-role').select_option('akademisi')
    d.get_by_role('button', name='Simpan').click()
    t = s.toast(); s.page.wait_for_timeout(800)
    s.cari('#cari-pengguna', TAG)
    baris = s.page.locator('main tbody tr').first.inner_text()
    return 'Akademisi' in baris, f'{t}; baris: ' + baris.replace('\n', ' · ')[:120]


def batalkan_undangan(s):
    s.buka('/admin/pengguna'); s.cari('#cari-pengguna', TAG)
    s.page.get_by_role('button', name=re.compile(f'^Ubah.*{TAG}')).first.click()  # aksi akun ada di dialog Ubah
    s.dialog().get_by_role('button', name=re.compile(f'^Batalkan undangan.*{TAG}')).click()
    s.dialog().get_by_role('button').last.click()
    t = s.toast(); s.page.wait_for_timeout(800)
    s.cari('#cari-pengguna', TAG)
    return any(re.search(r'PATCH /pengguna/\d+ → 2', m) for m in s.mut), f'{t}; ' + s.page.locator('main').inner_text()[-160:].replace('\n', ' ')


def hapus_pengguna(s):
    s.buka('/admin/pengguna'); s.cari('#cari-pengguna', TAG)
    s.page.get_by_role('button', name=re.compile(f'^Ubah.*{TAG}')).first.click()
    s.dialog().get_by_role('button', name=re.compile(f'^Hapus.*{TAG}')).click()
    s.dialog().get_by_role('button', name='Ya, hapus permanen').click()
    t = s.toast(); s.page.wait_for_timeout(800)
    s.cari('#cari-pengguna', TAG)
    hilang = EMAIL_BARU not in s.page.locator('main').inner_text()
    return hilang and any(re.search(r'DELETE /pengguna/\d+ → 204', m) for m in s.mut), f'{t}; tidak ada lagi di daftar: {hilang}'


def tolak_hapus_penulis_forum(s):
    s.buka('/admin/pengguna?q=Siti')
    s.page.get_by_role('button', name='Ubah Siti Rahma').click()
    s.dialog().get_by_role('button', name='Hapus Siti Rahma').click()
    s.dialog().get_by_role('button', name='Ya, hapus permanen').click()
    t = s.toast(); s.page.wait_for_timeout(800)
    s.mut[:] = [m for m in s.mut if '→ 409' not in m]  # penolakan 409 memang diharapkan
    s.buka('/admin/pengguna?q=Siti')
    masih = 'Siti Rahma' in s.page.locator('main tbody').inner_text()
    return masih and 'forum' in t, f'ditolak: {t}'


def nonaktif_aktif(s):
    s.buka('/admin/pengguna?q=Siti')  # daftar berhalaman: cari dulu
    s.page.get_by_role('button', name='Ubah Siti Rahma').click()  # aksi akun ada di dialog Ubah
    s.dialog().get_by_role('button', name='Nonaktifkan Siti Rahma').click()
    s.dialog().get_by_role('button', name='Ya, nonaktifkan').click()
    t1 = s.toast(); s.page.wait_for_timeout(800)
    # akun Akademisi sekarang nonaktif → coba masuk sebagai Akademisi
    ctx = s.ctx.browser.new_context(); ctx.add_init_script("sessionStorage.setItem('spbe.demoRole','akademisi')")
    pg = ctx.new_page(); pg.goto(BASE + '/beranda', wait_until='networkidle'); pg.wait_for_timeout(500)
    diblok = '/akun-tidak-aktif' in pg.url; url_blok = pg.url.replace(BASE, ''); ctx.close()
    s.page.get_by_role('button', name='Ubah Siti Rahma').click()
    s.dialog().get_by_role('button', name='Aktifkan Siti Rahma').click()
    s.dialog().get_by_role('button').last.click()
    s.page.wait_for_timeout(1000); s.buka('/admin/pengguna?q=Siti')
    baris = s.page.locator('main tbody tr', has_text='Siti Rahma').first.inner_text()
    t2 = 'status di daftar: ' + ('Nonaktif' if 'Nonaktif' in baris else 'Aktif')
    ok = 'Nonaktif' not in baris and diblok and sum(bool(re.search(r'PATCH /pengguna/\d+ → 2', m)) for m in s.mut) >= 2
    return ok, f'nonaktifkan: {t1}; Akademisi membuka /beranda → {url_blok}; aktifkan lagi: {t2}'


def periode(s):
    s.buka('/admin/periode')
    s.page.get_by_role('button', name='Tambah Periode').click()
    d = s.dialog(); d.locator('#periode-nama').fill(PERIODE)
    d.locator('#periode-mulai').fill('2027-04-01'); d.locator('#periode-tenggat').fill('2027-06-30')
    d.get_by_role('button', name='Simpan').click()
    t1 = s.toast(); s.page.wait_for_timeout(800); s.buka('/admin/periode')
    ada = PERIODE in s.page.locator('main').inner_text()
    # ubah lalu hapus periode uji
    s.page.get_by_role('button', name=f'Ubah {PERIODE}').click()
    d = s.dialog(); d.locator('#periode-tenggat').fill('2027-07-15'); d.get_by_role('button', name='Simpan').click()
    t2 = s.toast(); s.page.wait_for_timeout(800); s.buka('/admin/periode')
    s.page.get_by_role('button', name=f'Hapus {PERIODE}').click()
    s.dialog().get_by_role('button', name='Hapus').click()
    t3 = s.toast(); s.page.wait_for_timeout(800); s.buka('/admin/periode')
    hilang = PERIODE not in s.page.locator('main').inner_text()
    metode = {m.split()[0] for m in s.mut if '/periode' in m and '→ 2' in m}
    return ada and hilang and {'POST', 'PUT', 'DELETE'} <= metode, f'tambah: {t1}; ubah: {t2}; hapus: {t3}'


def periode_bentrok(s):
    s.buka('/admin/periode')
    s.page.get_by_role('button', name='Tambah Periode').click()
    d = s.dialog(); d.locator('#periode-nama').fill(PERIODE + ' bentrok')
    d.locator('#periode-mulai').fill('2027-01-01'); d.locator('#periode-tenggat').fill('2027-01-20')
    d.get_by_role('button', name='Simpan').click(); s.page.wait_for_timeout(1000)
    galat = ' | '.join(x.strip() for x in d.locator('p.text-red-600, [role=alert]').all_inner_texts() if x.strip()) or s.toast()
    ditolak = d.is_visible() and bool(galat)
    if d.is_visible():
        d.get_by_role('button', name='Batal').click()
    s.mut[:] = [m for m in s.mut if not m.startswith('POST /periode → 4')]  # penolakan 4xx memang diharapkan
    return ditolak, f'periode bertabrakan dengan Triwulan IV 2026 ditolak: {galat}'


def backup(s):
    s.buka('/admin/backup')
    s.page.get_by_role('button', name='Backup Sekarang').click()
    d = s.page.locator('dialog[open]')
    if d.count():
        d.first.get_by_role('button').last.click()
    t = s.toast(); s.page.wait_for_timeout(1500)
    return any('POST /backup → 2' in m for m in s.mut), t


def kritik_admin(s):
    s.buka('/admin/kritik')
    return TAG in s.page.locator('main').inner_text(), 'kritik dari pengunjung publik tampil di Kritik & Saran (admin)'


def cek_notifikasi_opd(s):
    s.buka('/notifikasi')
    teks = s.page.locator('main').inner_text()
    ada = NAMA_APL in teks or TAG in teks
    return ada, 'notifikasi keputusan validasi ' + ('diterima' if ada else 'tidak ada: BE tidak membuat notifikasi saat validasi diputuskan')


URL_THREAD = None
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    rencana = [
        ('publik', None, [('Kirim kritik & saran', kritik)]),
        ('asn', 'asn', [('Buat thread forum', buat_thread), ('Balas thread', balas_thread), ('Laporkan thread', lapor_thread),
                        ('Ubah nomor telepon (profil)', ubah_telepon), ('Ubah preferensi notifikasi', ubah_preferensi),
                        ('Tandai materi kursus selesai', materi_selesai), ('Tandai semua notifikasi dibaca', notif_dibaca)]),
        ('akademisi', 'akademisi', [('Balas thread', balas_thread), ('Beri nilai balasan', nilai_balasan)]),
        ('admin_opd', 'admin_opd', [('Tambah aplikasi (draft)', tambah_aplikasi), ('Ubah aplikasi', ubah_aplikasi),
                                    ('Ajukan validasi aplikasi', ajukan_validasi), ('Buat flowchart (draft)', buat_flowchart)]),
        ('super_admin', 'super_admin', [('Putuskan validasi (setujui)', putuskan_validasi), ('Unggah dokumen', unggah_dokumen),
                                        ('Ubah status dokumen (draft → review)', ubah_status_dokumen),
                                        ('Moderasi: abaikan laporan', moderasi), ('Moderasi: sembunyikan konten', sembunyikan),
                                        ('Undang pengguna baru', undang_pengguna), ('Ubah peran pengguna', ubah_peran),
                                        ('Batalkan undangan', batalkan_undangan), ('Hapus pengguna', hapus_pengguna),
                                        ('Tolak hapus pengguna yang punya konten forum', tolak_hapus_penulis_forum),
                                        ('Nonaktifkan lalu aktifkan akun', nonaktif_aktif),
                                        ('Tambah, ubah, hapus periode', periode),
                                        ('Tolak periode yang bertabrakan', periode_bentrok), ('Backup sekarang', backup),
                                        ('Lihat kritik & saran masuk', kritik_admin)]),
        ('admin_opd', 'admin_opd', [('Terima notifikasi keputusan validasi', cek_notifikasi_opd)]),
    ]
    for role, demo, alur in rencana:
        print(f'== {role}')
        s = Sesi(b, demo)
        for nama, fn in alur:
            if URL_THREAD is None and fn in (balas_thread, lapor_thread, nilai_balasan):
                hasil.append({'role': role, 'alur': nama, 'ok': False, 'ket': 'dilewati: thread uji gagal dibuat', 'api': ''}); continue
            uji(role, nama, s, fn)
        s.tutup()
    b.close()

(OUT / 'hasil_alur.json').write_text(json.dumps({'tag': TAG, 'hasil': hasil}, indent=1, ensure_ascii=False), encoding='utf-8')
print(f'\nBerhasil {sum(h["ok"] for h in hasil)}/{len(hasil)} (penanda data: {TAG})')
