import { useEffect, useState } from 'react'
import { verificarSkuDisponible } from '../lib/sku'

export function useSkuDisponibilidad(sku: string, empresaId: string | null) {
  const [disponible, setDisponible] = useState<boolean | null>(null)
  const [verificando, setVerificando] = useState(false)

  useEffect(() => {
    if (!sku.trim() || !empresaId) {
      setDisponible(null)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setVerificando(true)
      try {
        const result = await verificarSkuDisponible(empresaId, sku.trim())
        if (!cancelled) setDisponible(result)
      } catch (err) {
        console.error('[useSkuDisponibilidad] Error verificando SKU:', err)
        if (!cancelled) setDisponible(null)
      } finally {
        if (!cancelled) setVerificando(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [sku, empresaId])

  return { disponible, verificando }
}