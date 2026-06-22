import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import api from '../api'

export default function CustomQA() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const load = async () => {
    try {
      const res = await api.get('/api/custom-qa')
      setItems(res.data?.items || res.data || [])
    } catch {
      setItems([])
    }
  }

  useEffect(() => { load() }, [])

  const add = async () => {
    if (!question.trim() || !answer.trim()) return toast.error('Fill both fields')
    setLoading(true)
    try {
      await api.post('/api/custom-qa', { question, answer })
      toast.success('Added! Video generation started.')
      setQuestion('')
      setAnswer('')
      await load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to add')
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id) => {
    setDeleting(id)
    try {
      await api.delete(`/api/custom-qa/${id}`)
      toast.success('Deleted')
      await load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const statusClass = { ready: 'status-ready', pending: 'status-pending', failed: 'status-failed' }

  return (
    <PageShell title="Custom Q&A" subtitle="Add your own questions — the AI will generate avatar videos for each">

      {/* Add form */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mp-card p-6 mb-6">
        <p className="mp-section-title">➕ Add New Question</p>
        <div className="grid gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Question</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What is your greatest achievement?"
              className="mp-input"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && add()}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Answer</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write the answer your avatar should speak…"
              rows={4}
              className="mp-input resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={add}
              disabled={loading || !question.trim() || !answer.trim()}
              className="mp-btn-primary px-6 py-2.5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing…
                </span>
              ) : '⚡ Add & Generate Video'}
            </button>
            {(question || answer) && (
              <button
                onClick={() => { setQuestion(''); setAnswer('') }}
                className="mp-btn-ghost px-4 py-2.5 text-sm"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* List */}
      {items.length === 0 ? (
        <div className="mp-card p-16 text-center">
          <div className="text-5xl mb-4">💬</div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No custom questions yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Add your first Q&A pair above to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="mp-section-title">{items.length} Custom Question{items.length !== 1 ? 's' : ''}</p>
          <AnimatePresence>
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04 }}
                className="mp-card p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                      Q: {item.question}
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      A: {item.answer}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={statusClass[item.status] || 'status-pending'}>
                      {item.status || 'pending'}
                    </span>
                    <button
                      onClick={() => remove(item.id)}
                      disabled={deleting === item.id}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      {deleting === item.id ? (
                        <span className="w-4 h-4 border border-red-400 border-t-transparent rounded-full animate-spin block" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </PageShell>
  )
}
