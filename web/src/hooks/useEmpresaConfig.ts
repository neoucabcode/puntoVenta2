import { useCallback, useEffect, useState } from 'react'
import { obtenerConfigSku, type EmpresaConfigSku } from '../lib/sku'
import { obtenerMiEmpresaId } from '../lib/empresa'

export function useEmpresaConfig() {
  const [config, setConfig] = useState<EmpresaConfigSku | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const empresaId = await obtenerMiEmpresaId()
      if (!empresaId) {
        setConfig(null)
        return
      }
      const c = await obtenerConfigSku(empresaId)
      setConfig(c)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    obtenerMiEmpresaId()
      .then((empresaId) => {
        if (!empresaId || !active) return null
        return obtenerConfigSku(empresaId)
      })
      .then((c) => {
        if (active) setConfig(c)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { config, loading, refetch: fetchConfig }
}
