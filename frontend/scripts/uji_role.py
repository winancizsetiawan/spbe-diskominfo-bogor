import json, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
OUT = Path(sys.argv[1])
SHOTS = OUT / 'shots'
SHOTS.mkdir(parents=True, exist_ok=True)

PUBLIK = ['/', '/masuk', '/berita', '/dokumen', '/dasbor-publik', '/kritik-saran', '/bantuan', '/cari?q=aplikasi']
INTERNAL = ['/beranda', '/notifikasi', '/profil', '/sop', '/pembelajaran', '/dasbor/analitik', '/forum', '/forum/baru']
PERM = {
    'aplikasi:kelola': ['/katalog/aplikasi', '/katalog/aplikasi/baru', '/katalog/raa', '/katalog/flowchart', '/katalog/flowchart/baru'],
    'dasbor:instansi': ['/katalog/dasbor'],
    'pengguna:kelola': ['/admin/pengguna'],
    'validasi:putuskan': ['/admin/validasi'],
    'repositori:kelola': ['/admin/repositori', '/admin/repositori/baru'],
    'moderasi': ['/admin/moderasi'],
    'kritik:lihat': ['/admin/kritik'],
    'periode:kelola': ['/admin/periode'],
    'audit:lihat': ['/admin/audit'],
    'backup:kelola': ['/admin/backup'],
}
ALLOWED = {
    'aplikasi:kelola': ['admin_opd', 'super_admin'], 'dasbor:instansi': ['admin_opd', 'super_admin'],
}
for p in PERM:
    ALLOWED.setdefault(p, ['super_admin'])

# halaman daftar -> pola tautan detail yang diikuti
DETAIL = [
    ('/berita', r'^/berita/[^/]+$', None),
    ('/dokumen', r'^/dokumen/[^/]+$', None),
    ('/forum', r'^/forum/(?!baru)[^/]+$', 'internal'),
    ('/pembelajaran', r'^/pembelajaran/[^/]+$', 'internal'),
    ('/katalog/aplikasi', r'^/katalog/aplikasi/[^/]+/ubah$', 'aplikasi:kelola'),
    ('/katalog/flowchart', r'^/katalog/flowchart/(?!baru)[^/]+$', 'aplikasi:kelola'),
    ('/admin/validasi', r'^/admin/validasi/[^/]+$', 'validasi:putuskan'),
]

ROLES = ['publik', 'asn', 'akademisi', 'admin_opd', 'super_admin']


def expected(role, path, grp):
    if grp == 'publik':
        return 'ok'
    if role == 'publik':
        return 'login'
    if grp == 'internal':
        return 'ok'
    return 'ok' if role in ALLOWED[grp] else 'forbidden'


def check(page, role, path, grp, logs):
    logs['console'].clear(); logs['api'].clear(); logs['pageerror'].clear()
    try:
        page.goto(BASE + path, wait_until='networkidle', timeout=20000)
    except Exception as e:
        return {'path': path, 'status': 'GAGAL', 'detail': f'goto: {e}'.splitlines()[0]}
    page.wait_for_timeout(600)
    url = page.url.replace(BASE, '')
    body = page.inner_text('body')
    if '/masuk' in url and path != '/masuk':
        actual = 'login'
    elif 'Akses ditolak' in body:
        actual = 'forbidden'
    elif 'Halaman tidak ditemukan' in body:
        actual = 'notfound'
    else:
        actual = 'ok'
    alerts = [a.inner_text().strip() for a in page.locator('[role=alert]').all() if a.is_visible()]
    alerts = [a for a in alerts if a]
    exp = expected(role, path, grp)
    masalah = []
    if actual != exp:
        masalah.append(f'harap {exp}, dapat {actual}')
    if actual == 'ok':
        if alerts:
            masalah.append('alert: ' + ' | '.join(a[:120] for a in alerts))
        if logs['pageerror']:
            masalah.append('JS error: ' + logs['pageerror'][0][:160])
        bad = [a for a in logs['api'] if a[1] >= 400]
        if bad:
            masalah.append('API gagal: ' + ', '.join(f'{m} {u} {s}' for u, s, m in [(b[0], b[1], b[2]) for b in bad][:4]))
        errs = [c for c in logs['console'] if 'Download the React DevTools' not in c]
        if errs:
            masalah.append('console error: ' + errs[0][:160])
        if len(body.strip()) < 40:
            masalah.append('halaman nyaris kosong')
    name = f"{role}_{re.sub(r'[^a-z0-9]+', '_', path.lower()).strip('_') or 'root'}.png"
    if masalah:
        page.screenshot(path=str(SHOTS / name), full_page=True)
    h1 = page.locator('h1').first.inner_text().strip() if page.locator('h1').count() else ''
    return {'path': path, 'grp': grp, 'harap': exp, 'aktual': actual, 'h1': h1[:80],
            'status': 'BERHASIL' if not masalah else 'BELUM', 'masalah': masalah,
            'api': sorted({f'{a[2]} {a[0]}' for a in logs['api']})}


def main():
    hasil = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for role in ROLES:
            ctx = browser.new_context(viewport={'width': 1366, 'height': 900})
            if role != 'publik':
                ctx.add_init_script(f"try{{sessionStorage.setItem('spbe.demoRole','{role}')}}catch(e){{}}")
            page = ctx.new_page()
            logs = {'console': [], 'api': [], 'pageerror': []}
            page.on('console', lambda m: logs['console'].append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: logs['pageerror'].append(str(e)))
            page.on('response', lambda r: logs['api'].append((re.sub(r'\?.*', '', r.url.replace(BASE, '')), r.status, r.request.method)) if '/api/' in r.url else None)
            rows = []
            for path in PUBLIK:
                rows.append(check(page, role, path, 'publik', logs))
            for path in INTERNAL:
                rows.append(check(page, role, path, 'internal', logs))
            for grp, paths in PERM.items():
                for path in paths:
                    rows.append(check(page, role, path, grp, logs))
            # halaman detail
            for lst, pat, grp in DETAIL:
                g = grp or 'publik'
                if expected(role, lst, g) != 'ok':
                    continue
                try:
                    page.goto(BASE + lst, wait_until='networkidle', timeout=20000)
                    page.wait_for_timeout(500)
                    hrefs = page.eval_on_selector_all('a[href]', 'els => els.map(e => e.getAttribute("href"))')
                except Exception:
                    hrefs = []
                target = next((h for h in hrefs if h and re.match(pat, h.split('?')[0])), None)
                if not target:
                    rows.append({'path': lst + ' → detail', 'grp': g, 'status': 'BELUM',
                                 'masalah': ['tidak ada tautan detail di halaman daftar'], 'api': []})
                    continue
                r = check(page, role, target, g, logs)
                r['path'] = f'{target} (detail)'
                rows.append(r)
            hasil[role] = rows
            ctx.close()
        browser.close()
    (OUT / 'hasil.json').write_text(json.dumps(hasil, indent=1, ensure_ascii=False), encoding='utf-8')
    for role, rows in hasil.items():
        ok = sum(r['status'] == 'BERHASIL' for r in rows)
        print(f'== {role}: {ok}/{len(rows)} berhasil')
        for r in rows:
            if r['status'] != 'BERHASIL':
                print('   x', r['path'], '::', '; '.join(r['masalah']))


main()
