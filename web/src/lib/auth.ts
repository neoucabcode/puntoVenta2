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
