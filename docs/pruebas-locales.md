# Pruebas locales aisladas

Este proyecto ahora puede probarse de forma local y aislada sin depender del proyecto original ni de Supabase.

## Cómo usarlo
1. Entrar a la carpeta web.
2. Ejecutar `npm install`.
3. Ejecutar `npm run dev`.
4. Abrir la URL que muestra Vite.

## Credenciales de demo
- Email: `demo@local.test`
- Contraseña: `demo123`

## Qué funciona en modo local
- Login y logout
- Registro local
- Catálogo con productos de ejemplo
- Crear, editar, activar/desactivar y buscar productos
- Crear categorías
- Subir imágenes locales (se usan URLs temporales del navegador)

## Importar un catálogo original
Si quieres usar una copia del catálogo original, puedes cargar un archivo JSON o CSV desde la propia UI.

### Opción A: JSON
Crea un archivo con este formato:

```json
{
  "categories": [
    { "nombre": "Herramientas" },
    { "nombre": "Electricidad" }
  ],
  "products": [
    {
      "nombre": "Taladro 12V",
      "sku": "SKU-001",
      "codigo_barras": "750100000001",
      "categoria": "Herramientas",
      "precio_usd": 79,
      "costo_usd": 45,
      "stock_actual": 8,
      "stock_minimo": 3,
      "unidad": "unidad",
      "activo": true,
      "imagen_url": "https://ejemplo.com/imagen.jpg"
    }
  ]
}
```

### Opción B: CSV
Crea un archivo con columnas como estas:

```csv
nombre,sku,codigo_barras,categoria,precio_usd,costo_usd,stock_actual,stock_minimo,unidad,activo,imagen_url
Taladro 12V,SKU-001,750100000001,Herramientas,79,45,8,3,unidad,true,https://ejemplo.com/imagen.jpg
```

### Pasos para importar
1. Guarda el archivo en tu computadora.
2. En la app, abre el catálogo.
3. Usa el botón "Importar catálogo" de la toolbar.
4. Selecciona tu archivo JSON o CSV.
5. La app cargará los productos y categorías en modo local.

## Importante
- El archivo se usa solo en esta copia local.
- No se conecta al proyecto original.
- Si quieres, luego puedes seguir ajustando los datos en la interfaz.

## Importante
- Si no hay variables de Supabase configuradas, la app entra automáticamente en modo local.
- Esto evita depender del proyecto original.
- Si luego quieres conectar una base propia, basta con agregar las variables de entorno de Supabase.
