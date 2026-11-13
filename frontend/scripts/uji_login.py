"""Uji login lewat form /masuk per role (mode demo), lalu menu dan halaman yang terbuka.

Pemakaian: python frontend/scripts/uji_login.py <folder-hasil>
FE harus sudah berjalan di http://localhost:5173 (mode mock atau VITE_API_MOCK=false + BE).
Akun yang dipakai adalah akun demo di src/features/auth/LoginPage.tsx.
"""
import json, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
OUT = Path(sys.argv[1]); (OUT / 'shots').mkdir(parents=True, exist_ok=True)

TAB = {'super_admin': 'Super Admin', 'admin_opd': 'Admin OPD', 'asn': 'ASN & Akademisi'}
ROLE_LABEL = {'asn': 'ASN', 'akademisi': 'Akademisi', 'admin_opd': 'Admin OPD', 'super_admin': 'Super Admin'}
AKUN = [  # (role, tab, username, sandi) — sama dengan AKUN_DEMO di LoginPage.tsx
    ('asn', 'asn', 'asn', 'Asn@123'),
    ('akademisi', 'asn', 'akademisi', 'Akademisi@123'),
    ('admin_opd', 'admin_opd', 'adminopd', 'Admin@123'),
    ('super_admin', 'super_admin', 'superadmin', 'Super@123'),
]
# Menu samping kiri (src/app/navigation.ts SIDEBAR_NAV), per role.
UMUM = ['Beranda', 'Dokumen', 'SOP', 'Pembelajaran', 'Forum', 'Dasbor Analitik']
KELOLA = ['Data Aplikasi', 'Klasifikasi RAA', 'Flowchart', 'Dasbor Instansi']
SISTEM = ['Pengguna', 'Validasi', 'Repositori', 'Moderasi', 'Periode', 'Audit Trail', 'Backup', 'Kritik & Saran']
INFORMASI = ['Berita', 'FAQ & Panduan']
MENU = {
    'asn': UMUM + INFORMASI,
    'akademisi': UMUM + INFORMASI,
    'admin_opd': UMUM + KELOLA + INFORMASI,
    'super_admin': UMUM + KELOLA + SISTEM + INFORMASI,
}


def isi_login(page, tab, username, sandi, captcha_benar=True, kembali=None):
    page.goto(BASE + '/masuk' + (f'?kembali={kembali}' if kembali else ''), wait_until='networkidle')
    page.locator('label', has_text=TAB[tab]).first.click()
    page.fill('#login-username', username)
    page.fill('#login-sandi', sandi)
    soal = page.get_by_role('img', name=re.compile('Berapa hasil')).get_attribute('aria-label')
    a, b = map(int, re.findall(r'\d+', soal)[:2])
    page.fill('#login-captcha', str(a + b if captcha_benar else a + b + 1))
    page.get_by_role('button', name='Masuk ke Akun').click()
    page.wait_for_timeout(1200)
    page.wait_for_load_state('networkidle')


def galat(page):
    return [t.strip() for t in page.locator('p.text-red-600').all_inner_texts() if t.strip()]


def cek_halaman(page):
    """Kembalikan daftar masalah di halaman yang sedang terbuka."""
    m = []
    h1 = page.locator('h1').first.inner_text().strip() if page.locator('h1').count() else ''
    if h1 == 'Akses ditolak':
        m.append('Akses ditolak')
    if h1 == 'Halaman tidak ditemukan':
        m.append('404')
    alerts = [a.inner_text().strip() for a in page.locator('[role=alert]').all() if a.is_visible()]
    alerts = [a for a in alerts if a]
    if alerts:
        m.append('alert: ' + ' | '.join(x[:100] for x in alerts))
    return h1, m


def uji_akun(browser, role, tab, username, sandi):
    langkah = []
    catat = lambda nama, ok, ket='': langkah.append({'langkah': nama, 'ok': ok, 'ket': ket})
    ctx = browser.new_context(viewport={'width': 1366, 'height': 900})
    page = ctx.new_page()
    err = []
    page.on('pageerror', lambda e: err.append(str(e)))
    api_gagal = []
    page.on('response', lambda r: api_gagal.append(f'{r.request.method} {re.sub(r"[?].*", "", r.url.replace(BASE, ""))} {r.status}') if '/api/' in r.url and r.status >= 400 else None)

    isi_login(page, tab, username, sandi)
    path = page.url.replace(BASE, '')
    catat('Login lewat form', path.startswith('/beranda'), f'diarahkan ke {path}' + (f'; galat: {galat(page)}' if galat(page) else ''))
    if not path.startswith('/beranda'):
        page.screenshot(path=str(OUT / 'shots' / f'login_{role}.png'), full_page=True)
        ctx.close()
        return langkah

    sesi = page.evaluate("sessionStorage.getItem('spbe.demoRole')")
    catat('Sesi role tersimpan', sesi == role, f'spbe.demoRole = {sesi}')

    akun_btn = page.get_by_role('button', name='Menu akun')
    label = akun_btn.inner_text().strip().replace('\n', ' · ')
    catat('Nama & role di navbar', ROLE_LABEL[role] in label, label)

    h1, m = cek_halaman(page)
    catat('Beranda tampil', not m, h1 + ('; ' + '; '.join(m) if m else ''))

    samping = page.get_by_role('navigation', name='Menu samping')
    nav = [t.strip() for t in samping.get_by_role('link').all_inner_texts()]
    catat('Menu samping sesuai hak akses', nav == MENU[role], ', '.join(nav))

    # Klik tiap item menu samping. Audit Trail memuat teks "Akses ditolak" sebagai jenis aktivitas, bukan halaman 403.
    for item in MENU[role]:
        samping.get_by_role('link', name=item, exact=True).click()
        page.wait_for_load_state('networkidle'); page.wait_for_timeout(400)
        h1, m = cek_halaman(page)
        catat(f'Buka menu {item}', not m, f"{page.url.replace(BASE, '')} — {h1}" + ('; ' + '; '.join(m) if m else ''))

    # Profil lewat menu akun
    page.get_by_role('button', name='Menu akun').click()
    page.get_by_role('menuitem', name='Profil Saya').click()
    page.wait_for_load_state('networkidle'); page.wait_for_timeout(400)
    h1, m = cek_halaman(page)
    catat('Menu akun › Profil Saya', not m and '/profil' in page.url, h1)

    catat('Tanpa JS error', not err, '; '.join(e[:120] for e in err[:2]))
    catat('Tanpa API gagal (≥400)', not api_gagal, ', '.join(sorted(set(api_gagal))[:5]))

    # Keluar
    page.get_by_role('button', name='Menu akun').click()
    page.get_by_role('menuitem', name='Keluar').click()
    page.wait_for_load_state('networkidle'); page.wait_for_timeout(500)
    sesi = page.evaluate("sessionStorage.getItem('spbe.demoRole')")
    catat('Keluar', page.url.rstrip('/') == BASE and sesi is None, f"{page.url.replace(BASE, '') or '/'}; sesi = {sesi}")
    page.goto(BASE + '/beranda', wait_until='networkidle')
    catat('Setelah keluar, /beranda dialihkan ke /masuk', '/masuk' in page.url, page.url.replace(BASE, ''))
    ctx.close()
    return langkah


def uji_negatif(browser):
    hasil = []
    kasus = [
        ('Kata sandi salah', dict(tab='asn', username='asn', sandi='salah')),
        ('Captcha salah', dict(tab='asn', username='asn', sandi='Asn@123', captcha_benar=False)),
        ('Akun ASN di tab Admin OPD', dict(tab='admin_opd', username='asn', sandi='Asn@123')),
        ('Field kosong', dict(tab='asn', username='', sandi='')),
    ]
    for nama, kw in kasus:
        ctx = browser.new_context(); page = ctx.new_page()
        if kw['username'] == '':
            page.goto(BASE + '/masuk', wait_until='networkidle')
            page.get_by_role('button', name='Masuk ke Akun').click(); page.wait_for_timeout(400)
        else:
            isi_login(page, **kw)
        g = galat(page)
        ok = '/masuk' in page.url and bool(g)
        hasil.append({'langkah': nama, 'ok': ok, 'ket': ('tetap di /masuk; ' if '/masuk' in page.url else f'pindah ke {page.url}; ') + ' / '.join(g)})
        ctx.close()
    # kembali ke halaman asal setelah login
    ctx = browser.new_context(); page = ctx.new_page()
    page.goto(BASE + '/forum', wait_until='networkidle')
    awal = page.url.replace(BASE, '')
    m = re.search(r'kembali=([^&]+)', page.url)
    isi_login(page, 'asn', 'asn', 'Asn@123', kembali=m.group(1) if m else None)
    hasil.append({'langkah': 'Buka /forum tanpa login → login → kembali ke /forum', 'ok': page.url.endswith('/forum'),
                  'ket': f'{awal} → {page.url.replace(BASE, "")}'})
    ctx.close()
    return hasil


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    hasil = {role: uji_akun(browser, role, tab, u, s) for role, tab, u, s in AKUN}
    hasil['negatif'] = uji_negatif(browser)
    browser.close()

(OUT / 'hasil_login.json').write_text(json.dumps(hasil, indent=1, ensure_ascii=False), encoding='utf-8')
for k, rows in hasil.items():
    ok = sum(r['ok'] for r in rows)
    print(f'== {k}: {ok}/{len(rows)} berhasil')
    for r in rows:
        if not r['ok']:
            print('   x', r['langkah'], '::', r['ket'])
