import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'

export default function ProfileSettings() {
  const { dbUser, refreshDbUser } = useAuth()
  const [context, setContext] = useState('')
  const [meetLink, setMeetLink] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setContext(dbUser?.context || '')
    setMeetLink(dbUser?.meet_link || '')
  }, [dbUser])

  const save = async () => {
    setLoading(true)
    try {
      await api.put('/api/profile', { context, meet_link: meetLink })
      await refreshDbUser()
      toast.success('Profile updated!')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  const MAX = 1000

  return (
    <PageShell title="Profile Settings" subtitle="Update your avatar context and default meeting link">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Avatar card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mp-card p-6">
          <p className="mp-section-title">🎭 Avatar Identity</p>
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <img
                src={dbUser?.profile_picture || 'https://via.placeholder.com/72'}
                referrerPolicy="no-referrer"
                alt="avatar"
                className="w-20 h-20 rounded-xl object-cover"
                style={{ border: '2px solid var(--orange)' }}
              />
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                style={{ background: '#22c55e', border: '2px solid var(--bg)' }}
              >
                ✓
              </div>
            </div>
            <div>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{dbUser?.name || '—'}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{dbUser?.email || '—'}</p>
              <p className="text-xs mt-2 px-2 py-1 rounded-lg inline-block" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                Google Account ✅
              </p>
            </div>
          </div>
        </motion.div>

        {/* Context */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mp-card p-6">
          <div className="flex items-center justify-between mb-1">
            <p className="mp-section-title mb-0">🧠 Your Context / Bio</p>
            <span className="text-xs" style={{ color: context.length > MAX * 0.9 ? '#f59e0b' : 'var(--text-muted)' }}>
              {context.length}/{MAX}
            </span>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Your avatar uses this to answer questions during meetings.
          </p>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value.slice(0, MAX))}
            rows={7}
            placeholder="I am [Name], a [role] at [company/university]…"
            className="mp-input resize-none"
            style={{ lineHeight: '1.6' }}
          />
          <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(context.length / MAX) * 100}%`,
                background: context.length > MAX * 0.9 ? '#f59e0b' : 'var(--orange)',
              }}
            />
          </div>
        </motion.div>

        {/* Meeting link */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mp-card p-6">
          <p className="mp-section-title">🔗 Default Meeting Link</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Pre-filled when you start or schedule a new meeting.
          </p>
          <input
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            className="mp-input"
          />
        </motion.div>

        {/* Save */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <button onClick={save} disabled={loading} className="mp-btn-primary w-full py-3 text-base">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </span>
            ) : '💾 Save Changes'}
          </button>
        </motion.div>
      </div>
    </PageShell>
  )
}
