import { useEffect, useRef, useState } from 'react'

export type SortOption = { label: string; value: string }

export type SortDropdownProps = {
  value: string
  onChange: (value: string) => void
  options?: SortOption[]
  className?: string
}

const DEFAULT_OPTIONS: SortOption[] = [
  { label: 'Nombre A-Z', value: 'nombre ASC' },
  { label: 'Nombre Z-A', value: 'nombre DESC' },
  { label: 'Precio ↑', value: 'precio ASC' },
  { label: 'Precio ↓', value: 'precio DESC' },
]

/**
 * Dropdown reutilizable para ordenar resultados.
 * Opciones por defecto: Nombre A-Z, Z-A, Precio ↑, Precio ↓.
 */
export function SortDropdown({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  className,
}: SortDropdownProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value) ?? options[0]

  // Cerrar al presionar Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        listRef.current && !listRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className={`sort-dropdown${className ? ' ' + className : ''}`}>
      <button
        ref={buttonRef}
        type="button"
        className="sort-dropdown-btn"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected.label}</span>
        <span className="material-symbols-outlined" aria-hidden="true">
          arrow_drop_down
        </span>
      </button>
      {open && (
        <div ref={listRef} className="sort-dropdown-list" role="listbox">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`sort-dropdown-option${opt.value === value ? ' selected' : ''}`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              role="option"
              aria-selected={opt.value === value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
