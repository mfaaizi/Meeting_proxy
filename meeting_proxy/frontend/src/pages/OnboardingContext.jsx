import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import MouseGlow from '../components/MouseGlow'
import PageBackground from '../components/PageBackground'
import api from '../api'

function StepBar({ step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: s <= step ? 'var(--orange)' : 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              color: s <= step ? '#fff' : 'var(--text-muted)',
            }}
          >
            {s < step ? '✓' : s}
          </div>
          {s < 3 && <div className="w-16 h-0.5" style={{ background: s < step ? 'var(--orange)' : 'var(--border)' }} />}
        </div>
      ))}
      <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>Step {step} of 3</span>
    </div>
  )
}

const PLACEHOLDER = `I am [Your Name], a [your role] at [company/university].

I specialize in [your skills/technologies]. My current project is [project description].

Background: [brief background]

Key strengths: [list your strengths]

How I communicate: [your communication style]`

export default function OnboardingContext() {
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const MAX = 1000

  const save = async () => {
    if (context.trim().length < 20) return toast.error('Please add more context (at least 20 characters)')
    setLoading(true)
    try {
      await api.put('/api/profile', { context })
      toast.success('Context saved!')
      navigate('/onboarding/qa')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text-primary)' }} className="min-h-screen flex items-center justify-center p-4">
      <PageBackground />
      <MouseGlow />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold mb-1">
            <span style={{ color: 'var(--text-primary)' }}>Meeting</span>
            <span style={{ color: 'var(--orange)' }}>Proxy</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Account Setup</p>
        </div>

        <div className="mp-card p-8 relative" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
            <div style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,107,53,0.1), transparent 60%)', height: '100%' }} />
          </div>
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="mp-badge px-5 py-1.5 text-xs">SETUP</span>
          </div>

          <div className="relative z-10">
            <StepBar step={2} />

            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Tell Us About Yourself</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Your AI avatar will use this context to answer questions accurately during meetings.
            </p>

            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value.slice(0, MAX))}
              placeholder={PLACEHOLDER}
              rows={10}
              className="mp-input resize-none"
              style={{ fontFamily: 'inherit', lineHeight: '1.6' }}
            />

            <div className="flex items-center justify-between mt-2 mb-6">
              <p className="text-xs" style={{ color: context.length > MAX * 0.9 ? '#f59e0b' : 'var(--text-muted)' }}>
                {context.length} / {MAX} characters
              </p>
              <div className="h-1 w-24 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(context.length / MAX) * 100}%`,
                    background: context.length > MAX * 0.9 ? '#f59e0b' : 'var(--orange)',
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={save} disabled={loading} className="mp-btn-primary flex-1 py-3">
                {loading ? 'Saving…' : 'Continue →'}
              </button>
              <Link to="/dashboard" className="mp-btn-ghost flex-1 py-3 text-center text-sm">
                Skip for now
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
