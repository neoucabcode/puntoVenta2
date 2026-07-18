import { type ReactNode } from 'react'

export type Columna<T> = {
  /** Clave para ordenar/identificar. Si `render` no se da, usa row[key]. */
  key: string
  /** Texto del encabezado. */
  titulo: string
  /** Alineación: izquierda por defecto, 'right' para números. */
  align?: 'left' | 'right' | 'center'
  /** Clases extra en th/td (ej. para ancho o estilo). */
  className?: string
  /** Render custom de la celda. Recibe la fila y su índice. */
  render?: (row: T, i: number) => ReactNode
  /** No mostrar el encabezado (solo la celda). */
  hideHeader?: boolean
}

type Props<T> = {
  columnas: Columna<T>[]
  filas: T[]
  /** Clave única de cada fila. */
  rowKey: (row: T, i: number) => string
  /** Slot encima de la tabla (toolbar: buscador, filtros, acciones). */
  toolbar?: ReactNode
  /** Altura máxima del cuerpo scrolleable. Por defecto 60vh. */
  maxHeight?: string
  /** Mensaje cuando no hay filas. */
  empty?: ReactNode
  /** Filas inactivas (opacidad). Predicado opcional. */
  isInactivo?: (row: T) => boolean
  className?: string
  /** Nodo renderizado dentro del área scrolleable (ej. sentinel de scroll infinito). */
  after?: ReactNode
  /** Ref al contenedor scrolleable (para IntersectionObserver con root propio). */
  scrollRef?: React.Ref<HTMLDivElement>
}

/**
 * Tabla de datos reutilizable del design system.
 * - Encabezado sticky dentro de su propio contenedor scrolleable (no depende
 *   del scroll de la ventana, así funciona igual en cualquier módulo).
 * - `toolbar` es un slot para buscador/filtros/acciones, arriba de la tabla.
 * - Usa solo variables de tema (dark/light) — sin colores literales.
 */
export function DataTable<T>({
  columnas,
  filas,
  rowKey,
  toolbar,
  maxHeight = '60vh',
  empty = 'No hay datos',
  isInactivo,
  className,
  after,
  scrollRef,
}: Props<T>) {
  return (
    <div className={`dt${className ? ' ' + className : ''}`}>
      {toolbar}
      <div className="dt-scroll" ref={scrollRef} style={{ maxHeight }}>
        <table className="dt-table">
          <thead>
            <tr>
              {columnas.map((c) => (
                <th
                  key={c.key}
                  className={[
                    c.align === 'right' ? 'num' : '',
                    c.align === 'center' ? 'center' : '',
                    c.className ?? '',
                    c.hideHeader ? 'sr-only' : '',
                  ].join(' ')}
                >
                  {c.hideHeader ? '' : c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td className="dt-empty" colSpan={columnas.length}>
                  {empty}
                </td>
              </tr>
            ) : (
              filas.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  className={isInactivo?.(row) ? 'inactivo' : ''}
                >
                  {columnas.map((c) => (
                    <td
                      key={c.key}
                      className={[
                        c.align === 'right' ? 'num' : '',
                        c.align === 'center' ? 'center' : '',
                        c.className ?? '',
                      ].join(' ')}
                    >
                      {c.render ? c.render(row, i) : ((row as Record<string, ReactNode>)[c.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
        {after}
      </div>
    </div>
  )
}
