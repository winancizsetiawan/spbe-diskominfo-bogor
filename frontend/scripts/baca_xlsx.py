"""Pembaca xlsx minimal (stdlib): daftar sheet, ukuran, dan beberapa baris awal."""
import json, re, sys, zipfile
import xml.etree.ElementTree as ET

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'pr': 'http://schemas.openxmlformats.org/package/2006/relationships'}


def kolom_ke_angka(ref):
    huruf = re.match(r'[A-Z]+', ref).group()
    n = 0
    for ch in huruf:
        n = n * 26 + ord(ch) - 64
    return n - 1


def muat(path):
    z = zipfile.ZipFile(path)
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall('m:si', NS):
            shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    target = {r.get('Id'): r.get('Target') for r in rels.findall('pr:Relationship', NS)}
    sheets = []
    for s in wb.find('m:sheets', NS).findall('m:sheet', NS):
        rid = s.get('{%s}id' % NS['r'])
        t = target[rid].lstrip('/')
        sheets.append((s.get('name'), t if t.startswith('xl/') else 'xl/' + t, s.get('state', 'visible')))
    return z, shared, sheets


def baris(z, shared, path, maks=None):
    root = ET.fromstring(z.read(path))
    hasil = []
    for row in root.iter('{%s}row' % NS['m']):
        sel = {}
        for c in row.findall('m:c', NS):
            v = c.find('m:v', NS)
            t = c.get('t')
            if t == 'inlineStr':
                isel = c.find('m:is', NS)
                val = ''.join(x.text or '' for x in isel.iter('{%s}t' % NS['m'])) if isel is not None else ''
            elif v is None:
                continue
            elif t == 's':
                val = shared[int(v.text)]
            else:
                val = v.text
            sel[kolom_ke_angka(c.get('r'))] = val.strip() if isinstance(val, str) else val
        if sel and any(str(x).strip() for x in sel.values()):
            lebar = max(sel) + 1
            hasil.append([sel.get(i, '') for i in range(lebar)])
        if maks and len(hasil) >= maks:
            break
    return hasil


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    z, shared, sheets = muat(sys.argv[1])
    mode = sys.argv[2] if len(sys.argv) > 2 else 'ringkas'
    if mode == 'ringkas':
        for nama, path, state in sheets:
            semua = baris(z, shared, path)
            print(f'### {nama} [{state}] baris={len(semua)} kolom_maks={max((len(r) for r in semua), default=0)}')
            for r in semua[:4]:
                print('   ', ' | '.join(str(x)[:40] for x in r[:14]))
    else:
        nama_cari = sys.argv[2]
        for nama, path, state in sheets:
            if nama == nama_cari:
                semua = baris(z, shared, path)
                n = int(sys.argv[3]) if len(sys.argv) > 3 else 15
                for r in semua[:n]:
                    print(' | '.join(str(x)[:60] for x in r[:20]))
