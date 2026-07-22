# 07 — Modales genéricos

Todos los modales usan la misma estructura base:

## Estructura base

```
.modal-backdrop                   ← fondo oscuro, click cierra
└── .modal                        ← contenedor (max-width variable)
    ├── .modal-header
    │   ├── h2                      título
    │   └── btn ×                   cerrar (aria-label="Cerrar")
    │
    ├── .form-grid                  contenido (varía por modal)
    │   └── .span-2                 elementos que ocupan 2 columnas
    │
    └── .modal-footer
        ├── btn                      Cancelar
        └── btn.primary              Confirmar / Guardar
```

## Modales existentes

### ConfirmarEliminarModal (Inventario)
- Doble paso: confirmación → escritura de nombre
- Botón Eliminar con estilo rojo (`background: var(--off)`)
- Ver `05-inventario.md` para estructura detallada

### AjusteStockModal (Inventario)
```
.modal-backdrop > .modal
├── .modal-header  "Ajuste de stock"
├── .form-grid
│   ├── .span-2  select Producto
│   ├── label    Cantidad (+/-) input number
│   ├── label    Motivo select (conteo físico, merma, devolución, otro)
│   ├── .error .span-2
│   └── .modal-footer  Cancelar | Aplicar ajuste
```

### HistorialModal (Inventario)
```
.modal-backdrop > .modal
├── .modal-header  "Historial de cambios"
├── lista de entradas (HistorialEntry[])
│   ├── fecha, producto, acción, detalles
└── .modal-footer  Cerrar
```

### DuplicadoAlert (SkuConfigurable)
```
.modal-backdrop > .modal
├── .modal-header  "Productos similares encontrados"
├── lista de productos similares con similitud %
├── .modal-footer  Cancelar | Crear de todas formas
```

### SkuConfigForm (admin)
- Formulario de configuración de SKU por empresa
- Template selection, umbral de similitud
- Ver `components/SkuConfigForm.tsx`
