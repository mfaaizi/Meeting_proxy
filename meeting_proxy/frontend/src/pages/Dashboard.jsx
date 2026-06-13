import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import PageShell from '../components/PageShell'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'

export default function Dashboard() {
  const { dbUser } = useAuth()
  const [library, setLibrary] = useState([])
  const [meetings, setMeetings] = useState([])

  useEffect(() => {
    // Load dashboard data in parallel-friendly simple calls.
    api.get('/api/library').then((res) => setLibrary(res.data?.items || res.data || [])).catch(() => {})
    api.get('/api/meetings').then((res) => setMeetings(res.data?.items || res.data || [])).catch(() => {})
  }, [])

  const readyVideos = useMemo(
    () => library.filter((item) => item.status === 'ready').length,
    [library]
  )
  const totalQuestions = useMemo(
    () => meetings.reduce((sum, m) => sum + (m.questions_answered || 0), 0),
    [meetings]
  )

  const checklist = [
    !!dbUser?.photo_url,
    !!dbUser?.context,
    readyVideos > 0,
  ]
  const checklistPercent = Math.round((checklist.filter(Boolean).length / checklist.length) * 100)

  return (
    <PageShell title={`Welcome back, ${dbUser?.name || 'there'}! 👋`}>
      <div className="mb-8 flex items-center gap-4">
        <img
          src={dbUser?.profile_picture || 'https://via.placeholder.com/64'}
          alt="Profile"
          className="h-16 w-16 rounded-full border border-gray-200 object-cover dark:border-gray-700"
        />
        <p className="text-gray-600 dark:text-gray-300">Here is your meeting proxy overview.</p>
      </div>

      <div className="mb-8">
        <Link 
          to="/meeting/prep"
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-6 rounded-2xl font-bold text-xl shadow-lg hover:opacity-90 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01]"
        >
          🎯 Prepare & Join Meeting
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="📚 Library Videos" value={String(readyVideos)} />
        <StatCard title="🎭 Avatar Status" value={dbUser?.photo_url ? 'Ready' : 'Not Ready'} />
        <StatCard title="📅 Total Meetings" value={String(meetings.length)} />
        <StatCard title="❓ Questions Answered" value={String(totalQuestions)} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <ActionButton to="/meeting/setup" label="🚀 Join Directly" />
        <ActionButton to="/library/manage" label="📚 Manage Library" />
        <ActionButton to="/library/custom-qa" label="➕ Add Questions" />
      </div>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-xl font-semibold">Recent Meetings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-gray-500 dark:text-gray-300">
              <tr>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Duration</th>
                <th className="pb-2 pr-4">Questions</th>
                <th className="pb-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {meetings.slice(0, 5).map((m) => (
                <tr key={m.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="py-2 pr-4">{m.created_at || '-'}</td>
                  <td className="py-2 pr-4">{m.duration || '-'}</td>
                  <td className="py-2 pr-4">{m.questions_answered || 0}</td>
                  <td className="py-2 pr-4">{m.status || 'pending'}</td>
                </tr>
              ))}
              {meetings.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-gray-500 dark:text-gray-400">No meetings yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-2 text-xl font-semibold">Setup Checklist</h2>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{checklistPercent}% completed</p>
        <ul className="space-y-2 text-sm">
          <li>{checklist[0] ? '✅' : '⬜'} Upload photo</li>
          <li>{checklist[1] ? '✅' : '⬜'} Add your context</li>
          <li>{checklist[2] ? '✅' : '⬜'} Generate library videos</li>
        </ul>
      </section>
    </PageShell>
  )
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-300">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

function ActionButton({ to, label }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-center font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300"
    >
      {label}
    </Link>
  )
}
