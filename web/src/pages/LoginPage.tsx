import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/auth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/')
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
