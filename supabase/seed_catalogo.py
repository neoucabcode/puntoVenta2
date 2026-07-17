"""
Seed de catalogo inicial para puntoVenta2 (Supabase Postgres).

Lee el Excel y las imagenes .webp desde la carpeta recursosIniciales
del usuario (la ruta se arma con os.path, sin backslashes en este texto).

Requiere variables de entorno (NO hardcodeadas):
  SUPABASE_URL            ej. https://pvopcajqersioqlmccwg.supabase.co
  SUPABASE_SERVICE_ROLE   secret key (bypasea RLS)

Uso:
  $env:SUPABASE_URL="..."
  $env:SUPABASE_SERVICE_ROLE="..."
  py supabase/seed_catalogo.py

Comportamiento:
  - Crea la empresa si no existe (por nombre en EMPRESA_NOMBRE).
  - Crea las 8 categorias (idempotente por nombre+empresa).
  - Inserta productos (idempotente por sku+empresa). 86 sin precio -> precio_usd=0.
  - Sube imagenes a Storage bucket "productos/" y setea imagen_url.
"""
import os
import sys
import glob
import uuid

try:
    from supabase import create_client, Client
except ImportError:
    sys.exit("Falta supabase: pip install supabase")

import openpyxl

# ---- Config ----
RECURSOS = os.path.join(os.path.expanduser("~"), "Documents", "recursosIniciales")
EXCEL = os.path.join(RECURSOS, "catalogo_recurso_inicial.xlsx")
IMG_DIR = RECURSOS
EMPRESA_NOMBRE = "FerrehogarMart"  # <-- nombre real de la ferreteria
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
    if res.data:
        print(f"[empresa] existente: {res.data[0]['id']}")
        return res.data[0]["id"]
    res = _safe(supabase.table("empresa").insert({
        "nombre": EMPRESA_NOMBRE,
        "moneda_resguardo": "USD",
        "tasa_activa": 1,
        "igtf_habilitado": False,
        "caja_obligatoria": False,
        "venta_sin_stock": True,
        "stock_negativo": False,
    }).select("id").execute())
    print(f"[empresa] creada: {res.data[0]['id']}")
    return res.data[0]["id"]


def get_or_create_categoria(empresa_id, nombre):
    nombre = (nombre or "SIN CATEGORIA").strip().upper()
    res = _safe(supabase.table("categoria").select("id").eq("empresa_id", str(empresa_id)).eq("nombre", nombre).limit(1).execute())
    if res.data:
        return res.data[0]["id"]
    res = _safe(supabase.table("categoria").insert({"empresa_id": str(empresa_id), "nombre": nombre}).select("id").execute())
    return res.data[0]["id"]


def upload_imagen(sku):
    path = os.path.join(IMG_DIR, f"{sku}.webp")
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        data = f.read()
    #_storage upload: bucket, destino, bytes, content-type
    supabase.storage.from_(BUCKET).upload(
        f"{sku}.webp", data,
        {"content-type": "image/webp", "upsert": "true"},
    )
    # URL publica
    return f"{URL}/storage/v1/object/public/{BUCKET}/{sku}.webp"


def main():
    empresa_id = get_empresa()
    # cache de categorias
    cat_cache = {}

    wb = openpyxl.load_workbook(EXCEL, read_only=True, data_only=True)
    ws = wb["Productos"]
    rows = list(ws.iter_rows(values_only=True))

    inserted = 0
    updated_img = 0
    skip = 0
    for i, r in enumerate(rows):
        if i < 2:  # fila 0 metadata, fila 1 header
            continue
        sku = r[0]
        if sku is None:
            continue
        sku = str(sku).strip()
        nombre = str(r[1]).strip() if r[1] else sku
        precio_usd = float(r[2]) if r[2] else 0.0
        # r[3] = VENTA BS (no se usa; se calcula con tasa_activa)
        cat_nombre = str(r[4]).strip() if r[4] else "SIN CATEGORIA"
        unidad = str(r[5]).strip() if r[5] else "unidad"

        if cat_nombre not in cat_cache:
            cat_cache[cat_nombre] = get_or_create_categoria(empresa_id, cat_nombre)

        # idempotente por sku+empresa
        exist = _safe(supabase.table("producto").select("id,imagen_url").eq("empresa_id", str(empresa_id)).eq("sku", sku).limit(1).execute())
        payload = {
            "empresa_id": str(empresa_id),
            "sku": sku,
            "nombre": nombre,
            "categoria_id": str(cat_cache[cat_nombre]),
            "unidad": unidad,
            "precio_usd": precio_usd,
            "stock_actual": 0,
            "stock_minimo": 0,
            "activo": True,
        }
        if exist.data:
            supabase.table("producto").update(payload).eq("id", exist.data[0]["id"]).execute()
            pid = exist.data[0]["id"]
        else:
            res = _safe(supabase.table("producto").insert(payload).select("id,imagen_url").execute())
            pid = res.data[0]["id"]
            inserted += 1

        # imagen solo si hay archivo
        img_url = upload_imagen(sku)
        if img_url:
            _safe(supabase.table("producto").update({"imagen_url": img_url}).eq("id", pid).execute())
            updated_img += 1
        skip += 1

    print(f"[fin] insertados nuevos={inserted}, procesados={skip}, con_imagen={updated_img}")


if __name__ == "__main__":
    main()
