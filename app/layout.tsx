export const dynamic = 'force-dynamic'

import type { Metadata } from "next"
import { Inter } from "font/google"
import "./globals.css"
// ... import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Aura Vital — Análisis de Bienestar Celular',
    template: '%s | Aura Vital',
  },
  description:
    'Conoce tu bienestar desde adentro. Más de 45 indicadores de salud evaluados en 5 minutos, sin agujas ni procedimientos invasivos.',
  keywords: ['bienestar', 'salud preventiva', 'escáner cuántico', 'República Dominicana'],
  openGraph: {
    title: 'Aura Vital — Análisis de Bienestar Celular',
    description: 'Evaluación rápida y no invasiva de más de 45 indicadores de bienestar. República Dominicana.',
    locale: 'es_DO',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
