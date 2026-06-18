import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Esto le dice a Next.js que no intente pre-renderizar esta ruta de forma estática en el Build
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── POST /api/reports ─────────────────────────────────────────
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

    // 2. Generar plan de bienestar automatizado y nativo
    const aiPlan = {
      summary: `Plan personalizado de bienestar de 90 días optimizado para ${appt.client_name}. Este programa está enfocado en balancear los indicadores cuánticos evaluados y potenciar su vitalidad integral.`,
      nutrition: [
        `Incrementar el consumo de agua estructurada o filtrada diariamente adaptada a sus necesidades físicas.`,
        `Aumentar el consumo de alimentos antioxidantes y verdes para dar soporte directo a las siguientes áreas evaluadas: ${attention_areas.join(', ')}.`,
        `Reducir drásticamente harinas refinadas y azúcares procesados para optimizar el biocampo energético celular.`,
        `Mantener horarios fijos de alimentación para estabilizar los ritmos metabólicos basales.`
      ],
      exercise: [
        `Realizar actividad física de intensidad moderada (caminata ágil o estiramientos) por un mínimo de 30 minutos al día.`,
        `Incorporar ejercicios de respiración consciente (Pranayama o respiración diafragmática) en la mañana para mejorar la oxigenación celular.`,
        `Dar prioridad al descanso reparador nocturno, garantizando entre 7 y 8 horas de sueño continuo.`
      ],
      products: supplements.map((s: any) => `Consumir de manera constante ${s.name} bajo la dosis sugerida de: ${s.dose || 'según indicación'} para el correcto soporte nutricional celular.`),
      next_steps: `Es de vital importancia mantener la disciplina en las pautas durante los próximos 30 días. Su cuerpo pasará por un proceso de adaptación celular, por lo que es mandatorio agendar su reescaneo cuántico al término de este ciclo para cuantificar las mejoras y ajustar las dosis.`
    }

    // 3. Calcular fechas del plan (90 días)
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

    // 5. Marcar cita como atendida
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
