'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role === 'admin') {
      router.push('/admin/dashboard')
    } else {
      router.push('/team/scan')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, #2a0515 0%, #0a0a0f 60%)',
      padding: '24px',
    }}>
      {/* Background shapes */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '10%', left: '10%',
          width: 300, height: 300, borderRadius: '50%',
          border: '1px solid rgba(255,45,120,0.1)',
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', right: '10%',
          width: 200, height: 200,
          border: '1px solid rgba(255,45,120,0.08)',
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '20%',
          width: 0, height: 0,
          borderLeft: '80px solid transparent',
          borderRight: '80px solid transparent',
          borderBottom: '140px solid rgba(255,45,120,0.05)',
        }} />
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            marginBottom: 16,
          }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--pink)' }} />
            <div style={{ width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '16px solid var(--pink)' }} />
            <div style={{ width: 14, height: 14, background: 'var(--pink)' }} />
          </div>
          <h1 className="display" style={{ fontSize: 40, color: 'var(--pink)', textShadow: '0 0 40px rgba(255,45,120,0.4)' }}>
            SQUID GAME
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Paradox26 · Event Management System
          </p>
        </div>

        {/* Login card */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
            Sign In
          </h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              id="login-btn"
              style={{ marginTop: 4 }}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 18, height: 18 }} /> Signing in...</>
              ) : 'Enter the Game'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          Authorized personnel only
        </p>
      </div>
    </div>
  )
}
