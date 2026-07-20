"""
Auditoria de imagenes en Supabase Storage (SOLO LECTURA, no borra nada).

Cruza los objetos del bucket 'productos' contra producto.imagen_url para
encontrar:
  - HUERFANAS: objetos en Storage sin ningun producto que los use.
  - ROTAS: productos con imagen_url que apunta a un objeto inexistente.
  - VINCULADAS: objetos que si estan en uso.

Requiere SUPABASE_URL + SUPABASE_SERVICE_ROLE (en supabase/.env.local o env vars).
Uso:
  py supabase/auditar_imagenes.py
"""
import os
import sys

try:
    from supabase import create_client, Client
except ImportError:
    sys.exit("Falta supabase: pip install supabase")

EMPESA_NOMBRE = "FerrehogarMart"
BUCKET = "productos"


def cargar_env_local():
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


# Cargar credenciales desde .env.local ANTES de validar.
cargar_env_local()
URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE")
if not URL or not KEY:
    sys.exit("Defini SUPABASE_URL y SUPABASE_SERVICE_ROLE (o crea supabase/.env.local).")

supabase: Client = create_client(URL, KEY)


def _safe(res):
    if res is None:
        raise RuntimeError("Respuesta None de Supabase.")
    if getattr(res, "error", None):
        raise RuntimeError(f"Error Supabase: {res.error}")
    return res


def main():
    # Empresa
    emp = _safe(supabase.table("empresa").select("id,nombre").eq("nombre", EMPESA_NOMBRE).limit(1).execute())
    if not emp.data:
        sys.exit(f"Empresa '{EMPESA_NOMBRE}' no encontrada.")
    empresa_id = emp.data[0]["id"]
    print(f"[empresa] {empresa_id}")

    # Storage .list() devuelve una LISTA directa (no un objeto .data como las tablas).
    # Las imagenes estan en la RAIZ del bucket: productos/{sku}.webp (convencion del seed).
    objetos_emp = []
    offset = 0
    while True:
        res = supabase.storage.from_(BUCKET).list("", {"limit": 1000, "offset": offset})
        if not res:
            break
        objetos_emp.extend(res)
        if len(res) < 1000:
            break
        offset += 1000
    print(f"[storage] {len(objetos_emp)} archivos en raiz '{BUCKET}/'")

    rutas_storage = set(f"{o['name']}" for o in objetos_emp if o["name"].lower().endswith(".webp"))
    urls_storage = set(f"{URL}/storage/v1/object/public/{BUCKET}/{r}" for r in rutas_storage)

    # 2) Traer todos los imagen_url de productos de esta empresa
    prods = _safe(supabase.table("producto").select("id,sku,imagen_url").eq("empresa_id", str(empresa_id)).execute())
    print(f"[producto] {len(prods.data)} productos")

    vinculadas = set()
    rotas = []  # producto con imagen_url pero objeto inexistente
    sin_imagen = 0
    for p in prods.data:
        u = p.get("imagen_url")
        if not u:
            sin_imagen += 1
            continue
        if u in urls_storage:
            vinculadas.add(u)
        else:
            rotas.append((p["sku"], u))

    # 3) Huérfanas = objetos en storage sin producto que los use
    huérfanas = sorted(urls_storage - vinculadas)

    print("\n================ REPORTE (solo lectura) ================")
    print(f"Archivos en Storage (empresa): {len(rutas_storage)}")
    print(f"Vinculadas a un producto     : {len(vinculadas)}")
    print(f"HUERFANAS (sin producto)     : {len(huérfanas)}")
    print(f"Productos SIN imagen_url     : {sin_imagen}")
    print(f"Productos ROTOS (url inexist.): {len(rotas)}")
    print("\n--- HUERFANAS (candidatas a borrar, NO se borra nada) ---")
    for h in huérfanas:
        print(f"  {h}")
    print("\n--- ROTAS (producto apunta a archivo que no existe) ---")
    for sku, u in rotas:
        print(f"  sku={sku}  ->  {u}")
    print("\n(El script NO borra. Revisa la lista y decides.)")


if __name__ == "__main__":
    main()
