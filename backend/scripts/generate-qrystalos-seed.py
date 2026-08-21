"""Genera 063_qrystalos_seed.sql desde listado de procesos krystalos.xlsx."""
import re
import sys
from collections import OrderedDict, defaultdict
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[2]
XLSX = ROOT / 'listado de procesos krystalos.xlsx'
OUT = Path(__file__).resolve().parents[1] / 'src/db/migrations/063_qrystalos_seed.sql'


def mod_code(name):
    m = re.match(r'^(\d+)\.', str(name).strip())
    return m.group(1).zfill(2) if m else None


def proc_code(text):
    s = str(text).strip()
    m = re.match(r'^([\d.]+)', s)
    return m.group(1).rstrip('.') if m else None


def proc_label(text):
    s = str(text).strip()
    m = re.match(r'^[\d.]+\.?\s*(.+)$', s)
    return (m.group(1).strip() if m else s)[:500]


def esc(val):
    return str(val or '').replace("'", "''")


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb['Qrystalos']

    modules = OrderedDict()
    procesos = []
    seen_codes = set()

    for row in ws.iter_rows(min_row=2, values_only=True):
        tipo, mod, txt = row[0], row[1], row[2]
        if not tipo or not mod or not txt:
            continue
        mod = str(mod).strip()
        mc = mod_code(mod)
        if mc and mc not in modules:
            modules[mc] = {
                'codigo': mc,
                'nombre': mod,
                'orden': int(mc) if mc.isdigit() else 999,
            }
        pc = proc_code(txt)
        if not pc or not mc:
            continue
        code = pc
        n = 2
        while code in seen_codes:
            code = f'{pc}#{n}'
            n += 1
        seen_codes.add(code)
        label = proc_label(txt)
        procesos.append({
            'codigo': code,
            'modulo': mc,
            'tipo': str(tipo).strip(),
            'nombre': label,
            'codigo_num': pc,
            'descripcion': label,
        })

    def short_name(n):
        parts = [p.strip() for p in n.split('/')]
        return parts[-1].strip().lower()

    by_short = defaultdict(list)
    proc_by_code = {p['codigo']: p for p in procesos}
    for p in procesos:
        sn = short_name(p['nombre'])
        if len(sn) >= 3:
            by_short[sn].append(p['codigo'])

    grupos = []
    grupod = []
    gseq = 1
    for sn, codes in sorted(by_short.items()):
        if len(codes) < 2:
            continue
        mods = {proc_by_code[c]['modulo'] for c in codes}
        if len(mods) < 2:
            continue
        gc = f'GRP{str(gseq).zfill(4)}'
        gseq += 1
        title = sn.title()
        grupos.append({
            'codigo': gc,
            'nombre': title,
            'descripcion': f'Agrupador auto: {title}',
        })
        for c in codes:
            grupod.append({'grupo': gc, 'proceso': c})

    lines = ['-- Seed Qrystalos procesos (generado desde Excel)']
    for m in modules.values():
        lines.append(
            f"INSERT INTO qrysmod (codigo,nombre,orden,estado) "
            f"VALUES ('{esc(m['codigo'])}','{esc(m['nombre'])}',{m['orden']},'A') "
            f"ON CONFLICT (codigo) DO NOTHING;"
        )
    for p in procesos:
        lines.append(
            f"INSERT INTO qrysproc (codigo,modulo,tipo,nombre,codigo_num,descripcion,estado) "
            f"VALUES ('{esc(p['codigo'])}','{esc(p['modulo'])}','{esc(p['tipo'])}',"
            f"'{esc(p['nombre'])}','{esc(p['codigo_num'])}','{esc(p['descripcion'])}','A') "
            f"ON CONFLICT (codigo) DO NOTHING;"
        )
    for g in grupos:
        lines.append(
            f"INSERT INTO qrysgrupo (codigo,nombre,descripcion,estado) "
            f"VALUES ('{esc(g['codigo'])}','{esc(g['nombre'])}','{esc(g['descripcion'])}','A') "
            f"ON CONFLICT (codigo) DO NOTHING;"
        )
    for l in grupod:
        lines.append(
            f"INSERT INTO qrysgrupod (grupo,proceso) "
            f"VALUES ('{esc(l['grupo'])}','{esc(l['proceso'])}') "
            f"ON CONFLICT DO NOTHING;"
        )

    OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'modules={len(modules)} procesos={len(procesos)} grupos={len(grupos)} links={len(grupod)}')
    print(f'written {OUT}')


if __name__ == '__main__':
    main()
