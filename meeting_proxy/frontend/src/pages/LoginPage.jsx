import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import MouseGlow from '../components/MouseGlow'
import PageBackground from '../components/PageBackground'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

const bullets = [
  { title: 'Voice Cloning', desc: 'Your avatar speaks in your exact voice with perfect intonation' },
  { title: 'Realistic Avatar', desc: 'Lip-synced video that looks and moves just like you' },
  { title: 'Smart AI', desc: 'Responds intelligently using your personal knowledge base' },
  { title: 'Meeting Summaries', desc: 'Get detailed transcripts and action items instantly' },
]

export default function LoginPage() {
  const { loginWithGoogle, user, dbUser, loading: authLoading } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && dbUser && !authLoading) {
      if (!dbUser.photo_url) navigate('/onboarding/photo')
      else if (!dbUser.context) navigate('/onboarding/context')
      else navigate('/dashboard')
    }
  }, [user, dbUser, authLoading, navigate])

  const handleGoogle = async () => {
    try {
      setLoading(true)
      await loginWithGoogle()
    } catch {
      toast.error('Login failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
      className="relative min-h-screen overflow-hidden flex items-center"
    >
      <PageBackground />
      <MouseGlow />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg"
        style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
      >
        {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
      </button>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-12 items-center py-12">

        {/* ── Left: brand + bullets ── */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-3xl font-bold mb-10">
            <span style={{ color: 'var(--text-primary)' }}>Meeting</span>
            <span style={{ color: 'var(--orange)' }}>Proxy</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
            Welcome Back to Your
            <span style={{ color: 'var(--orange)' }}> AI-Powered </span>
            Meeting Assistant
          </h1>
          <p className="text-lg mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            MeetingProxy creates your digital twin that attends meetings, answers questions, and represents you — 24/7.
          </p>

          <div className="space-y-4">
            {bullets.map((b) => (
              <div key={b.title} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--orange)' }} />
                <p style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{b.title}: </span>
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Right: login card ── */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div
            className="relative p-8 rounded-2xl overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              boxShadow: 'var(--shadow-card)',
              border: '2px solid var(--border)',
            }}
          >
            {/* Top glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 50% 0%, rgba(255,107,53,0.15), transparent 65%)',
              }}
            />

            {/* Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="mp-badge px-5 py-1.5 text-xs">LOGIN</span>
            </div>

            <div className="relative z-10 mt-4">
              <h2 className="text-2xl font-bold text-center mb-8" style={{ color: 'var(--text-primary)' }}>
                Welcome Back
              </h2>

              {/* Google button */}
              <button
                onClick={handleGoogle}
                disabled={loading || authLoading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold transition-all duration-200 mb-6"
                style={{
                  background: 'linear-gradient(135deg, var(--orange), var(--orange-dark))',
                  color: '#fff',
                  boxShadow: loading ? 'none' : '0 0 20px rgba(255,107,53,0.4)',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {/* Google G icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" opacity=".8"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity=".8"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" opacity=".8"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity=".8"/>
                </svg>
                {loading ? 'Signing in…' : 'Continue with Google'}
              </button>

              <div className="mp-divider mb-6">
                <span>Secure sign-in via Firebase</span>
              </div>

              <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                By signing in you agree to our terms of service and privacy policy.
              </p>
            </div>
          </div>

          {/* Decorative glow below card */}
          <div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-12 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(255,107,53,0.3), transparent 70%)', filter: 'blur(12px)' }}
          />
        </motion.div>
      </div>
    </div>
  )
}
