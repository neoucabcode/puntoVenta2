import { useState } from 'react'
import { registro } from '../lib/auth'
import { crearEmpresa } from '../lib/empresa'

export function RegistroPage() {
  const [nombreEmpresa, setNombreEmpresa] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setOk('')
    try {
      const user = await registro(email, password, 'Admin')
      const empresa = await crearEmpresa(nombreEmpresa)
      // Relacionar usuario con empresa vía metadata (el trigger crea la fila)
      // Nota: en MVP el alta de la relación requiere script/Edge Function (Fase 4).
      setOk(`Empresa "${empresa.nombre}" creada. Usuario: ${user.email}`)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <main className="center">
      <form className="card" onSubmit={onSubmit}>
        <h1>Alta de ferretería</h1>
        <input placeholder="Nombre de la ferretería" value={nombreEmpresa} onChange={(e) => setNombreEmpresa(e.target.value)} />
        <input placeholder="Email admin" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        {ok && <p className="ok">{ok}</p>}
        <button type="submit">Crear</button>
        <a href="/login">Ya tengo cuenta</a>
      </form>
    </main>
  )
}
