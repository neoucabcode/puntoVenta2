"""
Vincular imagenes de imagenesNuevas/ al catalogo de Supabase.

Las imagenes se nombran igual que el sku del producto (ej. CAP0026.webp -> sku CAP0026).
Para cada archivo:
  1. Busca el producto por sku (empresa FerrehogarMart).
  2. Sube al bucket 'productos' en {empresa_id}/{producto_id}.webp (misma convencion
     que subirImagenProducto en web/src/lib/productos.ts).
  3. Actualiza imagen_url con la URL publica.

Usa SUPABASE_SERVICE_ROLE (bypasea RLS y storage policies), asi NO depende de patch_05.

Requiere:
  $env:SUPABASE_URL="..."
  $env:SUPABASE_SERVICE_ROLE="..."
  py supabase/vincular_imagenes_nuevas.py
"""
import os
import sys
import glob

try:
    from supabase import create_client, Client
except ImportError:
    sys.exit("Falta supabase: pip install supabase")

IMG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "imagenesNuevas")
EMPRESA_NOMBRE = "FerrehogarMart"
BUCKET = "productos"

URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE")
if not URL or not KEY:
    sys.exit("Defini SUPABASE_URL y SUPABASE_SERVICE_ROLE como variables de entorno.")

supabase: Client = create_client(URL, KEY)


def _safe(res):
    if res is None:
        raise RuntimeError("Respuesta None de Supabase (¿URL/key malas o red?)")
    if getattr(res, "error", None):
        raise RuntimeError(f"Error Supabase: {res.error}")
    return res


def get_empresa():
    res = _safe(supabase.table("empresa").select("id,nombre").eq("nombre", EMPRESA_NOMBRE).limit(1).execute())
    if not res.data:
        sys.exit(f"Empresa '{EMPRESA_NOMBRE}' no encontrada.")
    print(f"[empresa] {res.data[0]['id']}")
    return res.data[0]["id"]


def main():
    empresa_id = get_empresa()
    archivos = sorted(glob.glob(os.path.join(IMG_DIR, "*.webp")))
    print(f"[scan] {len(archivos)} imagenes en imagenesNuevas/")

    subidas = 0
    sin_match = 0
    ya_tenia = 0

    for path in archivos:
        sku = os.path.splitext(os.path.basename(path))[0]
        res = _safe(supabase.table("producto").select("id,imagen_url").eq("empresa_id", str(empresa_id)).eq("sku", sku).limit(1).execute())
        if not res.data:
            print(f"[skip] sku {sku}: no existe producto")
            sin_match += 1
            continue
        pid = res.data[0]["id"]
        if res.data[0].get("imagen_url"):
            print(f"[skip] sku {sku}: ya tiene imagen_url")
            ya_tenia += 1
            continue

        with open(path, "rb") as f:
            data = f.read()
        dest = f"{empresa_id}/{pid}.webp"
        _safe(supabase.storage.from_(BUCKET).upload(dest, data, {"content-type": "image/webp", "upsert": "true"}))
        public_url = f"{URL}/storage/v1/object/public/{BUCKET}/{dest}"
        _safe(supabase.table("producto").update({"imagen_url": public_url}).eq("id", pid).execute())
        subidas += 1
        print(f"[ok] sku {sku} -> {dest}")

    print(f"[fin] subidas={subidas}, ya_tenia={ya_tenia}, sin_match={sin_match}")

    if subidas:
        # vaciar carpeta local
        for path in archivos:
            os.remove(path)
        print("[limpieza] imagenesNuevas/ vaciada")


if __name__ == "__main__":
    main()
