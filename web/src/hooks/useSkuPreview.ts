import { useEffect, useState } from 'react'
import { obtenerPreviewSku } from '../lib/sku'
import { obtenerMiEmpresaId } from '../lib/empresa'
import { useEmpresaConfig } from './useEmpresaConfig'

export function useSkuPreview(categoriaId: string | null) {
  const { config, loading: configLoading } = useEmpresaConfig()
  const [skuPreview, setSkuPreview] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    if (configLoading) return
    if (!config?.autogenerar_activo) {
      setSkuPreview(null)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setGenerando(true)
      try {
        const empresaId = await obtenerMiEmpresaId()
        if (!empresaId || cancelled) return
        const sku = await obtenerPreviewSku(empresaId, categoriaId ?? undefined)
        if (!cancelled) setSkuPreview(sku)
      } catch {
        if (!cancelled) setSkuPreview(null)
      } finally {
        if (!cancelled) setGenerando(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [categoriaId, config, configLoading])

  return { skuPreview, generando }
}
