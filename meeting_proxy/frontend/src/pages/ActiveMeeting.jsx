import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import api from '../api'

function Pulse() {
  return (
    <span className="relative flex h-3 w-3 flex-shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#22c55e' }} />
      <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: '#22c55e' }} />
    </span>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="mp-card p-4">
      <p className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}

export default function ActiveMeeting() {
  const location = useLocation()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState(location.state?.meeting || null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(false)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await api.get('/api/meetings')
        const list = res.data?.items || res.data || []
        const active = list.find((m) => m.status === 'active') || list[0] || null
        setMeeting(active)
        setActivity((active?.activity || []).slice(0, 6))
      } catch {}
    }
    poll()
    const iv = setInterval(poll, 5000)
    return () => clearInterval(iv)
  }, [])

  const stop = async () => {
    if (!meeting?.id) return toast.error('No active meeting found')
    setLoading(true)
    try {
      await api.post(`/api/meetings/${meeting.id}/stop`, {})
      toast.success('Meeting stopped')
      navigate(`/meeting/summary/${meeting.id}`)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to stop meeting')
    } finally {
      setLoading(false)
    }
  }

  const duration = useMemo(() => {
    const m = Math.floor(seconds / 60)
    const s = String(seconds % 60).padStart(2, '0')
    return `${m}:${s}`
  }, [seconds])

  return (
    <PageShell>
      {/* Live header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mp-card p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ border: '1.5px solid rgba(34,197,94,0.4)', boxShadow: '0 0 30px rgba(34,197,94,0.1)' }}
      >
        <div className="flex items-center gap-3 flex-1">
          <Pulse />
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Meeting Active</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{meeting?.meet_link || 'Bot is running'}</p>
          </div>
        </div>
        <button
          onClick={stop}
          disabled={loading}
          className="mp-btn-danger px-6 py-2.5"
        >
          {loading ? 'Stopping…' : '⏹ Stop Meeting'}
        </button>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Stats + activity */}
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Duration"     value={duration} />
            <StatBox label="Questions"    value={String(meeting?.questions_answered || 0)} />
            <StatBox label="Bot Status"   value={meeting?.bot_status || 'Listening'} />
            <StatBox label="Audio"        value="CABLE ✅" />
          </div>

          <div>
            <p className="mp-section-title">Live Activity</p>
            <div className="space-y-3">
              {activity.length === 0 ? (
                <div className="mp-card p-8 text-center">
                  <div className="text-3xl mb-3 animate-pulse">👂</div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Listening for questions…</p>
                </div>
              ) : (
                activity.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="mp-card p-4"
                  >
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--orange)' }}>
                      Q: {item.question || 'Question received'}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      A: {item.answer || 'Answer generated'}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tips sidebar */}
        <div className="space-y-5">
          <div className="mp-card p-5">
            <p className="mp-section-title">💡 Tips</p>
            <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {[
                'Ask questions clearly and pause briefly.',
                'The bot needs 2–3 seconds to process audio.',
                'Trigger words like "What", "How", "Tell me" work best.',
                'Avoid background noise for better transcription.',
              ].map((tip) => (
                <div key={tip} className="flex gap-2">
                  <span style={{ color: 'var(--orange)' }} className="flex-shrink-0">→</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mp-card p-5">
            <p className="mp-section-title">🔊 Audio Chain</p>
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {['OBS plays video', '→ Desktop audio', '→ CABLE Input', '→ Meet mic (CABLE Output)', '→ Other participant hears avatar'].map((s) => (
                <p key={s}>{s}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
