from supabase import create_client
import os

sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE'])
empresa_id = 'b72bb1ff-9b7d-4e69-bb79-edd6f64c8b9b'

# Total productos
r = sb.table('producto').select('id', count='exact').eq('empresa_id', empresa_id).execute()
print(f'Total productos: {r.count}')

# Con imagen
r2 = sb.table('producto').select('id', count='exact').eq('empresa_id', empresa_id).not_.is_('imagen_url', 'null').execute()
print(f'Con imagen: {r2.count}')

# Categorias
r3 = sb.table('categoria').select('id,nombre').eq('empresa_id', empresa_id).execute()
print(f'Categorias: {len(r3.data)}')
for c in r3.data[:10]:
    print(f'  - {c["nombre"]}')
if len(r3.data) > 10:
    print(f'  ... y {len(r3.data) - 10} mas')

# Verificar FILTRO ROSCA (duplicados limpiados)
r4 = sb.rpc('buscar_productos', {
    'p_empresa_id': empresa_id,
    'p_search': 'FILTRO ROSCA',
    'p_categoria_id': None,
    'p_solo_activos': True,
    'p_limit': 20,
    'p_offset': 0
}).execute()
print(f'\nFILTRO ROSCA (verificar duplicados):')
for p in r4.data:
    print(f'  {p["sku"]}: {p["nombre"]} - ${p["precio_usd"]}')

# Verificar LLAVE PLASTICA
r5 = sb.rpc('buscar_productos', {
    'p_empresa_id': empresa_id,
    'p_search': 'LLAVE PLASTICA DISPENSADOR',
    'p_categoria_id': None,
    'p_solo_activos': True,
    'p_limit': 10,
    'p_offset': 0
}).execute()
print(f'\nLLAVE PLASTICA DISPENSADOR:')
for p in r5.data:
    print(f'  {p["sku"]}: {p["nombre"]} - ${p["precio_usd"]}')
