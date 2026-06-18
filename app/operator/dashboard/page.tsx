'use client'

import { useState, useEffect, useCallback } from 'react'
import { useOperator } from '../layout'
import { supabase, type Appointment } from '@/lib/supabase'

// ── Utils ────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function todayISO() {
  return new Date().toISOString().split('T')[0]
}
function formatToday() {
  return new Date().toLocaleDateString('es-DO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

// ── Status config ────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente',   cls: 'bg-amber-50 text-amber-700'  },
  confirmed: { label: 'Confirmado',  cls: 'bg-blue-50  text-blue-700'   },
  attended:  { label: 'Completado',  cls: 'bg-green-50 text-green-700'  },
  absent:    { label: 'No asistió',  cls: 'bg-red-50   text-red-700'    },
  cancelled: { label: 'Cancelado',   cls: 'bg-gray-100 text-gray-500'   },
}

export default function OperatorDashboard() {
  const { center } = useOperator()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading,      setLoading]      = useState(true)

  // ── Cargar citas de hoy ─────────────────────────────────────
  const loadAppointments = useCallback(async () => {
    if (!center?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('center_id', center.id)
      .eq('appointment_date', todayISO())
      .order('appointment_time', { ascending: true })
    if (!error) setAppointments(data ?? [])
    setLoading(false)
  }, [center?.id])

  useEffect(() => { loadAppointments() }, [loadAppointments])

  // ── Stats ───────────────────────────────────────────────────
  const total     = appointments.length
  const attended  = appointments.filter(a => a.status === 'attended').length
  const pending   = appointments.filter(a => ['pending','confirmed'].includes(a.status)).length
  const commission = attended * (center?.commission_rate ?? 300)

  // ── Marcar ausente ──────────────────────────────────────────
  const markAbsent = async (id: string) => {
    await supabase.from('appointments').update({ status: 'absent' }).eq('id', id)
    loadAppointments()
  }

  if (!center) return null

  return (
    <div className="p-5 lg:p-7 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Agenda del día</h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{formatToday()}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Citas hoy',      val: total,                color: 'teal'   },
          { label: 'Pendientes',     val: pending,              color: 'amber'  },
          { label: 'Completadas',    val: attended,             color: 'green'  },
          { label: 'Comisión hoy',   val: `RD$${commission.toLocaleString('es-DO')}`, color: 'blue' },
        ].map(s => (
          <div key={s.label} className={`card p-4 ${
            s.color === 'teal'  ? 'bg-teal-50  border-teal-100'  :
            s.color === 'amber' ? 'bg-amber-50 border-amber-100' :
            s.color === 'green' ? 'bg-green-50 border-green-200' :
                                  'bg-blue-50  border-blue-100'
          }`}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${
              s.color === 'teal'  ? 'text-teal-600'  :
              s.color === 'amber' ? 'text-amber-600' :
              s.color === 'green' ? 'text-green-600' :
                                    'text-blue-600'
            }`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Lista de citas */}
      <div className="card">
        <div className="card-header">
          <p className="font-semibold text-gray-900">Citas de hoy — {center.name}</p>
          <button onClick={loadAppointments}
            className="text-xs text-teal-600 hover:text-teal-800 transition-colors">
            ↻ Actualizar
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Cargando citas...</div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-sm text-gray-500">No hay citas agendadas para hoy</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {appointments.map(appt => {
              const st = STATUS_MAP[appt.status] ?? STATUS_MAP.pending
              return (
                <div key={appt.id}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">

                  {/* Hora */}
                  <div className="text-sm font-semibold text-gray-700 w-20 shrink-0">
                    {appt.appointment_time}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-xs font-bold text-teal-600 shrink-0">
                    {initials(appt.client_name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{appt.client_name}</p>
                    <p className="text-xs text-gray-500 font-mono">{appt.reference_code} · {appt.client_age} años</p>
                  </div>

                  {/* Status */}
                  <span className={`pill text-xs ${st.cls} hidden sm:inline-flex`}>
                    {st.label}
                  </span>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    {['pending', 'confirmed'].includes(appt.status) && (
                      <>
                        <a
                          href={`/operator/scan?code=${appt.reference_code}`}
                          className="bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap"
                        >
                          🔬 Registrar
                        </a>
                        <button
                          onClick={() => markAbsent(appt.id)}
                          className="text-xs text-gray-400 hover:text-red-600 transition-colors px-1"
                          title="Marcar como no asistió"
                        >
                          ✕
                        </button>
                      </>
                    )}
                    {appt.status === 'attended' && (
                      <span className="text-xs text-green-600 font-medium">✓ Listo</span>
                    )}
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Acceso rápido si no hay citas activas */}
      <div className="mt-4 p-4 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-teal-800">¿Tienes un cliente sin cita previa?</p>
          <p className="text-xs text-teal-600 mt-0.5">Busca su código o regístralo directamente.</p>
        </div>
        <a href="/operator/scan" className="btn-primary text-sm py-2 px-4 whitespace-nowrap">
          🔬 Registrar escáner
        </a>
      </div>

    </div>
  )
}
