'use client'

import { useState, useEffect, useCallback } from 'react'
import { useOperator } from '../layout'
import { supabase } from '@/lib/supabase'

type Alert = {
  client_name:     string
  client_phone:    string
  reference_code:  string
  center_name:     string
  days_since_scan: number
  next_scan_due:   string
}

function initials(n: string) {
  return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function AlertsPage() {
  const { center } = useOperator()
  const [alerts,  setAlerts]  = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  const loadAlerts = useCallback(async () => {
    if (!center?.id) return
    setLoading(true)

    // Clientes de este centro con 28+ días desde el escáner
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 28)

    const { data } = await supabase
      .from('appointments')
      .select('client_name, client_phone, reference_code, scanned_at, next_scan_due')
      .eq('center_id', center.id)
      .eq('status', 'attended')
      .eq('plan_active', true)
      .lte('next_scan_due', new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString())
      .not('scanned_at', 'is', null)
      .order('next_scan_due', { ascending: true })

    const formatted = (data ?? []).map(a => ({
      client_name:     a.client_name,
      client_phone:    a.client_phone,
      reference_code:  a.reference_code,
      center_name:     center.name,
      days_since_scan: Math.floor((Date.now() - new Date(a.scanned_at).getTime()) / 86400000),
      next_scan_due:   a.next_scan_due,
    }))
    setAlerts(formatted)
    setLoading(false)
  }, [center])

  useEffect(() => { loadAlerts() }, [loadAlerts])

  // ── Mensaje de recordatorio ──────────────────────────────────
  const buildWAMsg = (alert: Alert) => {
    const firstName = alert.client_name.split(' ')[0]
    const msg =
      `Hola ${firstName}! 🌿 Han pasado ${alert.days_since_scan} días desde tu análisis de bienestar Aura Vital (código: ${alert.reference_code}).\n\n` +
      `Es el momento ideal para tu reevaluación y medir tu progreso. ` +
      `¿Quieres agendar tu próxima cita?\n\n` +
      `👉 Agenda aquí: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://auravital.lat'}\n\n` +
      `¡Estamos para ayudarte a seguir avanzando en tu bienestar! 💪`
    return `https://wa.me/${alert.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
  }

  const overdue  = alerts.filter(a => a.days_since_scan > 32)
  const upcoming = alerts.filter(a => a.days_since_scan <= 32)

  return (
    <div className="p-5 lg:p-7 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Alertas de reescaneo</h1>
        <p className="text-sm text-gray-500 mt-0.5">Clientes que cumplen 30 días desde su análisis.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 bg-amber-50 border-amber-100">
          <p className="text-xs text-gray-500 mb-1">En ventana</p>
          <p className="text-2xl font-bold text-amber-600">{upcoming.length}</p>
          <p className="text-xs text-gray-400">28-32 días</p>
        </div>
        <div className="card p-4 bg-red-50 border-red-100">
          <p className="text-xs text-gray-500 mb-1">Vencidos</p>
          <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
          <p className="text-xs text-gray-400">+32 días</p>
        </div>
        <div className="card p-4 bg-teal-50 border-teal-100">
          <p className="text-xs text-gray-500 mb-1">Total alertas</p>
          <p className="text-2xl font-bold text-teal-600">{alerts.length}</p>
          <p className="text-xs text-gray-400">Este mes</p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Cargando alertas...</div>
      ) : alerts.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-sm font-medium text-gray-700">Sin alertas pendientes</p>
          <p className="text-xs text-gray-400 mt-1">Todos tus clientes están al día con su seguimiento.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Vencidos primero */}
          {overdue.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-2">
                ⚠️ Vencidos — +32 días sin reevaluación
              </p>
              <div className="card divide-y divide-gray-100">
                {overdue.map(a => (
                  <AlertRow key={a.reference_code} alert={a} waUrl={buildWAMsg(a)} overdue />
                ))}
              </div>
            </div>
          )}

          {/* En ventana */}
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-2">
                🔔 En ventana — 28-32 días
              </p>
              <div className="card divide-y divide-gray-100">
                {upcoming.map(a => (
                  <AlertRow key={a.reference_code} alert={a} waUrl={buildWAMsg(a)} />
                ))}
              </div>
            </div>
          )}

          {/* Recordar a todos */}
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
            <p className="text-sm font-medium text-teal-800 mb-1">Recordar a todos</p>
            <p className="text-xs text-teal-600 mb-3">
              Abre los chats de WhatsApp de cada cliente para enviar recordatorios individualmente.
            </p>
            <div className="flex flex-wrap gap-2">
              {alerts.map(a => (
                <a key={a.reference_code}
                  href={buildWAMsg(a)} target="_blank" rel="noreferrer"
                  className="text-xs bg-white border border-teal-200 rounded-lg px-2.5 py-1.5 text-teal-700 hover:bg-teal-100 transition-colors">
                  💬 {a.client_name.split(' ')[0]}
                </a>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// ── Componente fila de alerta ────────────────────────────────
function AlertRow({ alert, waUrl, overdue = false }: {
  alert: Alert; waUrl: string; overdue?: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
      <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-xs font-bold text-teal-600 shrink-0">
        {initials(alert.client_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{alert.client_name}</p>
        <p className="text-xs text-gray-500 font-mono">{alert.reference_code}</p>
      </div>
      <span className={`pill text-xs shrink-0 ${
        overdue ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
      }`}>
        {alert.days_since_scan} días
      </span>
      <a href={waUrl} target="_blank" rel="noreferrer"
        className="bg-[#25D366] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#1da851] transition-colors whitespace-nowrap shrink-0">
        💬 Recordar
      </a>
    </div>
  )
}
