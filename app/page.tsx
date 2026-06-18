'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { supabase, createAppointment, getCentersByProvince, type Center } from '@/lib/supabase'
// ... 

// ── Provincias disponibles ───────────────────────────────────
const PROVINCES = [
  'Distrito Nacional',
  'Santiago',
  'Santo Domingo Este',
  'Santo Domingo Oeste',
  'Santo Domingo Norte',
  'La Vega',
  'San Pedro de Macorís',
  'Puerto Plata',
  'San Francisco de Macorís',
  'Barahona',
  'Moca',
  'Bonao',
]

// ── Horarios disponibles ─────────────────────────────────────
const TIME_SLOTS = [
  '9:00 AM','10:00 AM','11:00 AM',
  '1:00 PM','2:00 PM','3:00 PM','4:00 PM',
]

// ── Indicadores de bienestar ─────────────────────────────────
const INDICATORS = [
  'Circulación sanguínea','Metabolismo basal','Sistema digestivo',
  'Función hepática','Función renal','Vitaminas esenciales',
  'Minerales','Sistema óseo','Memoria y concentración',
  'Estrés oxidativo','Colágeno','Bienestar hormonal',
  'Energía celular','Sistema cardiovascular','Inmunidad general',
  'Y muchos más...',
]

export default function LandingPage() {
  const [province,   setProvince]   = useState('')
  const [centers,    setCenters]    = useState<Center[]>([])
  const [centerId,   setCenterId]   = useState('')
  const [date,       setDate]       = useState('')
  const [time,       setTime]       = useState('')
  const [name,       setName]       = useState('')
  const [phone,      setPhone]      = useState('')
  const [age,        setAge]        = useState('')
  const [email,      setEmail]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [confirmed,  setConfirmed]  = useState(false)
  const [result,     setResult]     = useState<{ code: string; center: Center } | null>(null)
  const [error,      setError]      = useState('')

  // Fecha mínima: mañana
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  // Cargar centros cuando cambia la provincia
  useEffect(() => {
    if (!province) { setCenters([]); setCenterId(''); return }
    getCentersByProvince(province).then(setCenters).catch(console.error)
  }, [province])

  // Formatear fecha legible
  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('es-DO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!province || !centerId || !date || !time || !name || !phone || !age) {
      setError('Por favor completa todos los campos requeridos.')
      return
    }
    setLoading(true)
    try {
      const appt = await createAppointment({
        center_id:        centerId,
        client_name:      name.trim(),
        client_phone:     phone.trim(),
        client_age:       parseInt(age),
        client_email:     email.trim() || undefined,
        appointment_date: date,
        appointment_time: time,
        province,
      })
      const center = centers.find(c => c.id === centerId)!
      setResult({ code: appt.reference_code, center })
      setConfirmed(true)
    } catch (err: any) {
      setError('Ocurrió un error al registrar tu cita. Por favor intenta de nuevo.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Generar enlace WhatsApp
  const buildWhatsAppUrl = () => {
    if (!result) return '#'
    const msg = `Hola Aura Vital, mi código de cita es ${result.code}. Quiero confirmar mi asistencia para el día ${formatDate(date)} a las ${time} en el centro de ${result.center.name}. Mi nombre es ${name}.`
    return `https://wa.me/${result.center.whatsapp}?text=${encodeURIComponent(msg)}`
  }

  return (
    <main className="min-h-screen bg-white">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 font-semibold text-teal-800 no-underline">
            <span className="w-7 h-7 rounded-full bg-teal-400 flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-white opacity-85" />
            </span>
            Aura Vital
          </a>
          <a href="#agendar" className="btn-primary text-sm py-2 px-4">
            Agendar ahora
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 border border-teal-100 rounded-full px-4 py-1 text-xs font-medium mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse-dot" />
            Análisis cuántico no invasivo
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-5">
            Conoce tu bienestar{' '}
            <span className="text-teal-600">desde adentro</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8 max-w-lg leading-relaxed">
            Más de 45 indicadores de salud evaluados en 5 minutos,
            sin agujas ni procedimientos invasivos.
          </p>
          <div className="flex gap-3 flex-wrap">
            <a href="#agendar" className="btn-primary">
              Agendar mi análisis
            </a>
            <a href="#como-funciona" className="btn-secondary">
              ¿Cómo funciona?
            </a>
          </div>
          <div className="flex gap-8 mt-8 pt-8 border-t border-gray-200">
            {[['45+','Indicadores'],['5 min','Duración'],['10','Centros en RD']].map(([v,l]) => (
              <div key={l}>
                <div className="text-2xl font-bold text-teal-600">{v}</div>
                <div className="text-xs text-gray-500">{l}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Scanner animation */}
        <div className="flex justify-center">
          <div className="w-72 h-72 rounded-3xl bg-gradient-to-br from-teal-50 to-teal-100 flex flex-col items-center justify-center relative overflow-hidden border border-teal-100">
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-70 animate-scan-line" />
            <div className="w-40 h-40 rounded-full border-2 border-teal-200 flex items-center justify-center relative">
              <div className="absolute inset-[-2px] rounded-full border-2 border-transparent border-t-teal-400 animate-spin-ring" />
              <div className="w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center gap-1 shadow-sm">
                <span className="text-3xl">🫀</span>
                <span className="text-[9px] text-teal-600 font-bold uppercase tracking-widest">Escaneando</span>
              </div>
            </div>
            <div className="absolute bottom-5 flex gap-2">
              <span className="bg-white border border-teal-100 rounded-full px-3 py-1 text-xs text-teal-600 font-medium">No invasivo</span>
              <span className="bg-white border border-teal-100 rounded-full px-3 py-1 text-xs text-teal-600 font-medium">Resultados ya</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── VIDEO + INFO ── */}
      <section className="bg-gray-50 py-20 px-6" id="que-incluye">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* VIDEO — reemplaza VIDEO_ID con tu ID de YouTube */}
          <div className="aspect-video rounded-2xl overflow-hidden bg-teal-900 flex items-center justify-center">
            {/* PRODUCCIÓN: descomenta esto y pon tu VIDEO_ID */}
            {/* <iframe
              src="https://www.youtube.com/embed/VIDEO_ID?rel=0&modestbranding=1"
              title="Aura Vital"
              className="w-full h-full"
              allowFullScreen
            /> */}
            <div className="text-center text-teal-100 opacity-50">
              <div className="text-5xl mb-2">▶</div>
              <p className="text-sm">Reemplaza VIDEO_ID con tu ID de YouTube</p>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-snug">
              ¿Qué incluye el análisis de bienestar?
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-3">
              El análisis incluye una evaluación rápida y no invasiva de más de 45 indicadores
              relacionados con circulación, metabolismo, digestión, hígado, riñones, vitaminas,
              minerales, sistema óseo, memoria, estrés oxidativo, colágeno, bienestar hormonal y más.
            </p>
            <p className="text-gray-500 text-sm leading-relaxed mb-5">
              Además, te explicamos los resultados mediante nuestro sistema{' '}
              <strong className="text-gray-700">"Efecto Dominó"</strong>, para identificar qué áreas
              podrían estar influyendo en tu bienestar general.
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                { icon: '⏱', text: 'Duración aproximada: 5 minutos' },
                { icon: '📋', text: 'Incluye explicación personalizada de tus resultados' },
              ].map(p => (
                <div key={p.text} className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700">
                  <span>{p.icon}</span><span>{p.text}</span>
                </div>
              ))}
              <div className="disclaimer-box">
                <span>⚠️</span>
                <span>No es un diagnóstico médico; es una evaluación orientativa para bienestar general.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INDICADORES ── */}
      <section className="py-20 px-6" id="indicadores">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-400 mb-2">Cobertura del análisis</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">45+ indicadores de bienestar</h2>
          <p className="text-gray-500 mb-10 max-w-xl">Cada análisis cubre múltiples sistemas del cuerpo para una visión completa de tu estado actual.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {INDICATORS.map(ind => (
              <div key={ind} className="bg-teal-50 border border-teal-100 rounded-xl p-3 flex items-center gap-2.5 text-sm text-teal-800 font-medium hover:-translate-y-0.5 transition-transform">
                <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                {ind}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="bg-teal-900 py-20 px-6" id="como-funciona">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-200 mb-2">El proceso</p>
          <h2 className="text-3xl font-bold text-white mb-3">Simple, rápido y sin incomodidades</h2>
          <p className="text-teal-100 opacity-70 mb-12">Todo el proceso desde que agendas hasta que recibes tu plan toma menos de 20 minutos.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n:'01', icon:'📍', t:'Elige tu centro',       d:'Selecciona tu provincia y el centro más cercano.' },
              { n:'02', icon:'📱', t:'Confirma por WhatsApp', d:'Recibes un código único. Con un tap lo envías al centro.' },
              { n:'03', icon:'🔬', t:'Realiza tu análisis',   d:'El escáner evalúa 45+ indicadores en solo 5 minutos.' },
              { n:'04', icon:'📊', t:'Recibe tu plan',        d:'Infografía digital y plan de bienestar de 90 días.' },
            ].map(s => (
              <div key={s.n} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] transition-colors">
                <p className="text-[11px] font-bold tracking-widest text-teal-200 mb-3">PASO {s.n}</p>
                <p className="text-3xl mb-3">{s.icon}</p>
                <h3 className="font-semibold text-white mb-2">{s.t}</h3>
                <p className="text-sm text-teal-100 opacity-70 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORMULARIO DE CITAS ── */}
      <section className="bg-gray-50 py-20 px-6" id="agendar">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-400 mb-2">Agenda tu cita</p>
            <h2 className="text-3xl font-bold text-gray-900">Empieza hoy</h2>
          </div>

          <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            {!confirmed ? (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Reserva tu análisis</h3>
                <p className="text-sm text-gray-500 mb-6">Completa el formulario y te conectamos con el centro de tu zona.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Provincia */}
                  <div>
                    <label className="form-label">Provincia / Zona *</label>
                    <select className="form-input" value={province} onChange={e => setProvince(e.target.value)}>
                      <option value="">Selecciona tu provincia...</option>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  {/* Centro */}
                  <div>
                    <label className="form-label">Centro de análisis *</label>
                    <select className="form-input" value={centerId} onChange={e => setCenterId(e.target.value)} disabled={centers.length === 0}>
                      <option value="">{province ? 'Selecciona un centro...' : 'Primero selecciona tu provincia'}</option>
                      {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Fecha y hora */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Fecha *</label>
                      <input type="date" className="form-input" min={minDate} value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Horario *</label>
                      <select className="form-input" value={time} onChange={e => setTime(e.target.value)} disabled={!centerId}>
                        <option value="">Elige un horario</option>
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Nombre y edad */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Nombre completo *</label>
                      <input className="form-input" placeholder="María Rodríguez" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Edad *</label>
                      <input type="number" className="form-input" placeholder="35" min="15" max="99" value={age} onChange={e => setAge(e.target.value)} />
                    </div>
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="form-label">WhatsApp / Teléfono *</label>
                    <input type="tel" className="form-input" placeholder="809-555-0000" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>

                  {/* Email (opcional) */}
                  <div>
                    <label className="form-label">Email <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <input type="email" className="form-input" placeholder="maria@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>

                  {/* Disclaimer */}
                  <div className="disclaimer-box">
                    <span>⚠️</span>
                    <span>Este chequeo no sustituye un diagnóstico médico. Es solo una referencia de salud y bienestar general.</span>
                  </div>

                  {error && <p className="text-red-600 text-sm">{error}</p>}

                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 text-base">
                    {loading ? 'Procesando...' : 'Reservar mi cita →'}
                  </button>
                </form>
              </>
            ) : (
              /* ── CONFIRMACIÓN ── */
              <div className="text-center">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">¡Reserva registrada!</h3>
                <p className="text-sm text-gray-500 mb-2">Tu código de referencia es:</p>
                <div className="text-4xl font-black text-teal-600 tracking-widest my-4 font-mono">
                  {result?.code}
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  <strong>{result?.center.name}</strong><br />
                  {formatDate(date)} · {time}
                </p>
                <a href={buildWhatsAppUrl()} target="_blank" rel="noreferrer"
                   className="btn-whatsapp w-full justify-center py-3.5 text-base">
                  💬 Confirmar por WhatsApp
                </a>
                <p className="text-xs text-gray-400 mt-3">
                  Al tocar el botón se abrirá WhatsApp con el mensaje pre-llenado listo para enviar.
                </p>
                {email && (
                  <div className="mt-4 bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                    📧 También te enviamos un correo de confirmación a <strong>{email}</strong>
                  </div>
                )}
                <button onClick={() => { setConfirmed(false); setResult(null); setName(''); setPhone(''); setAge(''); setEmail(''); setDate(''); setTime(''); }}
                        className="mt-4 text-sm text-gray-500 underline cursor-pointer bg-transparent border-none">
                  ← Hacer otra reserva
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-teal-900 text-teal-100 py-12 px-6 text-center">
        <p className="text-lg font-bold text-white mb-3">Aura Vital</p>
        <p className="text-xs opacity-50 max-w-lg mx-auto leading-relaxed">
          Este servicio no sustituye el diagnóstico médico profesional. El análisis de bienestar
          cuántico es una evaluación orientativa de referencia para apoyar hábitos saludables.
          Para diagnósticos médicos, consulta siempre a un profesional de la salud certificado.
        </p>
        <p className="text-xs opacity-30 mt-6">
          © {new Date().getFullYear()} Aura Vital · República Dominicana
        </p>
      </footer>

    </main>
  )
}
