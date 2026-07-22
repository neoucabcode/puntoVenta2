import openpyxl
from collections import defaultdict
from difflib import SequenceMatcher

wb = openpyxl.load_workbook(r'G:\Mi unidad\puntoVenta2Tabla\catalogo_inicial.xlsx', read_only=True)
ws = wb['Productos']

products = []
for row in ws.iter_rows(min_row=2, values_only=True):
    sku = row[0]
    nombre = row[1]
    if sku and nombre:
        products.append({'sku': str(sku).strip(), 'nombre': str(nombre).strip().upper()})

wb.close()

# Find fuzzy duplicates (similarity > 0.8)
fuzzy_groups = []
used = set()
for i, p1 in enumerate(products):
    if i in used:
        continue
    group = [p1]
    for j, p2 in enumerate(products):
        if j <= i or j in used:
            continue
        sim = SequenceMatcher(None, p1['nombre'], p2['nombre']).ratio()
        if sim > 0.8:
            group.append(p2)
            used.add(j)
    if len(group) > 1:
        used.add(i)
        fuzzy_groups.append(group)

print(f'Grupos con nombres similares (>80% similitud): {len(fuzzy_groups)}')
print()
for g in fuzzy_groups:
    print('--- Grupo ---')
    for p in g:
        print(f'  {p["sku"]}: {p["nombre"]}')
    print()
