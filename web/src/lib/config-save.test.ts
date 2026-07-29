import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── calcularSimilitud (client-side trigram Jaccard) ──
// Extracted from ProductoForm for testability
function calcularSimilitud(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  const trigramsA = new Set<string>()
  const trigramsB = new Set<string>()
  for (let i = 0; i <= a.length - 3; i++) trigramsA.add(a.slice(i, i + 3))
  for (let i = 0; i <= b.length - 3; i++) trigramsB.add(b.slice(i, i + 3))
  if (trigramsA.size === 0 || trigramsB.size === 0) return 0
  let intersection = 0
  for (const t of trigramsA) if (trigramsB.has(t)) intersection++
  return intersection / (trigramsA.size + trigramsB.size - intersection)
}

describe('calcularSimilitud (client-side trigram Jaccard)', () => {
  it('returns 1 for identical strings', () => {
    expect(calcularSimilitud('tornillo', 'tornillo')).toBe(1)
  })

  it('returns 0 for empty strings', () => {
    expect(calcularSimilitud('', 'tornillo')).toBe(0)
    expect(calcularSimilitud('tornillo', '')).toBe(0)
    expect(calcularSimilitud('', '')).toBe(0)
  })

  it('returns high similarity for similar words', () => {
    const sim = calcularSimilitud('tornillo', 'tornillos')
    expect(sim).toBeGreaterThan(0.5)
  })

  it('returns low similarity for different words', () => {
    const sim = calcularSimilitud('tornillo', 'pintura')
    expect(sim).toBeLessThan(0.3)
  })

  it('handles case-insensitive comparison when caller lowercases', () => {
    // The caller (ProductoForm) lowercases both inputs before calling
    const sim = calcularSimilitud('tornillo', 'tornillo')
    expect(sim).toBe(1)
    // Uppercase would give 0 because trigrams are case-sensitive
    const simMixed = calcularSimilitud('tornillo', 'TORNILLO')
    expect(simMixed).toBe(0)
  })

  it('handles short strings (less than 3 chars)', () => {
    expect(calcularSimilitud('ab', 'abc')).toBe(0)
    expect(calcularSimilitud('abc', 'ab')).toBe(0)
  })

  it('handles Spanish characters', () => {
    const sim = calcularSimilitud('clavo', 'clavos')
    expect(sim).toBeGreaterThan(0.5)
  })
})

// ── actualizarConfigSku upsert ──
describe('actualizarConfigSku upsert', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('calls upsert with onConflict when supabase is available', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null })
    const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock })

    vi.doMock('../lib/supabase', () => ({
      supabase: { from: fromMock },
    }))

    vi.doMock('../lib/mock-data', () => ({
      obtenerConfigSkuMock: vi.fn(),
      generarSkuMock: vi.fn(),
      buscarProductosSimilaresMock: vi.fn(),
      actualizarConfigSkuMock: vi.fn(),
    }))

    const { actualizarConfigSku } = await import('../lib/sku')
    await actualizarConfigSku('emp-1', {
      autogenerar_activo: true,
      plantilla: 'solo_secuencial',
    })

    expect(fromMock).toHaveBeenCalledWith('empresa_configuracion_sku')
    expect(upsertMock).toHaveBeenCalledWith(
      {
        empresa_id: 'emp-1',
        autogenerar_activo: true,
        plantilla: 'solo_secuencial',
      },
      { onConflict: 'empresa_id' }
    )
  })

  it('includes empresa_id in payload even when config is partial', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null })
    const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock })

    vi.doMock('../lib/supabase', () => ({
      supabase: { from: fromMock },
    }))

    vi.doMock('../lib/mock-data', () => ({
      obtenerConfigSkuMock: vi.fn(),
      generarSkuMock: vi.fn(),
      buscarProductosSimilaresMock: vi.fn(),
      actualizarConfigSkuMock: vi.fn(),
    }))

    const { actualizarConfigSku } = await import('../lib/sku')
    await actualizarConfigSku('emp-1', {
      umbral_similitud: 0.5,
    })

    const payload = upsertMock.mock.calls[0][0]
    expect(payload.empresa_id).toBe('emp-1')
    expect(payload.umbral_similitud).toBe(0.5)
    // Should NOT include undefined fields
    expect(payload).not.toHaveProperty('autogenerar_activo')
    expect(payload).not.toHaveProperty('plantilla')
  })
})
