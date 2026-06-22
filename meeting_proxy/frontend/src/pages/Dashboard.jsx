import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import PageShell from '../components/PageShell'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'

function StatCard({ icon, title, value, sub, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mp-card p-5"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
        {title}
      </p>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </motion.div>
  )
}

function QuickAction({ to, icon, label, desc }) {
  return (
    <Link to={to}>
      <motion.div
        whileHover={{ y: -3 }}
        className="mp-card p-5 flex items-center gap-4 cursor-pointer"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'rgba(255,107,53,0.12)', border: '1px solid var(--border)' }}
        >
          {icon}
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{label}</p>
          {desc && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>}
        </div>
      </motion.div>
    </Link>
  )
}

export default function Dashboard() {
  const { dbUser } = useAuth()
  const [library, setLibrary] = useState([])
  const [meetings, setMeetings] = useState([])

  useEffect(() => {
    api.get('/api/library').then((r) => setLibrary(r.data?.items || r.data || [])).catch(() => {})
    api.get('/api/meetings').then((r) => setMeetings(r.data?.items || r.data || [])).catch(() => {})
  }, [])

  const readyVideos = useMemo(() => library.filter((i) => i.status === 'ready').length, [library])
  const totalQ = useMemo(() => meetings.reduce((s, m) => s + (m.questions_answered || 0), 0), [meetings])

  const checklist = [!!dbUser?.photo_url, !!dbUser?.context, readyVideos > 0]
  const pct = Math.round((checklist.filter(Boolean).length / checklist.length) * 100)

  const statusMap = { ready: 'status-ready', pending: 'status-pending', failed: 'status-failed', active: 'status-active' }

  return (
    <PageShell>
      {/* ── Welcome banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mp-card p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ boxShadow: '0 0 50px rgba(255,107,53,0.15)' }}
      >
        <img
          src={dbUser?.profile_picture || 'https://via.placeholder.com/56'}
          referrerPolicy="no-referrer"
          alt="avatar"
          className="w-14 h-14 rounded-full object-cover flex-shrink-0"
          style={{ border: '2px solid var(--orange)' }}
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Welcome back, <span style={{ color: 'var(--orange)' }}>{dbUser?.name?.split(' ')[0] || 'there'}</span> 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Your meeting proxy is ready · {readyVideos} videos in library
          </p>
        </div>
        <Link
          to="/meeting/prep"
          className="mp-btn-primary px-6 py-2.5 whitespace-nowrap"
        >
          🎯 New Meeting
        </Link>
      </motion.div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="📚" title="Library Videos" value={readyVideos} sub="ready to use" delay={0.05} />
        <StatCard icon="🎭" title="Avatar" value={dbUser?.photo_url ? 'Ready' : 'Setup needed'} delay={0.1} />
        <StatCard icon="📅" title="Total Meetings" value={meetings.length} delay={0.15} />
        <StatCard icon="❓" title="Questions Answered" value={totalQ} delay={0.2} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left col: quick actions + recent meetings ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick actions */}
          <div>
            <p className="mp-section-title">Quick Actions</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <QuickAction to="/meeting/prep"     icon="🚀" label="Prepare & Join"     desc="Start a meeting session" />
              <QuickAction to="/library/generate" icon="⚡" label="Generate Library"   desc="Create avatar videos" />
              <QuickAction to="/library/custom-qa" icon="➕" label="Add Questions"     desc="Custom Q&A pairs" />
              <QuickAction to="/meeting/history"  icon="📋" label="Meeting History"    desc="Past sessions & summaries" />
            </div>
          </div>

          {/* Recent meetings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="mp-section-title mb-0">Recent Meetings</p>
              <Link to="/meeting/history" className="text-xs" style={{ color: 'var(--orange)' }}>
                View all →
              </Link>
            </div>
            <div className="mp-card overflow-hidden">
              {meetings.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-3xl mb-3">📅</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No meetings yet. Start your first session!</p>
                  <Link to="/meeting/prep" className="mp-btn-primary mt-4 px-5 py-2 text-sm">
                    Start Meeting
                  </Link>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Date', 'Duration', 'Questions', 'Status'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.slice(0, 5).map((m, i) => (
                      <tr
                        key={m.id || i}
                        style={{ borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}
                        className="hover:opacity-80 transition-opacity"
                      >
                        <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{m.created_at || '—'}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{m.duration || '—'}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{m.questions_answered || 0}</td>
                        <td className="px-4 py-3">
                          <span className={statusMap[m.status] || 'status-pending'}>
                            {m.status || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ── Right col: checklist + library preview ── */}
        <div className="space-y-6">
          {/* Setup checklist */}
          <div className="mp-card p-5">
            <p className="mp-section-title">Setup Checklist</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--orange), var(--orange-dark))' }}
                />
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--orange)' }}>{pct}%</span>
            </div>
            <div className="space-y-3">
              {[
                { done: checklist[0], label: 'Upload photo', to: '/onboarding/photo' },
                { done: checklist[1], label: 'Add your context', to: '/onboarding/context' },
                { done: checklist[2], label: 'Generate library videos', to: '/library/generate' },
              ].map((item) => (
                <Link key={item.label} to={item.done ? '#' : item.to} className="flex items-center gap-3 group">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all"
                    style={{
                      background: item.done ? 'var(--orange)' : 'transparent',
                      border: `1.5px solid ${item.done ? 'var(--orange)' : 'var(--border)'}`,
                      color: '#fff',
                    }}
                  >
                    {item.done ? '✓' : ''}
                  </div>
                  <span
                    className="text-sm"
                    style={{ color: item.done ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: item.done ? 'line-through' : 'none' }}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Library preview */}
          <div className="mp-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="mp-section-title mb-0">Library Status</p>
              <Link to="/library/manage" className="text-xs" style={{ color: 'var(--orange)' }}>Manage →</Link>
            </div>
            {library.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No videos generated yet</p>
                <Link to="/library/generate" className="mp-btn-primary mt-3 px-4 py-2 text-xs">
                  Generate Now
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {library.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                    <p className="text-xs truncate flex-1 mr-2" style={{ color: 'var(--text-secondary)' }}>
                      {item.question}
                    </p>
                    <span className={statusMap[item.status] || 'status-pending'}>{item.status || 'pending'}</span>
                  </div>
                ))}
                {library.length > 4 && (
                  <p className="text-xs text-center pt-1" style={{ color: 'var(--text-muted)' }}>
                    +{library.length - 4} more
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
