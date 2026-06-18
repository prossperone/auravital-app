'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useOperator } from '../layout'
import { supabase, getAppointmentByCode, type Appointment } from '@/lib/supabase'

// ── Áreas de atención ────────────────────────────────────────
const AREAS = [
  { icon: '🫀', label: 'Sistema cardiovascular' },
  { icon: '🍽', label: 'Sistema digestivo'      },
  { icon: '⚡', label: 'Energía celular'         },
  { icon: '🧠', label: 'Memoria y concentración' },
  { icon: '🦴', label: 'Sistema óseo'            },
  { icon: '🫁', label: 'Sistema respiratorio'    },
  { icon: '🧬', label: 'Metabolismo basal'       },
  { icon: '💧', label: 'Función renal'           },
  { icon: '🍀', label: 'Función hepática'        },
  { icon: '🌿', label: 'Bienestar hormonal'      },
  { icon: '🛡', label: 'Sistema inmune'          },
  { icon: '🌸', label: 'Estrés oxidativo'        },
  { icon: '💊', label: 'Absorción de vitaminas'  },
  { icon: '⚗️', label: 'Niveles de minerales'   },
  { icon: '🧴', label: 'Colágeno y piel'         },
  { icon: '😴', label: 'Calidad del sueño'       },
]

// ── Suplementos con dosis ────────────────────────────────────
const SUPPLEMENTS = [
  { name: 'Vitamina D3',          dose: '5,000 UI · 1 vez al día con comida'    },
  { name: 'Magnesio Glicinato',   dose: '400 mg · Antes de dormir'              },
  { name: 'Omega-3',              dose: '2 cápsulas · Con el almuerzo'          },
  { name: 'Vitamina C',           dose: '1,000 mg · 2 veces al día'            },
  { name: 'Probióticos',          dose: '1 cápsula · En ayunas'                },
  { name: 'Zinc',                 dose: '25 mg · 1 vez al día con comida'      },
  { name: 'Complejo B',           dose: '1 cápsula · En la mañana'             },
  { name: 'Coenzima Q10',         dose: '100 mg · Con desayuno'                },
  { name: 'Colágeno Hidrolizado', dose: '1 sobre · En agua por la mañana'      },
  { name: 'Hierro Quelado',       dose: '25 mg · En ayunas'                    },
  { name: 'Ashwagandha',          dose: '600 mg · Antes de dormir'             },
  { name: 'Cúrcuma + Pimienta',   dose: '1 cápsula · Con comida'               },
]

// ── Tipos ────────────────────────────────────────────────────
type AiPlan = {
  summary:    string
  nutrition:  string[]
  exercise:   string[]
  products:   string[]
  next_steps: string
}

type Step = 'search' | 'form' | 'preview'

export default function ScanPage() {
  const { center } = useOperator()
  const searchParams = useSearchParams()

  const [step,        setStep]       = useState<Step>('search')
  const [searchCode,  setSearchCode] = useState('')
  const [searchErr,   setSearchErr]  = useState('')
  const [appointment, setAppt]       = useState<Appointment | null>(null)

  // Formulario
  const [areas,    setAreas]   = useState<string[]>([])
  const [supps,    setSupps]   = useState<string[]>([])
  const [notes,    setNotes]   = useState('')

  // Generación
  const [generating, setGenerating] = useState(false)
  const [genError,   setGenError]   = useState('')
  const [aiPlan,     setAiPlan]     = useState<AiPlan | null>(null)
  const [shareToken, setShareToken] = useState('')

  // Si viene código desde la agenda (/operator/scan?code=AV-2024-XXXXX)
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) { setSearchCode(code); handleSearch(code) }
  }, [])

  // ── Buscar cita por código ──────────────────────────────────
  const handleSearch = async (code?: string) => {
    const c = (code ?? searchCode).trim().toUpperCase()
    if (!c) { setSearchErr('Ingresa un código de referencia.'); return }
    setSearchErr('')

    const appt = await getAppointmentByCode(c)
    if (!appt) { setSearchErr('Código no encontrado. Verifica el número.'); return }
    if (appt.status === 'attended') {
      setSearchErr('Este cliente ya fue atendido y tiene su infografía generada.')
      return
    }
    // Verificar que pertenece a este centro
    if (appt.center_id !== center?.id) {
      setSearchErr('Este código pertenece a otro centro.')
      return
    }
    setAppt(appt)
    setStep('form')
  }

  // ── Toggle área / suplemento ────────────────────────────────
  const toggleArea = (label: string) =>
    setAreas(prev => prev.includes(label) ? prev.filter(a => a !== label) : [...prev, label])

  const toggleSupp = (name: string) =>
    setSupps(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])

  // ── Generar infografía + plan IA ────────────────────────────
  const handleGenerate = async () => {
    if (areas.length === 0) { setGenError('Selecciona al menos un área de atención.'); return }
    if (supps.length === 0) { setGenError('Selecciona al menos un suplemento.'); return }
    setGenError('')
    setGenerating(true)

    try {
      const supplements = SUPPLEMENTS.filter(s => supps.includes(s.name))
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id:  appointment!.id,
          center_id:       center!.id,
          attention_areas: areas,
          supplements,
          operator_notes:  notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAiPlan(data.ai_plan)
      setShareToken(data.share_token)
      setStep('preview')
    } catch (err: any) {
      setGenError(err.message ?? 'Error al generar la infografía. Intenta de nuevo.')
    } finally {
      setGenerating(false)
    }
  }

  // ── URL de WhatsApp con infografía ──────────────────────────
  const buildWAMsg = () => {
    if (!appointment || !aiPlan) return '#'
    const firstName = appointment.client_name.split(' ')[0]
    const suppNames = supps.join(', ')
    const areaNames = areas.join(', ')
    const planUrl   = `${process.env.NEXT_PUBLIC_APP_URL}/plan/${shareToken}`

    const msg = `Hola ${firstName}! 🌿 Aquí están los resultados de tu análisis de bienestar Aura Vital (código: ${appointment.reference_code}).

*Áreas de atención identificadas:*
${areaNames}

*Tu plan personalizado incluye:*
${aiPlan.summary}

*Suplementos recomendados:*
${suppNames}

👉 Ve tu plan completo aquí: ${planUrl}

⚠️ Recuerda: este análisis no sustituye un diagnóstico médico. ¡Nos vemos en 30 días para tu reevaluación! 💪`

    return `https://wa.me/${appointment.client_phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`
  }

  // ── Reset ───────────────────────────────────────────────────
  const reset = () => {
    setStep('search'); setSearchCode(''); setSearchErr('')
    setAppt(null); setAreas([]); setSupps([]); setNotes('')
    setAiPlan(null); setShareToken(''); setGenError('')
  }

  // ════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="p-5 lg:p-7 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Registrar escáner</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ingresa el código del cliente para comenzar.</p>
      </div>

      {/* ── PASO 1: BÚSQUEDA ── */}
      {step === 'search' && (
        <div className="card">
          <div className="card-header">
            <p className="font-semibold text-gray-900">Buscar cliente por código</p>
          </div>
          <div className="card-body">
            <p className="text-sm text-gray-500 mb-4">
              Ingresa el código de referencia único que el cliente recibió al agendar.
            </p>
            <div className="flex gap-3 max-w-md">
              <input
                type="text"
                className="form-input font-mono uppercase"
                placeholder="AV-2024-52318"
                value={searchCode}
                onChange={e => setSearchCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={() => handleSearch()} className="btn-primary whitespace-nowrap">
                Buscar
              </button>
            </div>
            {searchErr && (
              <p className="text-sm text-red-600 mt-3">⚠️ {searchErr}</p>
            )}
          </div>
        </div>
      )}

      {/* ── PASO 2: FORMULARIO ESCÁNER ── */}
      {step === 'form' && appointment && (
        <div className="space-y-5">

          {/* Banner cliente */}
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-teal-400 flex items-center justify-center text-white font-bold shrink-0">
              {appointment.client_name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-teal-900">{appointment.client_name}</p>
              <p className="text-sm text-teal-600">{appointment.client_age} años · {appointment.appointment_time}</p>
            </div>
            <div className="bg-white border border-teal-200 rounded-lg px-3 py-1.5 font-mono text-sm font-bold text-teal-600">
              {appointment.reference_code}
            </div>
          </div>

          {/* Áreas de atención */}
          <div className="card">
            <div className="card-header">
              <p className="font-semibold text-gray-900">Áreas que necesitan atención</p>
              <span className="text-xs text-gray-400">{areas.length} seleccionadas</span>
            </div>
            <div className="card-body">
              <p className="text-xs text-gray-500 mb-3">Selecciona todas las que apliquen según los resultados del escáner.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AREAS.map(a => (
                  <label key={a.label}
                    className={`flex items-center gap-2 p-2.5 border-[1.5px] rounded-lg cursor-pointer transition-all text-sm ${
                      areas.includes(a.label)
                        ? 'border-teal-400 bg-teal-50 text-teal-800'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}>
                    <input type="checkbox" className="sr-only"
                      checked={areas.includes(a.label)}
                      onChange={() => toggleArea(a.label)} />
                    <span>{a.icon}</span>
                    <span className="text-xs leading-tight">{a.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Suplementos */}
          <div className="card">
            <div className="card-header">
              <p className="font-semibold text-gray-900">Suplementos recomendados</p>
              <span className="text-xs text-gray-400">{supps.length} seleccionados</span>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUPPLEMENTS.map(s => (
                  <label key={s.name}
                    className={`flex items-start gap-2.5 p-3 border-[1.5px] rounded-lg cursor-pointer transition-all ${
                      supps.includes(s.name)
                        ? 'border-teal-400 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <input type="checkbox" className="mt-0.5 accent-teal-600"
                      checked={supps.includes(s.name)}
                      onChange={() => toggleSupp(s.name)} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.dose}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div className="card">
            <div className="card-header">
              <p className="font-semibold text-gray-900">Observaciones del operador</p>
              <span className="text-xs text-gray-400">Opcional</span>
            </div>
            <div className="card-body">
              <textarea
                className="form-input resize-y min-h-[80px]"
                placeholder="Notas adicionales, recomendaciones especiales, próximos pasos..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Error */}
          {genError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              ⚠️ {genError}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Generando plan con IA...
                </span>
              ) : '📊 Generar infografía y plan IA'}
            </button>
            <button onClick={reset} className="btn-secondary">← Cancelar</button>
          </div>

        </div>
      )}

      {/* ── PASO 3: VISTA PREVIA INFOGRAFÍA ── */}
      {step === 'preview' && appointment && aiPlan && (
        <div className="space-y-5">

          {/* Infografía */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #04342C 0%, #063d2e 100%)' }}>
            <div className="p-6">
              {/* Header infografía */}
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-white/10">
                <div>
                  <p className="text-xs font-bold text-teal-200 tracking-widest uppercase mb-1">AURA VITAL</p>
                  <p className="text-xl font-bold text-white">{appointment.client_name}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    Análisis: {new Date().toLocaleDateString('es-DO', { day:'numeric', month:'long', year:'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/30 mb-1">Código de referencia</p>
                  <p className="text-sm font-bold text-teal-200 font-mono">{appointment.reference_code}</p>
                </div>
              </div>

              {/* Resumen IA */}
              <div className="mb-5">
                <p className="text-[10px] font-bold text-teal-200 uppercase tracking-widest mb-2">Resumen de bienestar</p>
                <p className="text-sm text-white/80 leading-relaxed">{aiPlan.summary}</p>
              </div>

              {/* Áreas */}
              <div className="mb-5">
                <p className="text-[10px] font-bold text-teal-200 uppercase tracking-widest mb-2">Áreas de atención</p>
                <div className="flex flex-wrap gap-2">
                  {areas.map(a => (
                    <span key={a} className="bg-white/10 border border-white/15 rounded-full px-3 py-1 text-xs text-white/80">
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              {/* Suplementos */}
              <div className="mb-5">
                <p className="text-[10px] font-bold text-teal-200 uppercase tracking-widest mb-2">Suplementos recomendados</p>
                <div className="space-y-2">
                  {SUPPLEMENTS.filter(s => supps.includes(s.name)).map(s => (
                    <div key={s.name} className="flex items-center gap-2.5 bg-white/5 rounded-lg px-3 py-2">
                      <span className="w-2 h-2 rounded-full bg-teal-200 shrink-0" />
                      <span className="text-sm text-white flex-1">{s.name}</span>
                      <span className="text-xs text-white/40">{s.dose}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plan IA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {[
                  { title: 'Nutrición', items: aiPlan.nutrition, icon: '🥗' },
                  { title: 'Ejercicio', items: aiPlan.exercise,  icon: '🏃' },
                  { title: 'Productos', items: aiPlan.products,  icon: '💊' },
                ].map(sec => (
                  <div key={sec.title} className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs font-bold text-teal-200 mb-2">{sec.icon} {sec.title}</p>
                    <ul className="space-y-1">
                      {sec.items.map((item, i) => (
                        <li key={i} className="text-xs text-white/70 leading-relaxed flex gap-1.5">
                          <span className="text-teal-400 shrink-0">·</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Próximos pasos */}
              <div className="bg-white/5 rounded-xl p-3 mb-5">
                <p className="text-xs font-bold text-teal-200 mb-1">📅 Próximos pasos</p>
                <p className="text-xs text-white/70 leading-relaxed">{aiPlan.next_steps}</p>
              </div>

              {/* Footer */}
              <p className="text-center text-[10px] text-white/25 border-t border-white/10 pt-4">
                ⚠️ Este análisis no sustituye un diagnóstico médico. Es una evaluación orientativa de bienestar.<br/>
                Plan de seguimiento activo · Próxima evaluación en 30 días
              </p>
            </div>
          </div>

          {/* Notificación de comisión */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-semibold text-green-800">Comisión registrada</p>
              <p className="text-xs text-green-700 mt-0.5">
                RD${center?.commission_rate ?? 300} sumados al balance del día. El plan de 90 días fue activado para {appointment.client_name.split(' ')[0]}.
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 flex-wrap">
            <a href={buildWAMsg()} target="_blank" rel="noreferrer" className="btn-whatsapp">
              💬 Enviar por WhatsApp al cliente
            </a>
            <button onClick={reset} className="btn-secondary">
              ← Nuevo registro
            </button>
            <a href="/operator/dashboard" className="btn-secondary">
              📅 Volver a agenda
            </a>
          </div>

        </div>
      )}

    </div>
  )
}
