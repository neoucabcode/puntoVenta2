# Sync catálogo inicial: Excel (Drive) → Supabase

Script de carga inicial. Lee la tabla `TablaProductos` del Excel en Drive y hace
*upsert* de productos/categorías en Supabase. Sube imágenes desde la carpeta de
Drive solo cuando el producto no tiene una `imagen_url` ya vinculada.

> ⚠️ **Uso solo al inicio.** Una vez que la app está en marcha, el catálogo se
> gestiona desde la app. Este script es para sembrar/configurar, no para uso diario.

## Requisitos

```powershell
pip install supabase openpyxl
```

## Variables de entorno (obligatorias, nunca hardcodeadas)

```powershell
$env:SUPABASE_URL="https://pvopcajqersioqlmccwg.supabase.co"
$env:SUPABASE_SERVICE_ROLE="<secret key: Dashboard → Settings → API Keys>"
```

La `SUPABASE_SERVICE_ROLE` bypasea RLS y storage policies. **No la commitees ni la
pegues en el chat.** El asistente no corre este script; lo ejecutás vos en tu PowerShell.

## Uso

```powershell
py supabase/sync_desde_excel.py
```

### Modo forzar Drive (sobreescribir imágenes existentes)

Por defecto el script **nunca pisa** una `imagen_url` ya existente en Supabase: el
`.webp` de Drive solo se usa si el producto no tiene imagen. Si querés que el archivo
de Drive reemplace la imagen de Supabase, usá el flag:

```powershell
py supabase/sync_desde_excel.py --forzar-drive
```

## Orígenes

- **Excel:** `G:\Mi unidad\catalogo_inicial.xlsx` → hoja `Productos` → tabla `TablaProductos`
  (columnas: `SKU | PRODUCTO | VENTA $ | CATEGORIA | UND VENTA`). `VENTA $` es USD.
- **Imágenes:** `G:\Mi unidad\puntoVenta2Tabla\imagenes\{SKU}.webp`

## Mapa de campos

| Excel (TablaProductos) | Supabase (`producto`) |
| --- | --- |
| SKU | `sku` (clave de emparejamiento) |
| PRODUCTO | `nombre` |
| VENTA $ | `precio_usd` (USD, sin conversión) |
| CATEGORIA | `categoria_id` (se crea si no existe) |
| UND VENTA | `unidad` |

La columna `Imágenes` de la hoja (fuera de la tabla) es checklist personal y se ignora.

## Reporte al final

El script imprime: insertados, actualizados, imágenes subidas, productos que ya tenían
imagen, y productos sin imagen local (ni en Drive ni en Supabase).
