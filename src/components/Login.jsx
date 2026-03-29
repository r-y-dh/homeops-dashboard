import { useState } from 'react'
import { T } from '../lib/constants'
import { inp } from './UI'

export default function Login({ onAuth }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await onAuth(email, password, isSignUp)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <div style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
        padding: 32, width: 340,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.cyan, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Home OPS</div>
          <div style={{ fontSize: 12, color: T.textDim }}>{isSignUp ? 'Create your account' : 'Sign in to continue'}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 3 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} placeholder="riyadh@example.com" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 3 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} placeholder="••••••••" minLength={6} />
          </div>

          {error && <div style={{ fontSize: 11, color: T.red, marginBottom: 12 }}>{error}</div>}

          <button type="submit" disabled={loading} style={{
            width: '100%', background: T.cyan, color: T.bg, border: 'none',
            borderRadius: 7, padding: '10px', fontSize: 13, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>{loading ? 'Working…' : isSignUp ? 'Create Account' : 'Sign In'}</button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span onClick={() => setIsSignUp(!isSignUp)} style={{
            fontSize: 11, color: T.textMuted, cursor: 'pointer',
          }}>{isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}</span>
        </div>
      </div>
    </div>
  )
}
