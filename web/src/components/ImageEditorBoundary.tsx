import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  onDismiss: () => void
}

interface State {
  hasError: boolean
}

export class ImageEditorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[ImageEditorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="modal-backdrop" onClick={this.props.onDismiss}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 400, padding: '1.5rem', textAlign: 'center' }}
          >
            <h2 style={{ marginBottom: '0.5rem' }}>Error al abrir el editor</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              No se pudo cargar la imagen para editar. Intentá con otra imagen o cerrá y volvé a intentar.
            </p>
            <button type="button" className="primary" onClick={this.props.onDismiss}>
              Cerrar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
