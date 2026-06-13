import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import api from '../api'

export default function ActiveMeeting() {
  const location = useLocation()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState(location.state?.meeting || null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(false)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    // Update duration timer every second while page is open.
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    // Poll meeting status and recent activity every 5 seconds.
    const poll = async () => {
      try {
        const res = await api.get('/api/meetings')
        const list = res.data?.items || res.data || []
        const active = list.find((m) => m.status === 'active') || list[0] || null
        setMeeting(active)
        setActivity((active?.activity || []).slice(0, 5))
      } catch {
        // Keep existing UI if endpoint is unavailable.
      }
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [])

  const stopMeeting = async () => {
    if (!meeting?.id) return toast.error('No active meeting found')
    setLoading(true)
    try {
      await api.post(`/api/meetings/${meeting.id}/stop`, {})
      toast.success('Meeting stopped')
      navigate(`/meeting/summary/${meeting.id}`)
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to stop meeting')
    } finally {
      setLoading(false)
    }
  }

  const durationText = useMemo(() => {
    const m = Math.floor(seconds / 60)
    const s = String(seconds % 60).padStart(2, '0')
    return `${m}:${s}`
  }, [seconds])

  return (
    <PageShell title="Meeting Active 🟢">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900 lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Live Status</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatusItem label="Meeting link" value={meeting?.meet_link || '-'} />
            <StatusItem label="Duration" value={durationText} />
            <StatusItem label="Questions answered" value={String(meeting?.questions_answered || 0)} />
            <StatusItem label="Bot status" value={meeting?.bot_status || 'Listening'} />
          </div>

          <h3 className="mt-6 text-lg font-semibold">Recent Activity</h3>
          <div className="mt-3 space-y-2">
            {activity.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No activity yet</p>}
            {activity.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                <p className="font-medium">Q: {item.question || 'Question received'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">A: {item.answer || 'Answer generated'}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-3 text-xl font-semibold">Tips</h2>
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
            Ask questions clearly and pause briefly to let the avatar process audio.
          </p>
          <button
            type="button"
            onClick={stopMeeting}
            disabled={loading}
            className="w-full rounded-xl bg-red-600 px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Stopping...' : 'Stop Meeting'}
          </button>
        </section>
      </div>
    </PageShell>
  )
}

function StatusItem({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}
