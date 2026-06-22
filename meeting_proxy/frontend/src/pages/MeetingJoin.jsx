import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import MouseGlow from '../components/MouseGlow'
import PageBackground from '../components/PageBackground'

const CHECKS = [
  { key: 'obs',    icon: '🎬', label: 'OBS Studio is open',          sub: 'Virtual Camera must be started' },
  { key: 'cable',  icon: '🔊', label: 'VB-Audio Cable is installed',  sub: 'For audio routing to meeting' },
  { key: 'chrome', icon: '🌐', label: 'Chrome browser is available',  sub: 'Bot will open Chrome automatically' },
]

export default function MeetingJoin() {
  const { sessionId } = useParams()
  const { dbUser } = useAuth()
  const navigate = useNavigate()
  const [meetLink, setMeetLink] = useState('')
  const [joining, setJoining] = useState(false)
  const [checklist, setChecklist] = useState({ obs: false, cable: false, chrome: false })

  useEffect(() => {
    if (dbUser?.meet_link) setMeetLink(dbUser.meet_link)
  }, [dbUser])

  const allChecked = Object.values(checklist).every(Boolean)

  const join = async () => {
    if (!meetLink.trim()) return toast.error('Please enter a meeting link')
    if (!allChecked) return toast.error('Please complete the checklist first')
    setJoining(true)
    try {
      await axios.post(`/api/meeting-prep/join/${sessionId}`, { meet_link: meetLink }, { withCredentials: true })
      toast.success('Bot is joining the meeting!')
      navigate('/meeting/active')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to join meeting')
      setJoining(false)
    }
  }

  const toggle = (key) => setChecklist((p) => ({ ...p, [key]: !p[key] }))

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text-primary)' }} className="min-h-screen flex items-center justify-center p-4">
      <PageBackground />
      <MouseGlow />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-2xl font-bold mb-1">
            <span style={{ color: 'var(--text-primary)' }}>Meeting</span>
            <span style={{ color: 'var(--orange)' }}>Proxy</span>
          </div>
        </div>

        <div className="mp-card p-8 relative" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
            <div style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,107,53,0.1), transparent 60%)', height: '100%' }} />
          </div>
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="mp-badge px-5 py-1.5 text-xs">JOIN</span>
          </div>

          <div className="relative z-10">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">✅</div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Videos Ready!</h1>
              <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>Session: {sessionId}</p>
            </div>

            {/* Meet link */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>🔗 MEETING LINK</label>
              <input
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                className="mp-input"
              />
            </div>

            {/* Checklist */}
            <div className="mb-6">
              <label className="block text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>PRE-JOIN CHECKLIST</label>
              <div className="space-y-3">
                {CHECKS.map((item) => (
                  <div
                    key={item.key}
                    onClick={() => toggle(item.key)}
                    className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: checklist[item.key] ? 'rgba(34,197,94,0.08)' : 'var(--bg-input)',
                      border: `1px solid ${checklist[item.key] ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                      style={{
                        background: checklist[item.key] ? '#22c55e' : 'transparent',
                        border: `1.5px solid ${checklist[item.key] ? '#22c55e' : 'var(--border)'}`,
                        color: '#fff',
                      }}
                    >
                      {checklist[item.key] ? '✓' : ''}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.icon} {item.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={join}
              disabled={joining || !meetLink}
              className="mp-btn-primary w-full py-3.5 text-base"
              style={{
                background: allChecked && meetLink
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : 'linear-gradient(135deg, var(--orange), var(--orange-dark))',
                opacity: !meetLink || joining ? 0.6 : 1,
              }}
            >
              {joining ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Bot is joining…
                </span>
              ) : '🚀 Join Meeting as Avatar'}
            </button>

            {joining && (
              <div className="mt-4 p-4 rounded-xl text-center" style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--orange)' }}>
                  🤖 Chrome is opening and joining the meeting. Check your desktop!
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
