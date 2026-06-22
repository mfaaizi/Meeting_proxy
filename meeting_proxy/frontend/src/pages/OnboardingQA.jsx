import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import toast from 'react-hot-toast'
import MouseGlow from '../components/MouseGlow'
import PageBackground from '../components/PageBackground'

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

export default function OnboardingQA() {
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [generatedAnswer, setGeneratedAnswer] = useState('')
  const [loadingAnswer, setLoadingAnswer] = useState(false)
  const [addedQAs, setAddedQAs] = useState([])
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [autoProgress, setAutoProgress] = useState(0)
  const [autoMessages, setAutoMessages] = useState([])

  const generateAnswer = async () => {
    if (!question.trim()) return toast.error('Enter a question first')
    setLoadingAnswer(true)
    setGeneratedAnswer('')
    try {
      const res = await axios.post('/api/generate-answer-preview', { question }, { withCredentials: true })
      setGeneratedAnswer(res.data.answer)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to generate answer')
    } finally {
      setLoadingAnswer(false)
    }
  }

  const addQA = async () => {
    if (!question || !generatedAnswer) return
    try {
      await axios.post('/api/custom-qa', { question, answer: generatedAnswer }, { withCredentials: true })
      setAddedQAs((p) => [...p, { question, answer: generatedAnswer }])
      setQuestion('')
      setGeneratedAnswer('')
      toast.success('Question added!')
    } catch {
      toast.error('Failed to add question')
    }
  }

  const autoGenerate = async () => {
    setAutoGenerating(true)
    setAutoProgress(0)
    setAutoMessages(['Analysing your context…'])
    try {
      const res = await axios.post('/api/auto-generate-qa', {}, { withCredentials: true })
      setAutoProgress(100)
      setAutoMessages((p) => [
        ...p,
        `Generated ${res.data.count} questions!`,
        'Creating avatar videos in background…',
        'Redirecting to dashboard…',
      ])
      toast.success('Auto-generated Q&A complete!')
      setTimeout(() => navigate('/dashboard'), 3000)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Auto-generation failed')
      setAutoGenerating(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text-primary)' }} className="min-h-screen p-4 py-8">
      <PageBackground />
      <MouseGlow />

      <div className="relative z-10 w-full max-w-xl mx-auto">
        {/* Logo */}
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
            <StepBar step={3} />

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Add Expected Questions</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  AI generates perfect answers using your context.
                </p>
              </div>
              {addedQAs.length > 0 && (
                <span className="mp-badge">{addedQAs.length} added</span>
              )}
            </div>

            {/* Manual entry */}
            <div className="space-y-3 mb-6">
              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && generateAnswer()}
                  placeholder="e.g. What is your name?"
                  className="mp-input flex-1"
                />
                <button
                  onClick={generateAnswer}
                  disabled={loadingAnswer || !question}
                  className="mp-btn-primary px-4 whitespace-nowrap"
                  style={{ padding: '10px 14px' }}
                >
                  {loadingAnswer ? '…' : 'Generate'}
                </button>
              </div>

              <AnimatePresence>
                {generatedAnswer && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                      Generated Answer <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(edit if needed)</span>
                    </label>
                    <textarea
                      value={generatedAnswer}
                      onChange={(e) => setGeneratedAnswer(e.target.value)}
                      rows={3}
                      className="mp-input resize-none"
                    />
                    <button onClick={addQA} className="mp-btn-primary mt-2 px-5 py-2 text-sm">
                      ✅ Add This Q&A
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Added list */}
            {addedQAs.length > 0 && (
              <div className="mb-6 space-y-2">
                {addedQAs.map((qa, i) => (
                  <div key={i} className="p-3 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Q: {qa.question}</p>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>A: {qa.answer}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Auto-generate */}
            <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid var(--border)' }}>
              <h3 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>🤖 Skip Manual Entry</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Let AI generate 10 relevant questions + answers + videos automatically.
              </p>
              {autoGenerating ? (
                <div>
                  <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${autoProgress}%`, background: 'linear-gradient(90deg, var(--orange), var(--orange-dark))' }}
                    />
                  </div>
                  {autoMessages.map((msg, i) => (
                    <p key={i} className="text-sm" style={{ color: 'var(--orange)' }}>✓ {msg}</p>
                  ))}
                </div>
              ) : (
                <button onClick={autoGenerate} className="mp-btn-primary w-full py-3">
                  🚀 Auto-Generate 10 Questions & Videos
                </button>
              )}
            </div>

            {/* Footer nav */}
            <div className="flex justify-between">
              <button onClick={() => navigate('/dashboard')} className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Skip for now
              </button>
              <button onClick={() => navigate('/dashboard')} className="mp-btn-ghost px-5 py-2 text-sm">
                Go to Dashboard →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
