"""Ubah Excel "Matriks Evaluasi SPBE Architecture Kota Bogor" menjadi data Dasbor Publik (mode mock).

Pemakaian:
    python frontend/scripts/excel_dasbor_publik.py <file.xlsx> [keluaran.json]
Keluaran bawaan: frontend/src/mocks/dataNyata/ (mode mock) dan backend/data/dasbor/ (dibaca BE).
Keduanya tidak masuk git: data arsitektur bersifat internal.

BATASAN DATA PUBLIK (disepakati 12 Nov 2026). Hanya kolom di bawah yang ikut ke keluaran:
- Proses Bisnis: ID, nama, sasaran strategis, RAB level 1-2, unit kerja, utama/sub; IKU (target, realisasi).
- Layanan: ID, nama, tujuan, target, metode, RAL level 1-2, unit pelaksana. TANPA risiko dan mitigasi.
- Data: angka per sifat/jenis/validitas/RAD; katalog HANYA data bersifat Terbuka.
- Aplikasi: nama, fungsi, basis, RAA level 1-2, kepemilikan, unit. TANPA URL, server, database, bahasa, OS.
- Infrastruktur: hanya angka per kategori, pusat data (kepemilikan, tier), jaringan intra. TANPA nama/spesifikasi perangkat.
- Keamanan: hanya jumlah standar per jenis dan edukasi per tahun. TANPA kerentanan, insiden, hasil audit, perangkat.
- Peta Rencana: angka per status/muatan/tahun/OPD/sasaran. TANPA estimasi nominal.

DASBOR INTERNAL (pengguna yang sudah masuk) TIDAK dibatasi: berkas kedua dataNyata/dasborInternal.json
memuat semua yang di atas ditambah kolom yang disembunyikan dari umum. Hanya dikirim ke pengguna yang login.
"""
import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from baca_xlsx import baris, muat  # noqa: E402

KELUARAN = Path(__file__).resolve().parents[1] / 'src' / 'mocks' / 'dataNyata' / 'dasborPublik.json'
# Folder data backend (DASBOR_DATA_DIR bawaan). Disalin hanya bila folder backend ada di sebelah frontend.
KELUARAN_BE = Path(__file__).resolve().parents[2] / 'backend' / 'data' / 'dasbor'


def rapikan(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def kosong(s):
    return rapikan(s) in ('', '-', 'None', 'none', 'null', 'Tidak ada data')


class Tabel:
    """Baris data sebuah sheet dengan akses kolom berdasarkan awalan nama header."""

    def __init__(self, semua, kunci_header):
        idx = next(i for i, r in enumerate(semua[:10]) if any(rapikan(x) == kunci_header for x in r))
        self.header = [rapikan(h) for h in semua[idx]]
        self.rows = semua[idx + 1:]

    def kol(self, awalan, ke=0):
        cocok = [i for i, h in enumerate(self.header) if h.lower().startswith(awalan.lower())]
        if len(cocok) <= ke:
            raise KeyError(f'kolom "{awalan}" tidak ada di {self.header}')
        return cocok[ke]

    def ambil(self, r, i):
        return rapikan(r[i]) if i < len(r) else ''


BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']


def tanggal_excel(s):
    """Sel tanggal Excel tersimpan sebagai angka seri (mis. 42979.0); ubah ke "1 September 2017". Teks dibiarkan."""
    if re.fullmatch(r'\d{4,5}(\.0+)?', s or ''):
        from datetime import timedelta
        d = date(1899, 12, 30) + timedelta(days=int(float(s)))
        return f'{d.day} {BULAN[d.month - 1]} {d.year}'
    return s


def hitung(nilai, urut=True, batas=None, label_kosong=None):
    c = Counter()
    for v in nilai:
        if kosong(v):
            if label_kosong:
                c[label_kosong] += 1
            continue
        c[v] += 1
    item = c.most_common() if urut else sorted(c.items())
    if batas:
        item = item[:batas]
    return [{'label': k, 'nilai': n} for k, n in item]


def kanonik(nilai, peta=None):
    """Satukan variasi penulisan (huruf besar/kecil, tanda hubung) ke bentuk yang paling sering muncul."""
    peta = peta or {}
    kunci = lambda s: re.sub(r'[\s\-]+', ' ', s.lower()).strip()
    sering = Counter(v for v in nilai if not kosong(v))
    bentuk = {}
    for v, _ in sering.most_common():
        bentuk.setdefault(kunci(v), peta.get(kunci(v), v))
    return [bentuk.get(kunci(v), v) if not kosong(v) else '' for v in nilai]


def main(xlsx, keluaran):
    z, shared, sheets = muat(xlsx)
    peta_sheet = {n: p for n, p, _ in sheets}
    ambil_sheet = lambda nama: baris(z, shared, peta_sheet[nama])

    # ---------------- Proses Bisnis ----------------
    pb = Tabel(ambil_sheet('1-Domain Proses Bisnis'), 'ID Proses Bisnis')
    k_id, k_nama, k_sas = pb.kol('ID Proses Bisnis'), pb.kol('Nama Bisnis'), pb.kol('Sasaran Strategis (')
    k_rab1, k_rab2 = pb.kol('→ RAB Level 1'), pb.kol('→ RAB Level 2')
    k_unit, k_ket = pb.kol('→ Unit Kerja'), pb.kol('Keterangan')
    probis = [r for r in pb.rows if not kosong(pb.ambil(r, k_id)) and pb.ambil(r, k_id).startswith('BKT')]
    unit_pb = [pb.ambil(r, k_unit) for r in probis]
    iku = Tabel(ambil_sheet('IKU'), 'Unit pelaksana')
    ki = [iku.kol('Unit pelaksana'), iku.kol('Sasaran Strategis'), iku.kol('Indikator Kinerja'), iku.kol('Nilai IKU Target'), iku.kol('Nilai IKU Realisasi')]
    daftar_iku = []
    for r in iku.rows:
        unit, sas, ind, tgt, real = (iku.ambil(r, i) for i in ki)
        if kosong(ind):
            continue
        daftar_iku.append({'unit': unit, 'sasaran': sas, 'indikator': ind, 'target': tgt, 'realisasi': real})

    proses_bisnis = {
        'jumlahUnit': len({u for u in unit_pb if not kosong(u)}),
        'jumlahProsesBisnis': len(probis),
        'perSektor': hitung([pb.ambil(r, k_rab1) for r in probis], label_kosong='Belum dipetakan'),
        'perUrusan': hitung([pb.ambil(r, k_rab2) for r in probis], label_kosong='Belum dipetakan'),
        'perJenis': hitung([pb.ambil(r, k_ket) for r in probis], label_kosong='Belum ditentukan'),
        'iku': daftar_iku,
        'katalog': [
            {'id': pb.ambil(r, k_id), 'nama': pb.ambil(r, k_nama), 'sasaran': pb.ambil(r, k_sas),
             'urusan': pb.ambil(r, k_rab2), 'jenis': pb.ambil(r, k_ket), 'unit': pb.ambil(r, k_unit)}
            for r in probis
        ],
    }

    # ---------------- Layanan ----------------
    ly = Tabel(ambil_sheet('4-Domain Layanan'), 'ID Layanan')
    k = {n: ly.kol(a) for n, a in [('id', 'ID Layanan'), ('nama', 'Nama Layanan'), ('tujuan', 'Tujuan'), ('target', 'Target Layanan'),
                                     ('metode', 'Metode Layanan'), ('ral1', 'RAL Level 1'), ('ral2', 'RAL Level 2'), ('unit', 'Organizational Unit (Unit Pelaksana')]}
    lay = [r for r in ly.rows if ly.ambil(r, k['id']).startswith('BKT')]
    target = kanonik([ly.ambil(r, k['target']) for r in lay])
    metode = kanonik([ly.ambil(r, k['metode']) for r in lay])
    unit_ly = [ly.ambil(r, k['unit']) for r in lay]
    layanan = {
        'jumlahLayanan': len(lay),
        'jumlahUnit': len({u for u in unit_ly if not kosong(u)}),
        'perTarget': hitung(target, label_kosong='Belum diisi'),
        'perMetode': hitung(metode, label_kosong='Belum diisi'),
        'perArea': hitung([ly.ambil(r, k['ral2']) for r in lay], label_kosong='Belum dipetakan'),
        'katalog': [
            {'id': ly.ambil(r, k['id']), 'nama': ly.ambil(r, k['nama']), 'tujuan': ly.ambil(r, k['tujuan']),
             'target': target[i], 'metode': metode[i], 'area': ly.ambil(r, k['ral2']), 'unit': unit_ly[i]}
            for i, r in enumerate(lay)
        ],
    }

    # ---------------- Data ----------------
    dt = Tabel(ambil_sheet('5-Domain Data'), 'ID Data')
    k = {n: dt.kol(a) for n, a in [('id', 'ID Data'), ('nama', 'Nama Data'), ('sifat', 'Sifat Data'), ('jenis', 'Jenis Data'),
                                     ('validitas', 'Validasi Data'), ('produsen', 'Penghasil Data'), ('wali', 'Penanggung Jawab Data'),
                                     ('rad1', 'RAD Level 1'), ('rad2', 'RAD Level 2')]}
    dat = [r for r in dt.rows if dt.ambil(r, k['id']).startswith('BKT')]
    sifat = kanonik([dt.ambil(r, k['sifat']) for r in dat])
    terbuka = [(i, r) for i, r in enumerate(dat) if sifat[i] == 'Terbuka']
    data = {
        'jumlahData': len(dat),
        'jumlahJenis': len({v for v in kanonik([dt.ambil(r, k['jenis']) for r in dat]) if v}),
        'perSifat': hitung(sifat, label_kosong='Belum diisi'),
        'perJenis': hitung(kanonik([dt.ambil(r, k['jenis']) for r in dat]), label_kosong='Belum diisi'),
        'perValiditas': hitung(kanonik([dt.ambil(r, k['validitas']) for r in dat]), label_kosong='Belum diisi'),
        'perKelompok': hitung([dt.ambil(r, k['rad1']) for r in dat], label_kosong='Belum dipetakan'),
        'tidakDitampilkan': len(dat) - len(terbuka),
        'katalog': [
            {'id': dt.ambil(r, k['id']), 'nama': dt.ambil(r, k['nama']), 'jenis': dt.ambil(r, k['jenis']),
             'validitas': dt.ambil(r, k['validitas']), 'produsen': dt.ambil(r, k['produsen']), 'wali': dt.ambil(r, k['wali']),
             'kelompok': dt.ambil(r, k['rad2'])}
            for _, r in terbuka
        ],
    }

    # ---------------- Aplikasi ----------------
    ap = Tabel(ambil_sheet('Aplikasi-Sort'), 'Nama Aplikasi')
    k = {n: ap.kol(a) for n, a in [('id', 'ID Aplikasi'), ('nama', 'Nama Aplikasi'), ('fungsi', 'Fungsi Aplikasi'),
                                     ('unit', '→ Unit Operasional Teknologi'), ('basis', 'Basis Aplikasi'), ('milik', 'Kepemilikan Aplikasi'),
                                     ('raa1', '→ RAA Level 1'), ('raa2', '→ RAA Level 2')]}
    apl = [r for r in ap.rows if not kosong(ap.ambil(r, k['nama'])) and ap.ambil(r, k['nama']) != 'Nama Aplikasi']
    unit_ap = [ap.ambil(r, k['unit']) for r in apl]
    milik = kanonik([ap.ambil(r, k['milik']) for r in apl])
    raa2 = [ap.ambil(r, k['raa2']) for r in apl]
    aplikasi = {
        'jumlahAplikasi': len(apl),
        'jumlahUnit': len({u for u in unit_ap if not kosong(u)}),
        'perKepemilikan': hitung(milik, label_kosong='Belum diisi'),
        'perJenis': hitung([ap.ambil(r, k['raa1']) for r in apl], label_kosong='Belum dipetakan'),
        'perFungsi': hitung(raa2, label_kosong='Belum dipetakan'),
        'perBasis': hitung(kanonik([ap.ambil(r, k['basis']) for r in apl]), label_kosong='Belum diisi'),
        'opdTeratas': hitung(unit_ap, batas=10),
        'katalog': [
            {'id': ap.ambil(r, k['id']), 'nama': ap.ambil(r, k['nama']), 'fungsi': ap.ambil(r, k['fungsi']),
             'basis': ap.ambil(r, k['basis']), 'kepemilikan': milik[i], 'jenis': raa2[i], 'unit': unit_ap[i]}
            for i, r in enumerate(apl)
        ],
    }

    # ---------------- Infrastruktur (hanya angka) ----------------
    inf = Tabel(ambil_sheet('7-Domain Infrastruktur'), 'Architecture category')
    k_kat = inf.kol('Architecture category')
    fk = Tabel(ambil_sheet('7.a Fasilitas Komputasi'), 'Klasifikasi Tier')
    fk_rows = [r for r in fk.rows if not kosong(fk.ambil(r, fk.kol('ID Fasilitas')))]
    infrastruktur = {
        'perKategori': hitung([inf.ambil(r, k_kat) for r in inf.rows]),
        'jumlahPusatData': len(fk_rows),
        'pusatDataPerKepemilikan': hitung(kanonik([fk.ambil(r, fk.kol('Kepemilikan')) for r in fk_rows])),
        'pusatDataPerTier': hitung(kanonik([fk.ambil(r, fk.kol('Klasifikasi Tier')) for r in fk_rows])),
        'jumlahJaringanIntra': sum(1 for r in ambil_sheet('7.k Jaringan Intra Pemerintah')[1:] if not kosong(r[2] if len(r) > 2 else '')),
    }

    # ---------------- Keamanan (hanya angka yang aman dibuka) ----------------
    km = Tabel(ambil_sheet('8-Domain Keamanan'), 'Jenis Standar Keamanan')
    jenis_std = kanonik([km.ambil(r, km.kol('Jenis Standar Keamanan')) for r in km.rows])
    ed = Tabel(ambil_sheet('8.b Edukasi Kesadaran Keamanan'), 'Tanggal Kegiatan')
    tahun = []
    for r in ed.rows:
        m = re.search(r'(20\d\d)', ed.ambil(r, ed.kol('Tanggal Kegiatan')))
        if m and not kosong(ed.ambil(r, ed.kol('ID Standar'))):
            tahun.append(m.group(1))
    keamanan = {
        'jumlahStandar': sum(1 for v in jenis_std if v),
        'standarPerJenis': hitung(jenis_std),
        'edukasiPerTahun': hitung(tahun, urut=False),
    }

    # ---------------- Peta Rencana ----------------
    pr = Tabel(ambil_sheet('NewPetaRencana'), 'Aktivitas')
    k = {n: pr.kol(a) for n, a in [('sasaran', 'Sasaran'), ('muatan', 'Muatan'), ('uic', 'UIC'), ('tahun', 'Tahun Pelaksanaan'), ('status', 'Status Pelaksanaan'), ('aktivitas', 'Aktivitas')]}
    keg = [r for r in pr.rows if not kosong(pr.ambil(r, k['aktivitas']))]
    status = kanonik([pr.ambil(r, k['status']) for r in keg])
    peta_rencana = {
        'totalKegiatan': len(keg),
        'sudahDilakukan': sum(1 for s in status if s in ('Sudah', 'Dalam Proses')),
        'perStatus': hitung(status, label_kosong='Belum diisi'),
        'perMuatan': hitung(kanonik([pr.ambil(r, k['muatan']) for r in keg])),
        'perTahun': hitung([pr.ambil(r, k['tahun']).replace('.0', '') for r in keg], urut=False),
        # Untuk grafik kurva: jumlah kegiatan direncanakan vs sudah/dalam proses per tahun (angka saja, aman untuk umum).
        'trenTahunan': [
            {'tahun': th, 'direncanakan': sum(1 for i, r in enumerate(keg) if pr.ambil(r, k['tahun']).replace('.0', '') == th),
             'terlaksana': sum(1 for i, r in enumerate(keg) if pr.ambil(r, k['tahun']).replace('.0', '') == th and status[i] in ('Sudah', 'Dalam Proses'))}
            for th in sorted({pr.ambil(r, k['tahun']).replace('.0', '') for r in keg} - {''})
        ],
        'opdTeratas': hitung([pr.ambil(r, k['uic']) for r in keg], batas=10),
        'sasaranTeratas': hitung([pr.ambil(r, k['sasaran']) for r in keg], batas=8),
    }

    # ---------------- Arsitektur per OPD (sheet UnitKerja: rekap resmi per OPD) ----------------
    uk = Tabel(ambil_sheet('UnitKerja'), 'List OPD')
    angka = lambda v: int(float(v)) if re.fullmatch(r'\d+(\.\d+)?', rapikan(v)) else 0
    per_opd = []
    for r in uk.rows:
        if not re.fullmatch(r'\d+(\.0)?', uk.ambil(r, uk.kol('No'))):
            continue  # baris TOTAL dan ringkasan di bawah tabel
        isi = {'opd': uk.ambil(r, uk.kol('List OPD')), 'akronim': uk.ambil(r, uk.kol('Akronim')),
               'prosesBisnis': angka(uk.ambil(r, uk.kol('Jumlah Probis'))), 'layanan': angka(uk.ambil(r, uk.kol('Jumlah Layanan'))),
               'data': angka(uk.ambil(r, uk.kol('Jumlah Data'))), 'aplikasi': angka(uk.ambil(r, uk.kol('Jumlah Aplikasi')))}
        # Lewati OPD tanpa isi dan baris ganda (mis. "RSUD Kota Bogor" tercatat dua kali di sheet).
        if sum(isi[x] for x in ('prosesBisnis', 'layanan', 'data', 'aplikasi')) and all(o['opd'] != isi['opd'] for o in per_opd):
            per_opd.append(isi)
    per_opd.sort(key=lambda x: -(x['prosesBisnis'] + x['layanan'] + x['data'] + x['aplikasi']))

    hasil = {
        'sumber': {'judul': 'Matriks Evaluasi 2026 SPBE Architecture Kota Bogor (As-Is)', 'diolah': date.today().isoformat()},
        'perOpd': per_opd,
        'prosesBisnis': proses_bisnis,
        'layanan': layanan,
        'data': data,
        'aplikasi': aplikasi,
        'infrastruktur': infrastruktur,
        'keamanan': keamanan,
        'petaRencana': peta_rencana,
    }
    Path(keluaran).write_text(json.dumps(hasil, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    ringkas = {d: {kk: (len(v) if isinstance(v, list) else v) for kk, v in isi.items()} for d, isi in hasil.items() if isinstance(isi, dict) and d != 'sumber'}
    print(json.dumps(ringkas, ensure_ascii=False, indent=1))
    print('ditulis:', keluaran, Path(keluaran).stat().st_size, 'byte')

    # =====================================================================================
    # DASBOR INTERNAL (pengguna yang sudah masuk): TANPA batasan. Semua kolom di atas ditambah
    # yang disembunyikan dari umum. Ditulis ke berkas terpisah agar tidak pernah terkirim ke publik.
    # =====================================================================================
    internal = json.loads(json.dumps(hasil))

    # Layanan: risiko dan mitigasi
    k_risiko, k_mitigasi = ly.kol('Risk (Risiko Layanan)'), ly.kol('Control (Mitigasi')
    for item, r in zip(internal['layanan']['katalog'], lay):
        item['risiko'] = ly.ambil(r, k_risiko)
        item['mitigasi'] = ly.ambil(r, k_mitigasi)

    # Data: semua sifat (Terbuka, Terbatas, Tertutup)
    k = {n: dt.kol(a) for n, a in [('id', 'ID Data'), ('nama', 'Nama Data'), ('jenis', 'Jenis Data'), ('validitas', 'Validasi Data'),
                                     ('produsen', 'Penghasil Data'), ('wali', 'Penanggung Jawab Data'), ('rad2', 'RAD Level 2')]}
    internal['data']['tidakDitampilkan'] = 0
    internal['data']['katalog'] = [
        {'id': dt.ambil(r, k['id']), 'nama': dt.ambil(r, k['nama']), 'sifat': sifat[i], 'jenis': dt.ambil(r, k['jenis']),
         'validitas': dt.ambil(r, k['validitas']), 'produsen': dt.ambil(r, k['produsen']), 'wali': dt.ambil(r, k['wali']),
         'kelompok': dt.ambil(r, k['rad2'])}
        for i, r in enumerate(dat)
    ]

    # Aplikasi: rincian teknis
    k = {n: ap.kol(a) for n, a in [('url', 'URL'), ('lisensi', 'Tipe Lisensi'), ('db', 'Nama Basis Data'), ('bahasa', 'Bahasa Pemrograman'),
                                     ('os', 'Sistem Operasi'), ('server', 'Lokasi Server'), ('pengembang', 'Unit Pengembang')]}
    for item, r in zip(internal['aplikasi']['katalog'], apl):
        item.update({n: ap.ambil(r, i) for n, i in [('url', k['url']), ('lisensi', k['lisensi']), ('database', k['db']),
                                                     ('bahasa', k['bahasa']), ('sistemOperasi', k['os']), ('lokasiServer', k['server']),
                                                     ('pengembang', k['pengembang'])]})

    # Infrastruktur: katalog elemen, pusat data, dan server
    k_id, k_nama = inf.kol('ID Arsitektur'), inf.kol('Nama Arsitektur')
    internal['infrastruktur']['katalog'] = [
        {'id': inf.ambil(r, k_id), 'nama': inf.ambil(r, k_nama), 'kategori': inf.ambil(r, k_kat)}
        for r in inf.rows if not kosong(inf.ambil(r, k_nama))
    ]
    internal['infrastruktur']['pusatData'] = [
        {'nama': fk.ambil(r, fk.kol('Nama Fasilitas')), 'lokasi': fk.ambil(r, fk.kol('Lokasi')),
         'bandwidthIntranet': fk.ambil(r, fk.kol('Bandwidth Intranet')), 'bandwidthInternet': fk.ambil(r, fk.kol('Bandwidth Internet')),
         'tier': fk.ambil(r, fk.kol('Klasifikasi Tier')), 'pengamanan': fk.ambil(r, fk.kol('Sistem Pengamanan')),
         'kepemilikan': fk.ambil(r, fk.kol('Kepemilikan'))}
        for r in fk_rows
    ]
    sv = Tabel(ambil_sheet('7.c Perangkat Keras Server '), 'Nama Perangkat Keras Server')
    internal['infrastruktur']['server'] = [
        {'id': sv.ambil(r, sv.kol('ID Perangkat')), 'nama': sv.ambil(r, sv.kol('Nama Perangkat')), 'uraian': sv.ambil(r, sv.kol('Uraian')),
         'lokasi': sv.ambil(r, sv.kol('Lokasi')), 'penggunaan': sv.ambil(r, sv.kol('Jenis Penggunaan')), 'pemilik': sv.ambil(r, sv.kol('Nama Pemilik')),
         'memori': sv.ambil(r, sv.kol('Kapasitas Memori')), 'prosesor': sv.ambil(r, sv.kol('Jenis Processor')),
         'sistemOperasi': sv.ambil(r, sv.kol('Sistem Operasi'))}
        for r in sv.rows if not kosong(sv.ambil(r, sv.kol('Nama Perangkat')))
    ]

    # Keamanan: seluruh subdomain, termasuk kerentanan, insiden, dan hasil audit
    SUB = ['8.a Standar, Prosedur, dan Regu', '8.b Edukasi Kesadaran Keamanan', '8.c Identifikasi Kerentanan Kea', '8.d Peningkatan Keamanan',
           '8.e Penanganan Insiden Keamanan', '8.f Audit Keamanan', '8.g Kelaikan Keamanan']
    NAMA_SUB = ['Standar, prosedur, dan regulasi', 'Edukasi kesadaran', 'Identifikasi kerentanan', 'Peningkatan keamanan',
                'Penanganan insiden', 'Audit keamanan', 'Kelaikan keamanan']
    kat_keamanan = []
    for sheet, label in zip(SUB, NAMA_SUB):
        semua = ambil_sheet(sheet)
        if len(semua) < 2:
            continue
        t = Tabel(semua, 'No')
        for r in t.rows:
            rid, nama = t.ambil(r, 2), t.ambil(r, 3)
            if kosong(nama):
                continue
            tanggal = tanggal_excel(t.ambil(r, 7) or t.ambil(r, 5))
            kat_keamanan.append({'kategori': label, 'id': rid, 'nama': nama, 'uraian': t.ambil(r, 4), 'tanggal': tanggal,
                                 'hasilAudit': t.ambil(r, 9), 'jenisAudit': t.ambil(r, 10), 'tindakLanjut': t.ambil(r, 11)})
    internal['keamanan']['perSubdomain'] = hitung([x['kategori'] for x in kat_keamanan])
    internal['keamanan']['perHasilAudit'] = hitung([x['hasilAudit'] for x in kat_keamanan], label_kosong='Belum diisi')
    internal['keamanan']['perTindakLanjut'] = hitung([x['tindakLanjut'] for x in kat_keamanan], label_kosong='Belum diisi')
    internal['keamanan']['katalog'] = kat_keamanan

    # Peta Rencana: katalog kegiatan lengkap dengan estimasi nominal
    k = {n: pr.kol(a) for n, a in [('sasaran', 'Sasaran'), ('muatan', 'Muatan'), ('aktivitas', 'Aktivitas'), ('indikator', 'Indikator'),
                                     ('uic', 'UIC'), ('tahun', 'Tahun Pelaksanaan'), ('nominal', 'Estimasi Nominal')]}
    internal['petaRencana']['katalog'] = [
        {'aktivitas': pr.ambil(r, k['aktivitas']), 'sasaran': pr.ambil(r, k['sasaran']), 'muatan': pr.ambil(r, k['muatan']),
         'indikator': pr.ambil(r, k['indikator']), 'uic': pr.ambil(r, k['uic']), 'tahun': pr.ambil(r, k['tahun']).replace('.0', ''),
         'status': status[i], 'nominal': pr.ambil(r, k['nominal'])}
        for i, r in enumerate(keg)
    ]

    keluaran_internal = Path(keluaran).with_name('dasborInternal.json')
    keluaran_internal.write_text(json.dumps(internal, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('ditulis:', keluaran_internal, keluaran_internal.stat().st_size, 'byte',
          '| keamanan', len(kat_keamanan), '| server', len(internal['infrastruktur']['server']), '| data', len(internal['data']['katalog']))

    # Salinan untuk backend (GET /api/dasbor/publik dan /api/dasbor/analitik membaca folder ini).
    if KELUARAN_BE.parents[1].is_dir():  # folder backend/
        KELUARAN_BE.mkdir(parents=True, exist_ok=True)
        for sumber in (Path(keluaran), keluaran_internal):
            (KELUARAN_BE / sumber.name).write_bytes(sumber.read_bytes())
        print('disalin ke backend:', KELUARAN_BE)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else KELUARAN)
