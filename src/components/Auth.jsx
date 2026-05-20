import { useState } from 'react'
import { supabase } from '../supabase'

export default function Auth({ onClose }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [useMagicLink, setUseMagicLink] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    if (!supabase) {
      setError('Supabase client is not initialized. Check VITE_SUPABASE variables.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (useMagicLink) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: window.location.origin,
          },
        })
        if (otpError) throw otpError
        setMessage('Check your email for the magic link login!')
      } else {
        if (isSignUp) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
          })
          if (signUpError) throw signUpError
          setMessage('Account created! Sign in using your credentials.')
          setIsSignUp(false)
          setPassword('')
        } else {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })
          if (signInError) throw signInError
          setMessage('Signed in successfully!')
          setTimeout(() => onClose(), 1000)
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="qty-modal" style={{ zIndex: 1200 }}>
      <div className="qty-backdrop" onClick={onClose} />
      <div className="qty-content" style={{ maxWidth: '400px', width: '90%' }}>
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            right: '16px', 
            top: '16px', 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-muted)', 
            fontSize: '1.5rem', 
            cursor: 'pointer' 
          }}
        >
          ×
        </button>

        <h3 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>
          {useMagicLink ? 'Passwordless Sync' : isSignUp ? 'Create Cloud Sync Account' : 'Sign In for Cloud Sync'}
        </h3>

        {!useMagicLink && (
          <div className="dashboard-controls" style={{ justifyContent: 'center', marginBottom: '20px' }}>
            <div className="view-toggle-pill">
              <button 
                type="button"
                className={`toggle-btn ${!isSignUp ? 'active' : ''}`}
                onClick={() => {
                  setIsSignUp(false)
                  setError('')
                  setMessage('')
                }}
              >
                Sign In
              </button>
              <button 
                type="button"
                className={`toggle-btn ${isSignUp ? 'active' : ''}`}
                onClick={() => {
                  setIsSignUp(true)
                  setError('')
                  setMessage('')
                }}
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
          <div className="goal-field">
            <label>Email Address</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {!useMagicLink && (
            <div className="goal-field">
              <label>Password</label>
              <input
                type="password"
                required
                minLength="6"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--accent-danger)', background: 'rgba(255, 8, 68, 0.1)', border: '1px solid rgba(255, 8, 68, 0.2)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{ color: '#00ff87', background: 'rgba(0, 255, 135, 0.1)', border: '1px solid rgba(0, 255, 135, 0.2)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem' }}>
              {message}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="qty-add-btn" 
            style={{ marginTop: '10px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Processing...' : useMagicLink ? 'Send Magic Link' : isSignUp ? 'Create Sync Account' : 'Sign In to Sync'}
          </button>
        </form>

        <div style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <button
            type="button"
            onClick={() => {
              setUseMagicLink(!useMagicLink)
              setError('')
              setMessage('')
            }}
            style={{ background: 'none', border: 'none', color: '#00f2fe', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {useMagicLink ? 'Use Email / Password instead' : 'Prefer passwordless Magic Link login?'}
          </button>
        </div>
      </div>
    </div>
  )
}
