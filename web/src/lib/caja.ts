// caja.ts — sesión de caja por dispositivo (REQ-1).
//
// La caja es OPCIONAL (RN-53): si el admin la deshabilita (caja_obligatoria=false)
// o no hay cliente Supabase, la app vende igual en modo "sin caja" y devuelve null.
// El device_id es local (crypto.randomUUID persistido en localStorage).
// numeric de Postgres se maneja como string en los inserts.

import { supabase } from './supabase'
import { obtenerMiEmpresaId, obtenerMiEmpresa } from './empresa'

const DEVICE_KEY = 'pv-device-id'

export interface SesionCaja {
  id: string
  empresa_id: string
  dispositivo: string
  estado: 'abierta' | 'cerrada'
  saldo_inicial: string
  abre_at: string
  cierre_at: string | null
  conteo_ventas: number
  total_ventas_usd: string
  creado_en: string
}

function generarId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ID local de dispositivo, estable entre sesiones (REQ-1).
export function getDeviceId(): string {
  if (typeof localStorage === 'undefined') return 'server'
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = generarId()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

// Indica si la caja está habilitada por el admin (RN-53): caja_obligatoria=true.
export async function cajaHabilitada(): Promise<boolean> {
  const emp = await obtenerMiEmpresa()
  return emp?.caja_obligatoria ?? false
}

// Abre caja para este dispositivo. Devuelve null si la caja está deshabilitada
// o no hay cliente Supabase (modo sin caja, RN-53).
export async function abrirCaja(saldoInicial: string): Promise<SesionCaja | null> {
  if (!supabase) return null
  const habilitada = await cajaHabilitada()
  if (!habilitada) return null
  const empresaId = await obtenerMiEmpresaId()
  if (!empresaId) return null
  const { data, error } = await supabase
    .from('sesion_caja')
    .insert({
      empresa_id: empresaId,
      dispositivo: getDeviceId(),
      estado: 'abierta',
      saldo_inicial: saldoInicial,
    })
    .select()
    .single()
  if (error) throw error
  return data as SesionCaja
}

// Cierra la caja activa (cierre de turno).
export async function cerrarCaja(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('sesion_caja')
    .update({ estado: 'cerrada', cierre_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ¿Hay una sesión de caja abierta en este dispositivo? (REQ-2: solo-lectura)
export async function hayCajaAbierta(dispositivo: string): Promise<boolean> {
  return (await obtenerCajaActual(dispositivo)) !== null
}

// Devuelve la sesión de caja abierta del dispositivo, o null si no hay.
export async function obtenerCajaActual(dispositivo: string): Promise<SesionCaja | null> {
  if (!supabase) return null
  const empresaId = await obtenerMiEmpresaId()
  if (!empresaId) return null
  const { data, error } = await supabase
    .from('sesion_caja')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('dispositivo', dispositivo)
    .eq('estado', 'abierta')
    .order('abre_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return (data as SesionCaja) ?? null
}
