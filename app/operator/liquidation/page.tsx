'use client'

import { useState, useEffect, useCallback } from 'react'
import { useOperator } from '../layout'
import { supabase, getLiquidationsByCenter, confirmLiquidation, type Liquidation } from '@/lib/supabase'
import type { Appointment } from '@/lib/supabase'

function todayISO() { return new Date().toISOString().split('T')[0] }
function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-DO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function LiquidationPage() {
  const { center } = useOperator()
  const [todayAppts,    setTodayAppts]    = useState<Appointment[]>([])
  const [liquidations,  setLiquidations]  = useState<Liquidation[]>([])
  const [confirming,    setConfirming]    = useState(false)
  const [confirmed,     setConfirmed]     = useState(false)
  const [loading,       setLoading]       = useState(true)

  const loadData = useCallback(async () => {
    if (!center?.id) return
    setLoading(true)

    // Citas de hoy
    const { data: appts } = await supabase
      .from('appointments')
      .select('*')
      .eq('center_id', center.id)
      .eq('appointment_date', todayISO())
      .order('appointment_time')

    // Historial de liquidaciones
    const liq = await getLiquidationsByCenter(center.id)

    setTodayAppts(appts ?? [])
    setLiquidations(liq)
    setLoading(false)

    // Verificar si hoy ya se confirmó
    const todayLiq = liq.find(l => l.liquidation_date === todayISO())
    if (todayLiq?.status === 'confirmed') setConfirmed(true)
  }, [center?.id])

  useEffect(() => { loadData() }, [loadData])

  // ── Calcular totales de hoy ──────────────────────────────────
  const attended   = todayAppts.filter(a => a.status === 'attended')
  const totalToday = attended.reduce((s, a) => s + (a.commission_amount ?? 300), 0)
  const todayLiq   = liquidations.find(l => l.liquidation_date === todayISO())

  // ── Confirmar transferencia ──────────────────────────────────
  const handleConfirm = async () => {
    if (!todayLiq || !center) return
    setConfirming(true)

    // 1. Confirmar en BD
    await confirmLiquidation(todayLiq.id, center.operator_name)

    // 2. Abrir WhatsApp con mensaje de confirmación
    const msg =
      `✅ Confirmación de transferencia — Aura Vital\n\n` +
      `Centro: ${center.name}\n` +
      `Fecha: ${formatDate(todayISO())}\n` +
      `Clientes atendidos: ${attended.length}\n` +
      `Monto transferido: RD$${totalToday.toLocaleString('es-DO')}\n\n` +
      `Por favor confirmen la recepción. ¡Gracias! 🙏`

    const waUrl = `https://wa.me/${process.env.NEXT_PUBLIC_WA_CENTRAL ?? '18095550000'}?text=${encodeURIComponent(msg)}`
    window.open(waUrl, '_blank')

    setConfirmed(true)
    setConfirming(false)
    loadData()
  }

  if (!center) return null

  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'Pendiente',  cls: 'bg-amber-50 text-amber-700' },
    confirmed: { label: 'Confirmada', cls: 'bg-green-50 text-green-700' },
    attended:  { label: 'Completado', cls: 'bg-green-50 text-green-700' },
    absent:    { label: 'No asistió', cls: 'bg-red-50   text-red-700'   },
  }

  return (
    <div className="p-5 lg:p-7 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Liquidación diaria</h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{formatDate(todayISO())}</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Cargando liquidación...</div>
      ) : (
        <div className="space-y-5">

          {/* Resumen del día */}
          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-teal-700 font-medium mb-1">Total comisiones del día</p>
              <p className="text-4xl font-black text-teal-600">
                RD${totalToday.toLocaleString('es-DO')}
              </p>
              <p className="text-xs text-teal-500 mt-1">
                {attended.length} clientes × RD${center.commission_rate ?? 300}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-teal-600 mb-1">Transferir a:</p>
              <p className="text-sm font-bold text-teal-800">Cuenta Aura Vital</p>
              <p className="text-xs text-teal-500">Consulta los datos con el administrador</p>
            </div>
          </div>

          {/* Tabla detalle */}
          <div className="card overflow-x-auto">
            <div className="card-header">
              <p className="font-semibold text-gray-900">Detalle de atenciones del día</p>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 border-b border-gray-200 uppercase tracking-wide">Hora</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 border-b border-gray-200 uppercase tracking-wide">Cliente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 border-b border-gray-200 uppercase tracking-wide">Código</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 border-b border-gray-200 uppercase tracking-wide">Estado</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3 border-b border-gray-200 uppercase tracking-wide">Comisión</th>
                </tr>
              </thead>
              <tbody>
                {todayAppts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 text-sm py-10">No hay citas registradas hoy</td>
                  </tr>
                ) : (
                  todayAppts.map(a => {
                    const st = STATUS_MAP[a.status] ?? STATUS_MAP.pending
                    const com = a.status === 'attended' ? (a.commission_amount ?? 300) : 0
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                        <td className="px-5 py-3.5 font-medium text-gray-700">{a.appointment_time}</td>
                        <td className="px-5 py-3.5 text-gray-900">{a.client_name}</td>
                        <td className="px-5 py-3.5 font-mono text-teal-600 text-xs">{a.reference_code}</td>
                        <td className="px-5 py-3.5">
                          <span className={`pill text-xs ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold">
                          {com > 0
                            ? <span className="text-green-700">RD${com}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    )
                  })
                )}
                {/* Total */}
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={4} className="px-5 py-3.5 text-right font-bold text-gray-900">
                    Total a transferir hoy
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-green-700">
                    RD${totalToday.toLocaleString('es-DO')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Botón de confirmación */}
          {totalToday > 0 && (
            <div className="card">
              <div className="card-body space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Al confirmar, el sistema registra el pago y abre WhatsApp para que envíes el comprobante directamente a Aura Vital. El administrador recibirá la notificación automáticamente.
                </p>
                {confirmed || todayLiq?.status === 'confirmed' ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="text-sm font-semibold text-green-800">Transferencia confirmada</p>
                      <p className="text-xs text-green-700 mt-0.5">
                        El pago de hoy fue registrado exitosamente.
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleConfirm}
                    disabled={confirming || attended.length === 0}
                    className="btn-primary w-full justify-center py-3.5"
                  >
                    {confirming ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Confirmando...
                      </span>
                    ) : `💳 Confirmar transferencia del día — RD$${totalToday.toLocaleString('es-DO')}`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Historial de liquidaciones */}
          {liquidations.length > 0 && (
            <div className="card">
              <div className="card-header">
                <p className="font-semibold text-gray-900">Historial reciente</p>
              </div>
              <div className="divide-y divide-gray-100">
                {liquidations.slice(0, 10).map(liq => (
                  <div key={liq.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {formatDate(liq.liquidation_date)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {liq.total_attended} clientes
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className={`pill text-xs ${liq.status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {liq.status === 'confirmed' ? 'Pagado' : 'Pendiente'}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        RD${liq.total_amount.toLocaleString('es-DO')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
