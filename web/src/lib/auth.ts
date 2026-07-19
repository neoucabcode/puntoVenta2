import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import {
  loginMock,
  registroMock,
  logoutMock,
  crearEmpresaConAdminMock,
} from './mock-data'

export async function login(email: string, password: string): Promise<User> {
  if (!supabase) {
    return loginMock(email, password)
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function registro(
  email: string,
  password: string,
  nombre: string
): Promise<User> {
  if (!supabase) {
    return registroMock(email, password, nombre)
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre, rol: 'admin' } }
  })
  if (error) throw error
  if (!data.user) throw new Error('No se creó el usuario')
  return data.user
}

export async function crearEmpresaConAdmin(
  nombreEmpresa: string,
  userId: string,
  nombreAdmin: string
): Promise<void> {
  if (!supabase) {
    await crearEmpresaConAdminMock(nombreEmpresa, userId, nombreAdmin)
    return
  }
  const { error } = await supabase.rpc('crear_empresa_con_admin', {
    p_nombre_empresa: nombreEmpresa,
    p_auth_user_id: userId,
    p_nombre_admin: nombreAdmin,
  })
  if (error) throw error
}

export async function logout(): Promise<void> {
  if (!supabase) {
    await logoutMock()
    return
  }
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
