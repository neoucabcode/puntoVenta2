from supabase import create_client
import os

sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE'])
empresa_id = 'b72bb1ff-9b7d-4e69-bb79-edd6f64c8b9b'

skus_to_delete = ['REF0014', 'REF0018', 'REF0021', 'FER0030']

for sku in skus_to_delete:
    # Find the product
    r = sb.table('producto').select('id,nombre,sku').eq('empresa_id', empresa_id).eq('sku', sku).execute()
    if not r.data:
        print(f'  {sku}: not found, skipping')
        continue
    product = r.data[0]
    pid = product['id']
    
    # Delete image from storage if exists
    try:
        img_path = f'{empresa_id}/{pid}.webp'
        sb.storage.from_('productos').remove([img_path])
        print(f'  {sku}: image deleted from storage')
    except Exception as e:
        print(f'  {sku}: no image or delete failed ({e})')
    
    # Delete the product
    sb.table('producto').delete().eq('id', pid).execute()
    print(f'  {sku}: product deleted ({product["nombre"]})')

print('\nDone. Verifying...')
r = sb.rpc('buscar_productos', {
    'p_empresa_id': empresa_id,
    'p_search': 'FILTRO ROSCA 162',
    'p_categoria_id': None,
    'p_solo_activos': True,
    'p_limit': 10,
    'p_offset': 0
}).execute()
print(f'FILTRO ROSCA 162 remaining:')
for p in r.data:
    print(f'  {p["sku"]}: {p["nombre"]}')

r2 = sb.rpc('buscar_productos', {
    'p_empresa_id': empresa_id,
    'p_search': 'LLAVE PLASTICA DISPENSADOR',
    'p_categoria_id': None,
    'p_solo_activos': True,
    'p_limit': 10,
    'p_offset': 0
}).execute()
print(f'LLAVE PLASTICA DISPENSADOR remaining:')
for p in r2.data:
    print(f'  {p["sku"]}: {p["nombre"]}')
