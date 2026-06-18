import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { Resend }                    from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // service role para server-side
)
const resend = new Resend(process.env.RESEND_API_KEY)

// ── POST /api/appointments ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      center_id, client_name, client_phone,
      client_age, client_email,
      appointment_date, appointment_time, province,
    } = body

    // Validación básica
    if (!center_id || !client_name || !client_phone || !appointment_date || !appointment_time) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
    }

    // Generar código único
    const { data: code, error: codeErr } = await supabase.rpc('generate_reference_code')
    if (codeErr) throw codeErr

    // Insertar cita
    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .insert({
        reference_code:   code,
        center_id,
        client_name:      client_name.trim(),
        client_phone:     client_phone.trim(),
        client_age:       client_age ? parseInt(client_age) : null,
        client_email:     client_email?.trim() || null,
        appointment_date,
        appointment_time,
        province,
        status:           'pending',
      })
      .select('*, centers(name, whatsapp, province)')
      .single()

    if (apptErr) throw apptErr

    // Enviar email de confirmación (si hay email)
    if (client_email?.trim()) {
      const centerName = (appt as any).centers?.name ?? 'el centro seleccionado'
      const dateStr    = new Date(appointment_date + 'T12:00:00')
        .toLocaleDateString('es-DO', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

      await resend.emails.send({
        from:    process.env.EMAIL_FROM ?? 'Aura Vital <notificaciones@auravital.com>',
        to:      [client_email.trim()],
        subject: `✅ Tu cita está lista — Código ${code}`,
        html: `
          <div style="font-family:sans-serif; max-width:520px; margin:0 auto; padding:32px;">
            <div style="background:#0F6E56; border-radius:12px; padding:24px; text-align:center; margin-bottom:24px;">
              <h1 style="color:#ffffff; margin:0; font-size:22px;">Aura Vital</h1>
              <p style="color:#9FE1CB; margin:8px 0 0; font-size:14px;">Análisis de bienestar celular</p>
            </div>
            <h2 style="color:#1a1a1a; font-size:20px; margin-bottom:8px;">¡Hola, ${client_name.split(' ')[0]}!</h2>
            <p style="color:#6b6b68; font-size:15px; line-height:1.6;">
              Tu cita de análisis de bienestar ha sido registrada exitosamente.
            </p>
            <div style="background:#E1F5EE; border-radius:12px; padding:20px; margin:24px 0;">
              <p style="margin:0 0 8px; font-size:13px; color:#0F6E56; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Código de referencia</p>
              <p style="margin:0; font-size:32px; font-weight:800; color:#0F6E56; font-family:monospace; letter-spacing:0.05em;">${code}</p>
            </div>
            <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
              ${[
                ['Centro',   centerName],
                ['Fecha',    dateStr],
                ['Hora',     appointment_time],
                ['Provincia', province],
              ].map(([k,v]) => `
                <tr>
                  <td style="padding:8px 0; font-size:13px; color:#6b6b68; border-bottom:1px solid #e8e6df;">${k}</td>
                  <td style="padding:8px 0; font-size:14px; font-weight:500; color:#1a1a1a; border-bottom:1px solid #e8e6df; text-align:right;">${v}</td>
                </tr>`).join('')}
            </table>
            <div style="background:#FAEEDA; border-radius:10px; padding:14px; font-size:13px; color:#633806; margin-bottom:24px;">
              ⚠️ Este chequeo no sustituye un diagnóstico médico. Es solo una referencia de salud y bienestar general.
            </div>
            <p style="font-size:13px; color:#6b6b68; text-align:center; margin:0;">
              © ${new Date().getFullYear()} Aura Vital · República Dominicana
            </p>
          </div>
        `,
      })
    }

    return NextResponse.json({
      success:        true,
      reference_code: code,
      appointment:    appt,
    })

  } catch (err: any) {
    console.error('[POST /api/appointments]', err)
    return NextResponse.json(
      { error: err.message ?? 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ── GET /api/appointments?code=AV-2024-XXXXX ─────────────────
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('appointments')
    .select('*, centers(name, whatsapp, province, address, schedule)')
    .eq('reference_code', code.toUpperCase())
    .single()

  if (error || !data) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
  return NextResponse.json(data)
}
