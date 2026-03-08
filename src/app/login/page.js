'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', -apple-system, sans-serif" }}>
      <div style={{ width: 400, background: '#FFF', borderRadius: 12, border: '1px solid #E8E4DC', padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1B4332' }}>GTM</div>
          <div style={{ fontSize: 11, color: '#888', letterSpacing: '1.5px', marginTop: 2 }}>PHLO SYSTEMS</div>
          <div style={{ fontSize: 14, color: '#666', marginTop: 16 }}>Sign in to your account</div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#FFF5F5', border: '1px solid #E6C6C6', borderRadius: 6, fontSize: 13, color: '#C62828', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #D5D0C6', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#FAFAF8' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #D5D0C6', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#FAFAF8' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading ? '#999' : '#1B4332', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#888' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: '#1B4332', fontWeight: 600 }}>Sign up free</Link>
        </div>
      </div>
    </div>
  )
}
