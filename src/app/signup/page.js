'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', -apple-system, sans-serif" }}>
        <div style={{ width: 400, background: '#FFF', borderRadius: 12, border: '1px solid #E8E4DC', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1B7A43', marginBottom: 8 }}>Account Created!</div>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>
            Check your email ({email}) for a confirmation link. Click it to activate your account, then sign in.
          </div>
          <Link href="/login" style={{ display: 'inline-block', padding: '10px 24px', background: '#1B4332', color: '#FFF', borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', -apple-system, sans-serif" }}>
      <div style={{ width: 420, background: '#FFF', borderRadius: 12, border: '1px solid #E8E4DC', padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1B4332' }}>GTM</div>
          <div style={{ fontSize: 11, color: '#888', letterSpacing: '1.5px', marginTop: 2 }}>PHLO SYSTEMS</div>
          <div style={{ fontSize: 14, color: '#666', marginTop: 16 }}>Start your free beta account</div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#FFF5F5', border: '1px solid #E6C6C6', borderRadius: 6, fontSize: 13, color: '#C62828', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignup}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #D5D0C6', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#FAFAF8' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Company</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Trading"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #D5D0C6', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#FAFAF8' }} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #D5D0C6', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#FAFAF8' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #D5D0C6', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#FAFAF8' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading ? '#999' : '#1B4332', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Creating account...' : 'Create Free Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#888' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#1B4332', fontWeight: 600 }}>Sign in</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#BBB' }}>
          No credit card required. Works standalone — no ERP needed.
        </div>
      </div>
    </div>
  )
}
