import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export async function login(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function registro(
  email: string,
  password: string,
  nombre: string
): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre, rol: 'admin' } }
  })
  if (error) throw error
  if (!data.user) throw new Error('No se creó el usuario')
  return data.user
}

// Alta atómica empresa + admin vía RPC SECURITY DEFINER (ver patch_01).
// Debe llamarse ya con sesión iniciada (signUp deja al usuario logueado cuando
// "Confirm email" está desactivado). El RPC valida auth.uid() internamente.
export async function crearEmpresaConAdmin(
  nombreEmpresa: string,
  userId: string,
  nombreAdmin: string
): Promise<void> {
  const { error } = await supabase.rpc('crear_empresa_con_admin', {
    p_nombre_empresa: nombreEmpresa,
    p_auth_user_id: userId,
    p_nombre_admin: nombreAdmin,
  })
  if (error) throw error
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
