import { useState } from 'react'
import { registro, crearEmpresaConAdmin } from '../lib/auth'

export function RegistroPage() {
  const [nombreEmpresa, setNombreEmpresa] = useState('')
  const [nombreAdmin, setNombreAdmin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setOk('')
    try {
      // 1) Crear usuario de auth (queda logueado si "Confirm email" está off).
      const user = await registro(email, password, nombreAdmin || 'Admin')
      // 2) Alta atómica empresa + admin vía RPC (reemplaza el flujo roto de
      //    crearEmpresa() suelto, que fallaba por RLS sin usuario vinculado).
      await crearEmpresaConAdmin(nombreEmpresa, user.id, nombreAdmin || 'Admin')
      setOk(`Empresa "${nombreEmpresa}" creada. Ya podés iniciar sesión.`)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <main className="center">
      <form className="card" onSubmit={onSubmit}>
        <h1>Alta de ferretería</h1>
        <input placeholder="Nombre de la ferretería" value={nombreEmpresa} onChange={(e) => setNombreEmpresa(e.target.value)} />
        <input placeholder="Tu nombre" value={nombreAdmin} onChange={(e) => setNombreAdmin(e.target.value)} />
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
