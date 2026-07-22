import { memo } from 'react'

type Props = {
  sku: string | null
  generando: boolean
}

export const SkuPreview = memo(function SkuPreview({ sku, generando }: Props) {
  if (generando) {
    return (
      <span className="sku-preview">
        <span className="badge warn">
          <span className="material-symbols-outlined">hourglass_top</span>
          SKU: …
        </span>
      </span>
    )
  }

  if (!sku) return null

  return (
    <span className="sku-preview">
      <span className="badge ok">
        <span className="material-symbols-outlined">tag</span>
        SKU: {sku}
      </span>
    </span>
  )
})
