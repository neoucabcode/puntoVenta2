import json
from pathlib import Path
import openpyxl

excel_path = Path(r'c:/Users/neo/Downloads/catalogo_inicial.xlsx')
image_dir = Path(r'c:/Users/neo/Desktop/imagenes')
out_dir = Path(r'c:/Users/neo/proyectos/puntoVentaCopia/puntoVenta2Copia/web/src/assets')
out_dir.mkdir(parents=True, exist_ok=True)
out_json = out_dir / 'catalogo_importado.json'

wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
ws = wb['Productos']
rows = list(ws.iter_rows(values_only=True))
print('rows', len(rows))
for idx, row in enumerate(rows[:12]):
    print(idx, row)
