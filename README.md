# 🌿 Aura Vital — Web App MVP

Plataforma de gestión de citas y comisiones para centros de análisis de bienestar cuántico en República Dominicana.

---

## 🗂 Estructura del proyecto

```
aura-vital/
├── app/
│   ├── page.tsx              ← Landing page + motor de citas
│   ├── layout.tsx            ← Root layout (fuentes, metadata)
│   ├── globals.css           ← Estilos globales + Tailwind
│   ├── operator/             ← Panel del operador
│   ├── admin/                ← Panel administrador
│   └── api/
│       ├── appointments/     ← POST/GET citas + email confirmación
│       └── reports/          ← POST/GET reportes + IA Claude
├── lib/
│   └── supabase.ts           ← Cliente Supabase + tipos + helpers
├── components/
│   ├── ui/                   ← Componentes reutilizables
│   └── layout/               ← Sidebar, Topbar
├── supabase-schema.sql       ← Schema completo de la base de datos
├── .env.local.example        ← Variables de entorno (plantilla)
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## 🚀 Instalación paso a paso

### Paso 1 — Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project**
2. Nombre: `aura-vital` · Región: `East US` (más cercano a RD)
3. Ve a **SQL Editor** → **New Query**
4. Copia y pega todo el contenido de `supabase-schema.sql`
5. Haz clic en **Run** — esto crea todas las tablas, funciones y datos iniciales

### Paso 2 — Obtener credenciales de Supabase

1. En tu proyecto Supabase → **Settings** → **API**
2. Copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

### Paso 3 — Configurar Resend (emails gratis)

1. Ve a [resend.com](https://resend.com) → crea cuenta gratuita
2. **API Keys** → **Create API Key**
3. Copia la key → `RESEND_API_KEY`
4. Verifica tu dominio auravital.com en Resend → **Domains**

### Paso 4 — Instalar dependencias localmente

```bash
# Clona o copia el proyecto
cd aura-vital

# Instala dependencias
npm install

# Copia las variables de entorno
cp .env.local.example .env.local
# Edita .env.local con tus credenciales reales

# Inicia el servidor de desarrollo
npm run dev
# → Abre http://localhost:3000
```

### Paso 5 — Desplegar en Vercel (gratis)

1. Sube el proyecto a GitHub (repo privado)
2. Ve a [vercel.com](https://vercel.com) → **New Project** → importa el repo
3. En **Environment Variables** agrega todas las variables de `.env.local.example` con sus valores reales
4. Haz clic en **Deploy**
5. Conecta tu dominio `auravital.com` en **Settings → Domains**

---

## 🔑 Variables de entorno requeridas

| Variable                          | Dónde obtenerla          | Ejemplo                         |
|-----------------------------------|--------------------------|---------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase → Settings → API | `https://xxx.supabase.co`       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase → Settings → API | `eyJhbGci...`                   |
| `SUPABASE_SERVICE_ROLE_KEY`       | Supabase → Settings → API | `eyJhbGci...`                   |
| `RESEND_API_KEY`                  | resend.com → API Keys     | `re_XXXXXXXXXX`                 |
| `EMAIL_FROM`                      | Tu dominio verificado     | `notificaciones@auravital.com`  |
| `NEXT_PUBLIC_WA_CENTRAL`          | Número Aura Vital         | `18095550000`                   |
| `NEXT_PUBLIC_COMISION_POR_CITA`   | Fijo                      | `300`                           |

---

## 📋 Módulos de la app

### `/` — Landing Page (público)
- Hero con animación del escáner
- Sección del video (inserta tu YouTube ID)
- 45+ indicadores de bienestar
- Cómo funciona en 4 pasos
- Motor de citas → genera código único → botón WhatsApp
- Testimonios + Footer legal

### `/operator` — Panel del Operador
- Login con Supabase Auth
- Agenda del día por centro
- Registro de resultados del escáner (áreas + suplementos)
- Generación de infografía + botón WhatsApp al cliente
- Liquidación diaria con confirmación de transferencia
- Alertas de clientes a 30 días

### `/admin` — Panel Administrador
- Dashboard con métricas globales y gráfico semanal
- Gestión de 10 centros (crear, editar, pausar)
- Jornadas nacionales con lista de interesados
- Control de comisiones por centro (cobradas/pendientes)
- Alertas 30 días de toda la red

### `/api/appointments` — API REST
- `POST` → crea cita + genera código único + envía email
- `GET?code=AV-XXXX` → busca cita por código

### `/api/reports` — API REST
- `POST` → crea reporte + llama Claude API para el plan de salud + activa liquidación
- `GET?token=SHARE_TOKEN` → reporte público compartible

---

## 💰 Costos del stack (Fase Beta)

| Servicio      | Plan          | Costo          |
|---------------|---------------|----------------|
| Vercel        | Hobby (free)  | $0/mes         |
| Supabase      | Free tier     | $0/mes         |
| Resend        | Free (3k/mes) | $0/mes         |
| Claude API    | Pay per use   | ~$0.003/reporte |
| Dominio       | Ya tienes     | $0/mes extra   |
| **Total**     |               | **≈ $0/mes**   |

> Cuando superes 50,000 filas en Supabase o 3,000 emails/mes en Resend, el costo sube a ~$25/mes total. Para el volumen del MVP, el tier gratuito es más que suficiente.

---

## 🔗 Video de YouTube

En `app/page.tsx` busca el comentario `/* PRODUCCIÓN */` y reemplaza `VIDEO_ID` con el ID de tu video de YouTube. El ID es la parte después de `?v=` en la URL. Ejemplo:
- URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- ID: `dQw4w9WgXcQ`

---

## ⚠️ Aviso legal (obligatorio en toda la app)

> "Este chequeo no sustituye un diagnóstico médico. Es solo una referencia de salud y bienestar general."

Esta frase aparece en: la landing page, el formulario de citas, la infografía del cliente y el footer.

---

## 📞 Soporte

Desarrollado para Aura Vital · República Dominicana · 2024
