'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Center } from '@/lib/supabase'

// ── Contexto del operador ────────────────────────────────────
type OperatorCtx = {
  center:    Center | null
  userEmail: string
  signOut:   () => void
}
const OperatorContext = createContext<OperatorCtx>({
  center: null, userEmail: '', signOut: () => {},
})
export const useOperator = () => useContext(OperatorContext)

// ── Navegación ───────────────────────────────────────────────
const NAV = [
  { href: '/operator/dashboard',   icon: '📅', label: 'Agenda del día'     },
  { href: '/operator/scan',        icon: '🔬', label: 'Registrar escáner'  },
  { href: '/operator/liquidation', icon: '💰', label: 'Liquidación diaria' },
  { href: '/operator/alerts',      icon: '🔔', label: 'Alertas 30 días'    },
]

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [center,    setCenter]    = useState<Center | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [loading,   setLoading]   = useState(true)
  const [menuOpen,  setMenuOpen]  = useState(false)

  // ── Auth guard ──────────────────────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/operator/login'); return }

      setUserEmail(session.user.email ?? '')

      // Cargar el centro asociado a este operador
      // El email del operador está en centers.email
      const { data: centerData } = await supabase
        .from('centers')
        .select('*')
        .eq('email', session.user.email)
        .eq('status', 'active')
        .single()

      if (!centerData) {
        // Si no hay centro asociado, cerrar sesión
        await supabase.auth.signOut()
        router.replace('/operator/login')
        return
      }
      setCenter(centerData)
      setLoading(false)
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/operator/login')
    })
    return () => subscription.unsubscribe()
  }, [router])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/operator/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Cargando panel...</p>
        </div>
      </div>
    )
  }

  return (
    <OperatorContext.Provider value={{ center, userEmail, signOut }}>
      <div className="flex min-h-screen bg-gray-50">

        {/* ── SIDEBAR escritorio ── */}
        <aside className="hidden lg:flex w-60 bg-teal-900 flex-col fixed top-0 left-0 bottom-0 z-50">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
            <span className="w-7 h-7 rounded-full bg-teal-400 flex items-center justify-center shrink-0">
              <span className="w-3 h-3 rounded-full bg-white opacity-85" />
            </span>
            <div>
              <p className="text-sm font-bold text-white leading-none">Aura Vital</p>
              <p className="text-[10px] text-teal-100 opacity-50 mt-0.5">Panel Operador</p>
            </div>
          </div>

          {/* Centro info */}
          {center && (
            <div className="px-5 py-3 border-b border-white/10">
              <p className="text-[10px] text-teal-200 opacity-50 uppercase tracking-widest mb-1">Tu centro</p>
              <p className="text-sm font-semibold text-white leading-tight">{center.name}</p>
              <p className="text-xs text-teal-100 opacity-50">{center.province}</p>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {NAV.map(item => (
              <a
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname?.startsWith(item.href) ? 'active' : ''}`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>

          {/* User */}
          <div className="px-5 py-4 border-t border-white/10 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center text-xs font-bold text-teal-100 shrink-0">
              {userEmail?.[0]?.toUpperCase() ?? 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/75 truncate">{userEmail}</p>
            </div>
            <button onClick={signOut} title="Cerrar sesión"
              className="text-white/30 hover:text-white/70 transition-colors text-sm">
              ↩
            </button>
          </div>
        </aside>

        {/* ── TOPBAR móvil ── */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-teal-900 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-400 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-white opacity-85" />
            </span>
            <span className="text-sm font-bold text-white">Aura Vital</span>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="text-white/70 hover:text-white text-xl px-1">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* ── MENÚ MÓVIL ── */}
        {menuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-teal-900 pt-14 px-4 flex flex-col">
            <nav className="py-4 space-y-1">
              {NAV.map(item => (
                <a key={item.href} href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`nav-item text-base py-3 ${pathname?.startsWith(item.href) ? 'active' : ''}`}>
                  <span>{item.icon}</span> {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto pb-8">
              <p className="text-xs text-white/40 mb-3">{userEmail}</p>
              <button onClick={signOut} className="text-sm text-white/50 hover:text-white/80">
                ↩ Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {/* ── CONTENIDO PRINCIPAL ── */}
        <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 min-h-screen">
          {children}
        </main>

      </div>
    </OperatorContext.Provider>
  )
}
