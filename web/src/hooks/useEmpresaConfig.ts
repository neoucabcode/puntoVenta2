import { useEffect, useState } from 'react'
import { obtenerConfigSku, type EmpresaConfigSku } from '../lib/sku'
import { obtenerMiEmpresaId } from '../lib/empresa'

export function useEmpresaConfig() {
  const [config, setConfig] = useState<EmpresaConfigSku | null>(null)
  const [loading, setLoading] = useState(true)

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

  return { config, loading }
}
