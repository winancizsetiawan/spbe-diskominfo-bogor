"""Mengubah matriks Excel SPBE menjadi src/mocks/dataNyata/spbe.json (dibaca mock saat pengembangan).

Pemakaian: python -I scripts/ekstrak-excel.py "<path>.xlsx"
Hasilnya tidak masuk git (lihat .gitignore): data arsitektur bersifat internal.
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
SINONIM_INSTANSI = {'Sekretariat Dewan Perwakilan Rakyat Daerah': 'Sekretariat DPRD'}


def kolom(ref):
    n = 0
    for ch in re.match(r'[A-Z]+', ref).group():
        n = n * 26 + ord(ch) - 64
    return n


def baca(z, nama_sheet):
    """Baris sheet sebagai {nomor kolom: teks}."""
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rid = next(s.get(REL) for s in wb.find('m:sheets', NS) if s.get('name') == nama_sheet)
    target = next(r.get('Target') for r in rels if r.get('Id') == rid).lstrip('/')
    path = target if target.startswith('xl/') else f'xl/{target}'
    ss = [''.join(si.itertext()) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS)]
    hasil = []
    for c_row in ET.fromstring(z.read(path)).iter('{%s}row' % NS['m']):
        nilai = {}
        for c in c_row.findall('m:c', NS):
            v = c.find('m:v', NS)
            if v is None or v.text is None:
                continue
            teks = ss[int(v.text)] if c.get('t') == 's' else v.text
            nilai[kolom(c.get('r'))] = teks.strip()
        if nilai:
            hasil.append(nilai)
    return hasil


def bersih(v):
    return '' if v in (None, '-') else v


def main(xlsx):
    with zipfile.ZipFile(xlsx) as z:
        unit = baca(z, 'UnitKerja')[1:]
        apl = baca(z, '6-Domain Aplikasi')[2:]
        probis = baca(z, '1-Domain Proses Bisnis')[3:]

    instansi, lihat = [], set()
    for r in unit:
        nama = SINONIM_INSTANSI.get(r.get(2), r.get(2))
        if not nama or nama == 'TOTAL' or nama in lihat:
            continue
        lihat.add(nama)
        angka = lambda k: int(float(r.get(k, 0) or 0))
        instansi.append({'nama': nama, 'akronim': r.get(3, ''), 'probis': angka(4), 'layanan': angka(5), 'data': angka(6)})

    aplikasi = []
    for r in apl:
        nama, milik = r.get(4), SINONIM_INSTANSI.get(r.get(18), r.get(18))
        if not nama or milik not in lihat:
            continue
        aplikasi.append({
            'kode': r.get(2, ''), 'nama': nama, 'instansi': milik,
            'deskripsi': bersih(r.get(5)) or bersih(r.get(6)),
            'raa1': bersih(r.get(15)), 'raa2': bersih(r.get(16)),
        })

    proses = []
    for r in probis:
        kode, milik = r.get(2, ''), SINONIM_INSTANSI.get(r.get(9), r.get(9))
        if not kode.startswith('BKT') or milik not in lihat:
            continue
        proses.append({'kode': kode, 'nama': r.get(3, ''), 'deskripsi': r.get(4, ''), 'instansi': milik, 'jenis': r.get(10, '')})

    tujuan = Path(__file__).resolve().parent.parent / 'src/mocks/dataNyata/spbe.json'
    tujuan.parent.mkdir(parents=True, exist_ok=True)
    tujuan.write_text(json.dumps({'instansi': instansi, 'aplikasi': aplikasi, 'proses': proses}, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{len(instansi)} instansi, {len(aplikasi)} aplikasi, {len(proses)} proses bisnis -> {tujuan}')


if __name__ == '__main__':
    main(sys.argv[1])
