import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import Anthropic                     from '@anthropic-ai/sdk'

const supabase  = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic()   // usa ANTHROPIC_API_KEY del entorno

// ── POST /api/reports ─────────────────────────────────────────
// Crea el reporte, genera el plan IA y activa la liquidación
export async function POST(req: NextRequest) {
  try {
    const {
      appointment_id,
      center_id,
      attention_areas,    // string[]
      supplements,        // { name, dose }[]
      operator_notes,
    } = await req.json()

    if (!appointment_id || !center_id || !attention_areas?.length || !supplements?.length) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
    }

    // 1. Obtener datos del cliente
    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select('client_name, client_age, client_phone, client_email')
      .eq('id', appointment_id)
      .single()
    if (apptErr || !appt) throw new Error('Cita no encontrada')

    // 2. Generar plan con Claude AI
    const aiPlan = await generateHealthPlan({
      clientName:     appt.client_name,
      clientAge:      appt.client_age ?? 0,
      attentionAreas: attention_areas,
      supplements:    supplements.map((s: any) => s.name),
      operatorNotes:  operator_notes ?? '',
    })

    // 3. Calcular fechas del plan
    const today   = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 90)

    // 4. Insertar reporte
    const { data: report, error: reportErr } = await supabase
      .from('reports')
      .insert({
        appointment_id,
        center_id,
        attention_areas,
        supplements,
        operator_notes,
        ai_plan:          aiPlan,
        ai_generated_at:  new Date().toISOString(),
        plan_start_date:  today.toISOString().split('T')[0],
        plan_end_date:    endDate.toISOString().split('T')[0],
      })
      .select()
      .single()
    if (reportErr) throw reportErr

    // 5. Marcar cita como atendida (activa liquidación automáticamente vía trigger)
    await supabase
      .from('appointments')
      .update({ status: 'attended' })
      .eq('id', appointment_id)

    return NextResponse.json({
      success:    true,
      report_id:  report.id,
      share_token: report.share_token,
      ai_plan:    aiPlan,
    })

  } catch (err: any) {
    console.error('[POST /api/reports]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── Generador de plan de salud con Claude ────────────────────
async function generateHealthPlan({
  clientName,
  clientAge,
  attentionAreas,
  supplements,
  operatorNotes,
}: {
  clientName:     string
  clientAge:      number
  attentionAreas: string[]
  supplements:    string[]
  operatorNotes:  string
}) {
  const prompt = `
Eres un asistente de bienestar de Aura Vital. Con base en los resultados del análisis cuántico no invasivo, genera un plan de bienestar personalizado de 90 días.

DATOS DEL CLIENTE:
- Nombre: ${clientName}
- Edad: ${clientAge} años
- Áreas que requieren atención: ${attentionAreas.join(', ')}
- Suplementos recomendados: ${supplements.join(', ')}
- Notas del operador: ${operatorNotes || 'Ninguna'}

IMPORTANTE: Este análisis no es un diagnóstico médico. Es una evaluación orientativa de bienestar.

Responde SOLO en JSON con esta estructura exacta, sin texto adicional ni backticks:
{
  "summary": "Resumen personalizado de 2-3 oraciones sobre el estado general del cliente",
  "nutrition": [
    "Recomendación de alimentación 1",
    "Recomendación de alimentación 2",
    "Recomendación de alimentación 3",
    "Recomendación de alimentación 4"
  ],
  "exercise": [
    "Recomendación de ejercicio 1",
    "Recomendación de ejercicio 2",
    "Recomendación de ejercicio 3"
  ],
  "products": [
    "Consejo de suplementación 1 con dosis sugerida",
    "Consejo de suplementación 2 con dosis sugerida",
    "Consejo de suplementación 3 con dosis sugerida"
  ],
  "next_steps": "Qué esperar en los próximos 30 días y por qué es importante el reescaneo"
}
`

  const message = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content
    .filter((b: any) => b.type === 'text')
    .map((b: any)    => b.text)
    .join('')
    .replace(/```json|```/g, '')
    .trim()

  return JSON.parse(text)
}

// ── GET /api/reports?token=SHARE_TOKEN ───────────────────────
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      appointments (
        client_name, client_age, appointment_date,
        reference_code, province
      ),
      centers (name, province)
    `)
    .eq('share_token', token)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
  return NextResponse.json(data)
}
