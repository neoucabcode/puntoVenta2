// Catalog export/import logic — placeholder for PR 3.
// Will be expanded with JSZip-based export and import functionality.

export type CatalogoExport = {
  version: '1.0'
  exportado_en: string
  categorias: Array<{ nombre: string; codigo?: string }>
  productos: Array<{
    nombre: string
    sku: string
    codigo_barras?: string
    categoria_nombre: string
    unidad: string
    costo_usd: number
    precio_usd: number
    imagen_archivo?: string
  }>
}

export async function exportarCatalogo(
  _empresaId: string
): Promise<CatalogoExport> {
  throw new Error('exportarCatalogo will be implemented in PR 3')
}

export async function importarCatalogo(
  _file: File,
  _empresaId: string
): Promise<{ imported: number; categories: number }> {
  throw new Error('importarCatalogo will be implemented in PR 3')
}
