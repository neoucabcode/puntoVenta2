import openpyxl
from collections import defaultdict

wb = openpyxl.load_workbook(r'G:\Mi unidad\puntoVenta2Tabla\catalogo_inicial.xlsx', read_only=True)
ws = wb['Productos']

products = []
for row in ws.iter_rows(min_row=2, values_only=True):
    sku = row[0]
    nombre = row[1]
    precio = row[2]
    categoria = row[3]
    unidad = row[4]
    if sku and nombre:
        products.append({
            'sku': str(sku).strip(),
            'nombre': str(nombre).strip().upper(),
            'precio': precio,
            'categoria': str(categoria).strip() if categoria else '',
            'unidad': str(unidad).strip() if unidad else ''
        })

wb.close()

print(f'Total productos en Excel: {len(products)}')
print()

by_name = defaultdict(list)
for p in products:
    by_name[p['nombre']].append(p)

duplicates = {name: items for name, items in by_name.items() if len(items) > 1}
print(f'Nombres duplicados: {len(duplicates)}')
print(f'Total productos en grupos duplicados: {sum(len(v) for v in duplicates.values())}')
print()

for name, items in sorted(duplicates.items()):
    print(f'--- "{name}" ({len(items)} productos) ---')
    for p in items:
        print(f'  SKU: {p["sku"]} | Precio: ${p["precio"]} | Cat: {p["categoria"]} | Unidad: {p["unidad"]}')
    print()
