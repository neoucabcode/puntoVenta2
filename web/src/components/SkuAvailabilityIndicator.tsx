type Props = {
  verificando: boolean
  disponible: boolean | null
}

export function SkuAvailabilityIndicator({ verificando, disponible }: Props) {
  if (verificando) {
    return (
      <span className="sku-availability" role="status" aria-label="Verificando SKU">
        <span className="sku-availability-spinner" />
        <span className="sku-availability-text">Verificando…</span>
      </span>
    )
  }

  if (disponible === null) return null

  return (
    <span
      className={`sku-availability ${disponible ? 'sku-availability-ok' : 'sku-availability-error'}`}
      role="status"
      aria-label={disponible ? 'SKU disponible' : 'SKU no disponible'}
    >
      <span className="sku-availability-icon">{disponible ? '✅' : '❌'}</span>
      <span className="sku-availability-text">
        {disponible ? 'Disponible' : 'Ya existe'}
      </span>
    </span>
  )
}