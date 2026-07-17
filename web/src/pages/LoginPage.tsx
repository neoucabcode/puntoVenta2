import { useState } from 'react'
import { login } from '../lib/auth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      alert('Sesión iniciada. Falta redirigir al POS (Fase 2 en construcción).')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <main className="center">
      <form className="card" onSubmit={onSubmit}>
        <h1>PuntoVenta2</h1>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button type="submit">Entrar</button>
        <a href="/registro">Crear cuenta / empresa</a>
      </form>
    </main>
  )
}
