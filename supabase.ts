import { createClient } from '@supabase/supabase-js'

// ── Tipos ────────────────────────────────────────────────────

export type Center = {
  id: string
  name: string
  province: string
  address?: string
  operator_name: string
  whatsapp: string
  email?: string
  schedule?: string
  status: 'active' | 'paused' | 'inactive'
  commission_rate: number
  created_at: string
}

export type Appointment = {
  id: string
  reference_code: string
  center_id: string
  client_name: string
  client_phone: string
  client_age?: number
  client_email?: string
  appointment_date: string
  appointment_time: string
  province: string
  status: 'pending' | 'confirmed' | 'attended' | 'absent' | 'cancelled'
  commission_paid: boolean
  commission_amount: number
  scanned_at?: string
  next_scan_due?: string
  plan_active: boolean
  created_at: string
  // join
  centers?: Center
}

export type Report = {
  id: string
  appointment_id: string
  center_id: string
  attention_areas: string[]
  supplements: { name: string; dose: string }[]
  operator_notes?: string
  ai_plan?: {
    summary: string
    nutrition: string[]
    exercise: string[]
    products: string[]
  }
  ai_generated_at?: string
  infographic_url?: string
  share_token: string
  plan_start_date?: string
  plan_end_date?: string
  created_at: string
}

export type Liquidation = {
  id: string
  center_id: string
  liquidation_date: string
  total_attended: number
  total_amount: number
  status: 'pending' | 'confirmed' | 'disputed'
  confirmed_at?: string
  centers?: Center
}

export type AppEvent = {
  id: string
  name: string
  city: string
  province: string
  event_date: string
  location?: string
  capacity: number
  status: 'planned' | 'active' | 'completed' | 'cancelled'
}

// ── Cliente Supabase ─────────────────────────────────────────

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnon)

// ── CENTROS ──────────────────────────────────────────────────

export async function getActiveCenters(): Promise<Center[]> {
  const { data, error } = await supabase
    .from('centers')
    .select('*')
    .eq('status', 'active')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function getCentersByProvince(province: string): Promise<Center[]> {
  const { data, error } = await supabase
    .from('centers')
    .select('*')
    .eq('province', province)
    .eq('status', 'active')
  if (error) throw error
  return data ?? []
}

export async function getAllCenters(): Promise<Center[]> {
  const { data, error } = await supabase
    .from('centers')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ── CITAS ────────────────────────────────────────────────────

export async function createAppointment(payload: {
  center_id: string
  client_name: string
  client_phone: string
  client_age: number
  client_email?: string
  appointment_date: string
  appointment_time: string
  province: string
}): Promise<Appointment> {
  // Generar código único desde Supabase
  const { data: codeData, error: codeErr } = await supabase
    .rpc('generate_reference_code')
  if (codeErr) throw codeErr

  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...payload, reference_code: codeData })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAppointmentByCode(code: string): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, centers(*)')
    .eq('reference_code', code.toUpperCase())
    .single()
  if (error) return null
  return data
}

export async function getAppointmentsByCenter(
  centerId: string,
  date: string
): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('center_id', centerId)
    .eq('appointment_date', date)
    .order('appointment_time')
  if (error) throw error
  return data ?? []
}

export async function markAppointmentAttended(
  appointmentId: string
): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'attended' })
    .eq('id', appointmentId)
  if (error) throw error
}

// ── REPORTES ─────────────────────────────────────────────────

export async function createReport(payload: {
  appointment_id: string
  center_id: string
  attention_areas: string[]
  supplements: { name: string; dose: string }[]
  operator_notes?: string
  ai_plan?: object
}): Promise<Report> {
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + 90)

  const { data, error } = await supabase
    .from('reports')
    .insert({
      ...payload,
      ai_generated_at: payload.ai_plan ? new Date().toISOString() : null,
      plan_start_date: today.toISOString().split('T')[0],
      plan_end_date:   endDate.toISOString().split('T')[0],
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getReportByShareToken(token: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('*, appointments(client_name, appointment_date)')
    .eq('share_token', token)
    .single()
  if (error) return null
  return data
}

// ── LIQUIDACIONES ────────────────────────────────────────────

export async function getLiquidationsByCenter(centerId: string): Promise<Liquidation[]> {
  const { data, error } = await supabase
    .from('liquidations')
    .select('*')
    .eq('center_id', centerId)
    .order('liquidation_date', { ascending: false })
    .limit(30)
  if (error) throw error
  return data ?? []
}

export async function getAllPendingLiquidations(): Promise<Liquidation[]> {
  const { data, error } = await supabase
    .from('liquidations')
    .select('*, centers(name, province, operator_name, whatsapp)')
    .eq('status', 'pending')
    .order('liquidation_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function confirmLiquidation(
  liquidationId: string,
  confirmedBy: string
): Promise<void> {
  const { error } = await supabase
    .from('liquidations')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: confirmedBy,
    })
    .eq('id', liquidationId)
  if (error) throw error
}

// ── ALERTAS 30 DÍAS ──────────────────────────────────────────

export async function getRescanAlerts() {
  const { data, error } = await supabase.rpc('get_rescan_alerts')
  if (error) throw error
  return data ?? []
}

// ── MÉTRICAS ADMIN ───────────────────────────────────────────

export async function getMonthlyStats(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2,'0')}-01`
  const to   = `${year}-${String(month).padStart(2,'0')}-31`

  const { data, error } = await supabase
    .from('appointments')
    .select('status, commission_amount, center_id')
    .gte('appointment_date', from)
    .lte('appointment_date', to)
  if (error) throw error

  const attended = (data ?? []).filter(a => a.status === 'attended')
  const totalRevenue = attended.reduce((s, a) => s + (a.commission_amount ?? 300), 0)

  return {
    total:       (data ?? []).length,
    attended:    attended.length,
    revenue:     totalRevenue,
    month, year,
  }
}
