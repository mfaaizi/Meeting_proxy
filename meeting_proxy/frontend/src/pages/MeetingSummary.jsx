import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import api from '../api'

export default function MeetingSummary() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState(null)
  const [summary, setSummary] = useState('')
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/api/meetings/${id}/summary`)
        setMeeting(res.data.meeting)
        setSummary(res.data.summary)
        setTranscript(res.data.transcript)
      } catch {
        toast.error('Failed to load meeting summary')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await api.post(`/api/meetings/${id}/generate-summary`)
      setSummary(res.data.summary)
      setTranscript(res.data.transcript)
      toast.success('Summary generated!')
    } catch {
      toast.error('Failed to generate summary')
    } finally {
      setGenerating(false)
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(summary)
    toast.success('Copied to clipboard!')
  }

  if (loading) {
    return (
      <PageShell title="Loading Summary…">
        <div className="flex h-64 items-center justify-center">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--orange)', borderTopColor: 'transparent' }} />
        </div>
      </PageShell>
    )
  }

  const duration = meeting?.started_at && meeting?.ended_at
    ? Math.round((new Date(meeting.ended_at) - new Date(meeting.started_at)) / 60000)
    : 0

  return (
    <PageShell title="Meeting Summary" subtitle="AI-generated recap of your proxy session">
      <div className="max-w-4xl mx-auto space-y-5 no-print:space-y-5">

        {/* Header card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mp-card p-6 flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Session Overview</h2>
            {meeting?.created_at && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {new Date(meeting.created_at).toLocaleDateString()} at {new Date(meeting.created_at).toLocaleTimeString()}
              </p>
            )}
            {meeting?.meet_link && (
              <p className="text-xs mt-2 font-mono truncate max-w-xs" style={{ color: 'var(--orange)' }}>
                {meeting.meet_link}
              </p>
            )}
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-black" style={{ color: 'var(--orange)' }}>{meeting?.questions_answered || 0}</p>
              <p className="text-xs uppercase font-bold mt-1" style={{ color: 'var(--text-muted)' }}>Questions</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black" style={{ color: '#22c55e' }}>{duration}m</p>
              <p className="text-xs uppercase font-bold mt-1" style={{ color: 'var(--text-muted)' }}>Duration</p>
            </div>
          </div>
        </motion.div>

        {/* AI Summary */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mp-card overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>🤖 AI-Generated Summary</h3>
              {summary && (
                <div className="flex gap-2 no-print">
                  <button onClick={copy} className="mp-btn-ghost px-3 py-1.5 text-xs">Copy</button>
                  <button onClick={() => window.print()} className="mp-btn-ghost px-3 py-1.5 text-xs">Save PDF</button>
                </div>
              )}
            </div>

            {summary ? (
              <div
                className="p-5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                {summary}
              </div>
            ) : (
              <div className="text-center py-12 rounded-xl" style={{ border: '2px dashed var(--border)' }}>
                <div className="text-4xl mb-4">✨</div>
                <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>No summary generated yet.</p>
                <button onClick={generate} disabled={generating} className="mp-btn-primary px-8 py-3">
                  {generating ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing transcript…
                    </span>
                  ) : '✨ Generate AI Summary'}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Transcript */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mp-card overflow-hidden no-print">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full flex items-center justify-between p-6 text-left transition-colors"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <h3 className="font-bold">📝 Full Meeting Transcript</h3>
            <span
              className="text-xs px-3 py-1.5 rounded-lg transition-transform"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                transform: showTranscript ? 'rotate(180deg)' : 'none',
                display: 'inline-block',
              }}
            >
              ▼
            </span>
          </button>

          <AnimatePresence>
            {showTranscript && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6">
                  <pre
                    className="text-xs leading-relaxed whitespace-pre-wrap p-4 rounded-xl overflow-x-auto"
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {transcript || 'No transcript recorded during this session.'}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Back button */}
        <div className="text-center pt-2 no-print">
          <button
            onClick={() => navigate('/meeting/history')}
            className="mp-btn-ghost px-6 py-2.5 text-sm"
          >
            ← Back to History
          </button>
        </div>
      </div>
    </PageShell>
  )
}
