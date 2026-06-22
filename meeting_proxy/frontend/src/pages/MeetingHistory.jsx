import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageShell from '../components/PageShell'
import api from '../api'

export default function MeetingHistory() {
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/api/meetings').then((r) => setMeetings(r.data?.items || r.data || [])).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    return meetings.filter((m) => {
      const d = new Date(m.created_at || m.started_at || Date.now())
      const fromOk = fromDate ? d >= new Date(fromDate) : true
      const toOk   = toDate   ? d <= new Date(toDate)   : true
      const searchOk = search ? (m.meet_link || '').toLowerCase().includes(search.toLowerCase()) : true
      return fromOk && toOk && searchOk
    })
  }, [meetings, fromDate, toDate, search])

  const statusClass = { active: 'status-active', completed: 'status-ready', failed: 'status-failed', pending: 'status-pending' }

  return (
    <PageShell title="Meeting History" subtitle="Browse past sessions and view AI summaries">

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mp-card p-4 mb-6 flex flex-wrap gap-3 items-center"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by link…"
          className="mp-input flex-1 min-w-[160px]"
          style={{ padding: '8px 12px' }}
        />
        <div className="flex gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mp-input" style={{ padding: '6px 10px' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mp-input" style={{ padding: '6px 10px' }} />
          </div>
        </div>
        {(fromDate || toDate || search) && (
          <button
            onClick={() => { setFromDate(''); setToDate(''); setSearch('') }}
            className="mp-btn-ghost text-xs px-3 py-2"
          >
            Clear
          </button>
        )}
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mp-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-5xl mb-4">📅</div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No meetings found</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {meetings.length === 0 ? 'Start your first session to see it here.' : 'Try adjusting the filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Meeting Link', 'Duration', 'Questions', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <motion.tr
                    key={m.id || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    onClick={() => m.id && navigate(`/meeting/summary/${m.id}`)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="truncate block font-mono text-xs" style={{ color: 'var(--orange)' }}>
                        {m.meet_link || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{m.duration || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{m.questions_answered || 0}</td>
                    <td className="px-4 py-3">
                      <span className={statusClass[m.status] || 'status-pending'}>{m.status || 'pending'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {m.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/meeting/summary/${m.id}`) }}
                          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                          style={{ background: 'rgba(255,107,53,0.1)', color: 'var(--orange)', border: '1px solid var(--border)' }}
                        >
                          Summary →
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Stats footer */}
      {meetings.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span>Total: <strong style={{ color: 'var(--text-primary)' }}>{meetings.length}</strong></span>
          <span>Showing: <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong></span>
          <span>Questions answered: <strong style={{ color: 'var(--orange)' }}>
            {meetings.reduce((s, m) => s + (m.questions_answered || 0), 0)}
          </strong></span>
        </div>
      )}
    </PageShell>
  )
}
