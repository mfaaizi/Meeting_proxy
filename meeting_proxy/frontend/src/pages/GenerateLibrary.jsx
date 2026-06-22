import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import api from '../api'

const DEFAULTS = [
  'Can you introduce yourself?',
  'What are your core strengths?',
  'How do you manage your current project?',
  'What is your background?',
  'How do you collaborate with teams?',
  'How do you solve problems?',
  'How do you communicate updates?',
  'What are your goals this year?',
  'What tools do you prefer?',
  'How do you handle feedback?',
]

const statusIcon = { ready: '✅', failed: '❌', pending: '⏳', generating: '🔄' }
const statusClass = { ready: 'status-ready', failed: 'status-failed', pending: 'status-pending', generating: 'status-pending' }

export default function GenerateLibrary() {
  const [items, setItems] = useState(DEFAULTS.map((q) => ({ question: q, status: 'pending' })))
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const pollRef = useRef(null)

  const load = async () => {
    try {
      const res = await api.get('/api/library')
      const back = res.data?.items || res.data || []
      if (back.length > 0) setItems(back)
    } catch {}
  }

  useEffect(() => {
    load()
    return () => clearInterval(pollRef.current)
  }, [])

  const generateAll = async () => {
    setLoading(true)
    setProgress(0)
    try {
      await api.post('/api/library/generate', {})
      toast.success('Library generation started!')
      let count = 0
      pollRef.current = setInterval(async () => {
        await load()
        count++
        setProgress(Math.min(count * 10, 95))
      }, 5000)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to start generation')
    } finally {
      setLoading(false)
    }
  }

  const readyCount = items.filter((i) => i.status === 'ready').length
  const totalPct = items.length ? Math.round((readyCount / items.length) * 100) : 0

  return (
    <PageShell title="Generate Avatar Library" subtitle="Pre-generate video responses so your avatar answers instantly">

      {/* Overview card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mp-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-5">
          <div className="flex-1">
            <h2 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
              Library Progress
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {readyCount} of {items.length} videos ready · Uses {items.length} D-ID credits
            </p>
          </div>
          <button
            onClick={generateAll}
            disabled={loading}
            className="mp-btn-primary px-6 py-2.5 whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </span>
            ) : '⚡ Generate All Videos'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--border)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--orange), var(--orange-dark))' }}
            animate={{ width: `${totalPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{totalPct}% complete</span>
          {loading && <span style={{ color: 'var(--orange)' }}>Generating in background…</span>}
        </div>

        {/* Credit warning */}
        <div className="mt-4 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <span>⚠️</span>
          <span style={{ color: '#f59e0b' }}>This will use <strong>{items.length} D-ID credits</strong>. Make sure your API key has sufficient balance.</span>
        </div>
      </motion.div>

      {/* Question list */}
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((item, i) => (
          <motion.div
            key={`${item.question}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="mp-card p-4 flex items-center gap-4"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
            >
              {statusIcon[item.status] || '⏳'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.question}</p>
              <span className={`mt-1 inline-block ${statusClass[item.status] || 'status-pending'}`}>
                {item.status || 'pending'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </PageShell>
  )
}
