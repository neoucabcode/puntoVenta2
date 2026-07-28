import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ConfirmModal } from './ConfirmModal'

describe('ConfirmModal', () => {
  it('renderiza titulo y mensaje', () => {
    const html = renderToStaticMarkup(
      <ConfirmModal
        titulo="Confirmar acción"
        mensaje="¿Deseas continuar?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(html).toContain('Confirmar acción')
    expect(html).toContain('¿Deseas continuar?')
  })

  it('muestra texto de confirmar personalizado', () => {
    const html = renderToStaticMarkup(
      <ConfirmModal
        titulo="Aviso"
        mensaje="Mensaje"
        textoConfirmar="Entendido"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(html).toContain('Entendido')
  })

  it('muestra texto de confirmar por defecto', () => {
    const html = renderToStaticMarkup(
      <ConfirmModal
        titulo="Aviso"
        mensaje="Mensaje"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(html).toContain('Confirmar')
  })

  it('muestra botón de cancelar', () => {
    const html = renderToStaticMarkup(
      <ConfirmModal
        titulo="Test"
        mensaje="Mensaje"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(html).toContain('Cancelar')
  })

  it('muestra botón de confirmar', () => {
    const html = renderToStaticMarkup(
      <ConfirmModal
        titulo="Test"
        mensaje="Mensaje"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    // El botón de confirmar tiene la clase "primary"
    expect(html).toContain('class="primary"')
  })

  it('no usa window.confirm', () => {
    const spy = vi.spyOn(window, 'confirm')
    renderToStaticMarkup(
      <ConfirmModal
        titulo="Test"
        mensaje="Mensaje"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
