# MATRIX — Punto de Retorno (estado vivo del proyecto)

> **Uso:** Al iniciar una sesión nueva, el asistente lee este archivo con la palabra clave **"matrix"** y continúa el hilo sin que el usuario repita contexto.
> Este archivo es la fuente de verdad del estado. Se actualiza al cerrar cada avance.

## Proyecto
Sistema de punto de venta para ferretería bimonetaria (Venezuela: BS / USD). Carpeta: `C:\Users\neo\proyectos\puntoVenta2`.

## Estado actual (última actualización: 2026-07-16)
- **Fase 0 (documentación):** COMPLETA. 12 docs en `/docs` (00 a 11).
- **Stack Fase 1:** CERRADO. Node.js (TypeScript) + React PWA (web pura) + SQLite local (migrable a Postgres) + IndexedDB (offline) + estrategia offline-first + impresora térmica desde inicio.
- **Configurabilidad:** Decisiones RN-53 (caja opcional), RN-54 (venta sin stock configurable), RN-55 (stock negativo configurable), RN-56 (parámetros habilitables por admin). El admin tiene autoridad de configuración (R3). Caja NO es obligatoria.
- **Grafo graphify:** RECONSTRUIDO. `graphify-out/` → 68 nodos / 78 aristas / 7 hyperedges / 15 comunidades. Generado con Gemini (GEMINI_API_KEY en variable de usuario Windows) + chunk curado manual (Gemini sub-extrae, se complementa a mano).

## API key
- `GEMINI_API_KEY` en variable de usuario de Windows (persistente, fuera del repo). NO se commitea.
- Sin key: solo extracción estructural (1 nodo por encabezado). Con key: semántica + labels LLM.

## Último hilo de trabajo
Se acaba de reconstruir el grafo semántico (tras perder chunks previos por limpieza) combinando extracción Gemini + chunk curado manual. Quedamos listos para **Fase 1 avanzada**.

## Próximo paso sugerido
**Fase 1 avanzada** — definir:
1. Modelo de datos físico (esquema SQLite: entidades Producto, Venta, Cliente, Caja, etc., bimonetario).
2. Protocolo de impresión térmica (ESC/POS, librería a elegir: ej. `node-thermal-printer` / `escpos`).
3. Estrategia de sincronización offline (IndexedDB ↔ SQLite, cola de pendientes, resolución de conflictos).
4. Detalles pendientes: formato SKU, compresión de imágenes, automatización tasa BCV.

## Archivos clave
- `docs/02-reglas-de-negocio.md` — RN-01..56.
- `docs/08-opciones-de-stack-y-decisiones.md` — stack cerrado.
- `docs/11-decisiones-cerradas.md` — decisiones de negocio + stack Fase 1 (§9).
- `graphify-out/graph.json`, `graph.html`, `GRAPH_REPORT.md` — grafo.

## Notas de método
- graphify CLI: `$py -m graphify extract docs --backend gemini --no-cluster` (requiere key en sesión). Cluster: `cluster-only <dir>`. Labels: `label <dir>`.
- Para grafo fino se escribe chunk curado manual `.graphify_chunk_*.json` y se mergea con script `_merge.py` + `_build.py` (recrearlos si se borran).
- Regla de trazabilidad: todo se etiqueta Hecho / Supuesto / Decisión pendiente / Recomendación futura.
