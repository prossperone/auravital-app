'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OperatorLogin() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password: password,
    })

    if (authErr) {
      setError('Correo o contraseña incorrectos. Verifica tus datos.')
      setLoading(false)
      return
    }

    router.replace('/operator/dashboard')
  }

  return (
    <div className="min-h-screen bg-teal-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-teal-400 flex items-center justify-center mx-auto mb-4">
            <span className="w-6 h-6 rounded-full bg-white opacity-85 block" />
          </div>
          <h1 className="text-xl font-bold text-white">Aura Vital</h1>
          <p className="text-sm text-teal-100 opacity-60 mt-1">Panel del Operador</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-7 shadow-xl">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Iniciar sesión</h2>
          <p className="text-sm text-gray-500 mb-6">Accede con las credenciales de tu centro.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label">Correo electrónico</label>
              <input
                type="email"
                className="form-input"
                placeholder="operador@auravital.lat"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : 'Entrar al panel'}
            </button>
          </form>

          <div className="disclaimer-box mt-5">
            <span>🔒</span>
            <span>Acceso exclusivo para operadores certificados de Aura Vital.</span>
          </div>
        </div>

        <p className="text-center text-xs text-teal-100 opacity-30 mt-6">
          © {new Date().getFullYear()} Aura Vital · auravital.lat
        </p>
      </div>
    </div>
  )
}
