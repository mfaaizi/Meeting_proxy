import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'

export default function MeetingSetup() {
  const { dbUser } = useAuth()
  const navigate = useNavigate()
  const [meetLink, setMeetLink] = useState(dbUser?.meet_link || '')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [scheduledList, setScheduledList] = useState([])
  const [scheduling, setScheduling] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (dbUser?.meet_link) setMeetLink(dbUser.meet_link)
  }, [dbUser])

  const startNow = async () => {
    if (!meetLink.trim()) return toast.error('Enter a meeting link')
    setLoading(true)
    try {
      const res = await api.post('/api/meetings/join', { meet_link: meetLink })
      toast.success('Bot joining meeting…')
      navigate('/meeting/active', { state: { meeting: res.data?.meeting || null } })
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to start meeting')
    } finally {
      setLoading(false)
    }
  }

  const schedule = async () => {
    if (!scheduledDate || !scheduledTime || !meetLink) return toast.error('Fill all scheduling fields')
    setScheduling(true)
    try {
      await api.post('/api/meetings/schedule', { meet_link: meetLink, scheduled_date: scheduledDate, scheduled_time: scheduledTime })
      setScheduledList((p) => [...p, { date: scheduledDate, time: scheduledTime, link: meetLink }])
      toast.success('Meeting scheduled!')
      setScheduledDate('')
      setScheduledTime('')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to schedule')
    } finally {
      setScheduling(false)
    }
  }

  return (
    <PageShell title="Join Meeting as Avatar" subtitle="Start immediately or schedule an auto-join for later">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Left ── */}
        <div className="space-y-5">
          {/* Schedule card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mp-card p-6">
            <p className="mp-section-title">📅 Schedule Auto-Join</p>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              Set a time and the bot will automatically join when the meeting starts.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="mp-input"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Time</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="mp-input"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Meeting Link</label>
              <input
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                className="mp-input"
              />
            </div>

            <button
              onClick={schedule}
              disabled={!scheduledDate || !scheduledTime || !meetLink || scheduling}
              className="mp-btn-primary w-full py-3"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
            >
              {scheduling ? 'Scheduling…' : '📅 Schedule Bot to Auto-Join'}
            </button>

            {scheduledList.length > 0 && (
              <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>SCHEDULED</p>
                <div className="space-y-2">
                  {scheduledList.map((m, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-xl" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{m.date} at {m.time}</p>
                        <p className="text-xs truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>{m.link}</p>
                      </div>
                      <span style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                        Scheduled
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Join now card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mp-card p-6">
            <p className="mp-section-title">⚡ Join Right Now</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Enter a link and join immediately as your avatar.
            </p>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Meeting Link</label>
            <input
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              placeholder="https://meet.google.com/…"
              className="mp-input mb-4"
            />
            <button
              onClick={startNow}
              disabled={loading}
              className="mp-btn-primary w-full py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Bot is joining…
                </span>
              ) : '🚀 Start Avatar Bot Now'}
            </button>
          </motion.div>
        </div>

        {/* ── Right ── */}
        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mp-card p-6">
            <p className="mp-section-title">🔧 Prerequisites</p>
            <div className="space-y-3">
              {[
                { icon: '🎬', text: 'OBS Virtual Camera running' },
                { icon: '🔊', text: 'VB-Audio Cable installed' },
                { icon: '📚', text: 'Library videos generated' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span className="text-green-400 text-base">✅</span>
                  {item.icon} {item.text}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mp-card p-6">
            <p className="mp-section-title">📖 Quick Setup Guide</p>
            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    How to set up OBS?
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--orange)' }} />
                  </DisclosureButton>
                  <DisclosurePanel className="px-1 pt-3 text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
                    <p>1. Open OBS → click <strong style={{ color: 'var(--text-primary)' }}>Start Virtual Camera</strong>.</p>
                    <p>2. Create a <strong style={{ color: 'var(--text-primary)' }}>Browser Source</strong> pointing to your Flask stream URL.</p>
                    <p>3. In Google Meet, select <strong style={{ color: 'var(--text-primary)' }}>CABLE Output</strong> as mic.</p>
                    <p>4. Select <strong style={{ color: 'var(--text-primary)' }}>OBS Virtual Camera</strong> as video.</p>
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>
          </motion.div>
        </div>
      </div>
    </PageShell>
  )
}
