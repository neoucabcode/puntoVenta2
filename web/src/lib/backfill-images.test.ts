import { describe, it, expect, vi, beforeEach } from 'vitest'

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

const h = vi.hoisted(() => ({
  // Productos detectados
  prodData: [] as Array<Record<string, unknown>>,
  // Storage operations
  downloadBlob: null as Blob | null,
  downloadError: null as unknown,
  uploadPath: null as string | null,
  uploadError: null as unknown,
  removePaths: [] as string[],
  removeError: null as unknown,
  listResult: [] as Array<{ name: string }>,
  listError: null as unknown,
  // DB operations
  updateCalls: [] as Array<{ id: string; imagen_url: string }>,
  updateError: null as unknown,
}))

vi.mock('../lib/supabase', () => {
  const from = vi.fn((table: string) => {
    if (table === 'producto') {
      return {
        select: vi.fn(() => ({
          not: vi.fn(() => ({
            not: vi.fn(() => ({
              eq: vi.fn(() => ({
                // The async resolver for the final chain
                then: undefined,
              })),
            })),
          })),
        })),
        update: vi.fn((payload: Record<string, unknown>) => ({
          eq: vi.fn(async (_field: string, value: string) => {
            if (h.updateError) return { error: h.updateError }
            h.updateCalls.push({
              id: value,
              imagen_url: payload.imagen_url as string,
            })
            return { error: null }
          }),
        })),
      }
    }
    return {}
  })

  const download = vi.fn(async () => {
    if (h.downloadError) return { data: null, error: h.downloadError }
    return { data: h.downloadBlob, error: null }
  })
  const upload = vi.fn(async (path: string) => {
    h.uploadPath = path
    if (h.uploadError) return { data: null, error: h.uploadError }
    return { data: { path }, error: null }
  })
  const getPublicUrl = vi.fn((path: string) => ({
    data: { publicUrl: `https://storage.example.com/productos/${path}` },
  }))
  const remove = vi.fn(async (paths: string[]) => {
    h.removePaths.push(...paths)
    if (h.removeError) return { error: h.removeError }
    return { data: null, error: null }
  })
  const list = vi.fn(async () => {
    if (h.listError) return { data: null, error: h.listError }
    return { data: h.listResult, error: null }
  })
  const storageFrom = vi.fn(() => ({ download, upload, getPublicUrl, remove, list }))

  return { supabase: { from, storage: { from: storageFrom } } }
})

// Mock the Promise-style select chain for producto

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('backfillImagenes', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    h.prodData = []
    h.downloadBlob = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: 'image/webp' })
    h.downloadError = null
    h.uploadPath = null
    h.uploadError = null
    h.removePaths = []
    h.removeError = null
    h.listResult = []
    h.listError = null
    h.updateCalls = []
    h.updateError = null
  })

  it('throws si supabase es null', async () => {
    vi.doMock('../lib/supabase', () => ({ supabase: null }))
    const { backfillImagenes } = await import('../lib/backfill-images')
    await expect(backfillImagenes()).rejects.toThrow(/conexion/i)
  })

  it('dry-run cuenta pero no hace cambios', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const productos = [
      {
        id: 'prod-1',
        sku: 'FER-001',
        empresa_id: 'emp-test',
        imagen_url: 'https://storage.example.com/productos/emp-test/FER-001.webp',
      },
    ]

    // Mock the producto select chain to return our data
    vi.doMock('../lib/supabase', () => {
      const from = vi.fn(() => ({
        select: vi.fn(() => ({
          not: vi.fn(() => ({
            not: vi.fn(() => ({
              then: (resolve: (v: { data: unknown; error: null }) => void) =>
                resolve({ data: productos, error: null }),
            })),
          })),
        })),
      }))
      const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://storage.example.com/test.webp' } }))
      const list = vi.fn(async () => ({ data: [], error: null }))
      const download = vi.fn(async () => ({ data: h.downloadBlob, error: null }))
      const upload = vi.fn(async () => ({ data: { path: 'x' }, error: null }))
      const remove = vi.fn(async () => ({ data: null, error: null }))
      return {
        supabase: {
          from,
          storage: {
            from: vi.fn(() => ({ getPublicUrl, list, download, upload, remove })),
          },
        },
      }
    })

    const { backfillImagenes } = await import('../lib/backfill-images')
    const result = await backfillImagenes({ dryRun: true })

    expect(result.total).toBe(1)
    expect(result.migrados).toBe(1)
    consoleSpy.mockRestore()
  })

  it('skip si el path nuevo ya existe (idempotencia)', async () => {
    const productos = [
      {
        id: 'prod-1',
        sku: 'FER-001',
        empresa_id: 'emp-test',
        imagen_url: 'https://storage.example.com/productos/emp-test/FER-001.webp',
      },
    ]

    vi.doMock('../lib/supabase', () => {
      const from = vi.fn(() => ({
        select: vi.fn(() => ({
          not: vi.fn(() => ({
            not: vi.fn(() => ({
              then: (resolve: (v: { data: unknown; error: null }) => void) =>
                resolve({ data: productos, error: null }),
            })),
          })),
        })),
      }))
      const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://storage.example.com/test.webp' } }))
      // list dice que el nuevo path YA existe
      const list = vi.fn(async () => ({
        data: [{ name: 'prod-1.webp' }],
        error: null,
      }))
      const download = vi.fn(async () => ({ data: h.downloadBlob, error: null }))
      const upload = vi.fn(async () => ({ data: { path: 'x' }, error: null }))
      const remove = vi.fn(async () => ({ data: null, error: null }))
      return {
        supabase: {
          from,
          storage: {
            from: vi.fn(() => ({ getPublicUrl, list, download, upload, remove })),
          },
        },
      }
    })

    const { backfillImagenes } = await import('../lib/backfill-images')
    const result = await backfillImagenes()

    expect(result.total).toBe(1)
    expect(result.yaMigrados).toBe(1)
    expect(result.migrados).toBe(0)
  })

  it('cuenta como no encontrado si el path viejo no existe', async () => {
    const productos = [
      {
        id: 'prod-1',
        sku: 'FER-001',
        empresa_id: 'emp-test',
        imagen_url: 'https://storage.example.com/productos/emp-test/FER-001.webp',
      },
    ]

    vi.doMock('../lib/supabase', () => {
      const from = vi.fn(() => ({
        select: vi.fn(() => ({
          not: vi.fn(() => ({
            not: vi.fn(() => ({
              then: (resolve: (v: { data: unknown; error: null }) => void) =>
                resolve({ data: productos, error: null }),
            })),
          })),
        })),
      }))
      const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://storage.example.com/test.webp' } }))
      const list = vi.fn(async () => ({ data: [], error: null }))
      // download falla (path viejo no existe)
      const download = vi.fn(async () => ({
        data: null,
        error: new Error('not found'),
      }))
      const upload = vi.fn(async () => ({ data: { path: 'x' }, error: null }))
      const remove = vi.fn(async () => ({ data: null, error: null }))
      return {
        supabase: {
          from,
          storage: {
            from: vi.fn(() => ({ getPublicUrl, list, download, upload, remove })),
          },
        },
      }
    })

    const { backfillImagenes } = await import('../lib/backfill-images')
    const result = await backfillImagenes()

    expect(result.total).toBe(1)
    expect(result.noEncontrados).toBe(1)
    expect(result.migrados).toBe(0)
  })

  it('migra exitosamente: descarga viejo, sube nuevo, actualiza DB, borra viejo', async () => {
    const productos = [
      {
        id: 'prod-1',
        sku: 'FER-001',
        empresa_id: 'emp-test',
        imagen_url: 'https://storage.example.com/productos/emp-test/FER-001.webp',
      },
    ]

    const mockList = vi.fn(async () => ({ data: [], error: null }))
    const mockDownload = vi.fn(async () => ({ data: h.downloadBlob, error: null }))
    const mockUpload = vi.fn(async () => ({ data: { path: 'emp-test/prod-1.webp' }, error: null }))
    const mockRemove = vi.fn(async () => ({ data: null, error: null }))
    const mockGetPublicUrl = vi.fn((path: string) => ({
      data: { publicUrl: `https://storage.example.com/productos/${path}` },
    }))

    vi.doMock('../lib/supabase', () => {
      const from = vi.fn(() => ({
        select: vi.fn(() => ({
          not: vi.fn(() => ({
            not: vi.fn(() => ({
              then: (resolve: (v: { data: unknown; error: null }) => void) =>
                resolve({ data: productos, error: null }),
            })),
          })),
        })),
        update: vi.fn((payload: Record<string, unknown>) => ({
          eq: vi.fn(async () => {
            h.updateCalls.push({
              id: 'prod-1',
              imagen_url: payload.imagen_url as string,
            })
            return { error: null }
          }),
        })),
      }))
      return {
        supabase: {
          from,
          storage: {
            from: vi.fn(() => ({
              list: mockList,
              download: mockDownload,
              upload: mockUpload,
              remove: mockRemove,
              getPublicUrl: mockGetPublicUrl,
            })),
          },
        },
      }
    })

    const { backfillImagenes } = await import('../lib/backfill-images')
    const result = await backfillImagenes()

    expect(result.total).toBe(1)
    expect(result.migrados).toBe(1)

    // Verificar la cadena de operaciones
    expect(mockDownload).toHaveBeenCalledWith('emp-test/FER-001.webp')
    expect(mockUpload).toHaveBeenCalledWith(
      'emp-test/prod-1.webp',
      expect.anything(),
      expect.objectContaining({ upsert: true, contentType: 'image/webp' })
    )
    expect(mockRemove).toHaveBeenCalledWith(['emp-test/FER-001.webp'])

    // DB update debe haber guardado el nuevo URL con cache-busting
    expect(h.updateCalls).toHaveLength(1)
    expect(h.updateCalls[0].id).toBe('prod-1')
    expect(h.updateCalls[0].imagen_url).toContain('prod-1.webp')
    expect(h.updateCalls[0].imagen_url).toMatch(/\?t=\d+$/)
  })

  it('keepOld=true no borra el archivo viejo despues de migrar', async () => {
    const productos = [
      {
        id: 'prod-1',
        sku: 'FER-001',
        empresa_id: 'emp-test',
        imagen_url: 'https://storage.example.com/productos/emp-test/FER-001.webp',
      },
    ]

    const mockRemove = vi.fn(async () => ({ data: null, error: null }))

    vi.doMock('../lib/supabase', () => {
      const from = vi.fn(() => ({
        select: vi.fn(() => ({
          not: vi.fn(() => ({
            not: vi.fn(() => ({
              then: (resolve: (v: { data: unknown; error: null }) => void) =>
                resolve({ data: productos, error: null }),
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
      }))
      return {
        supabase: {
          from,
          storage: {
            from: vi.fn(() => ({
              list: vi.fn(async () => ({ data: [], error: null })),
              download: vi.fn(async () => ({ data: h.downloadBlob, error: null })),
              upload: vi.fn(async () => ({ data: { path: 'x' }, error: null })),
              remove: mockRemove,
              getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/x' } })),
            })),
          },
        },
      }
    })

    const { backfillImagenes } = await import('../lib/backfill-images')
    await backfillImagenes({ keepOld: true })

    expect(mockRemove).not.toHaveBeenCalled()
  })
})
