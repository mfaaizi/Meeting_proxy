import { useEffect, useMemo, useState } from 'react'
import PageShell from '../components/PageShell'
import api from '../api'

export default function MeetingHistory() {
  const [meetings, setMeetings] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    api.get('/api/meetings').then((res) => setMeetings(res.data?.items || res.data || [])).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    return meetings.filter((m) => {
      const d = new Date(m.created_at || m.started_at || Date.now())
      const fromOk = fromDate ? d >= new Date(fromDate) : true
      const toOk = toDate ? d <= new Date(toDate) : true
      return fromOk && toOk
    })
  }, [meetings, fromDate, toDate])

  return (
    <PageShell title="Meeting History">
      <div className="mb-4 flex flex-wrap gap-3">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border border-gray-200 p-2 dark:border-gray-700 dark:bg-gray-900" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border border-gray-200 p-2 dark:border-gray-700 dark:bg-gray-900" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-300">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Meeting Link</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Questions</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="cursor-pointer border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                <td className="px-4 py-3">{m.created_at || '-'}</td>
                <td className="px-4 py-3">{m.meet_link || '-'}</td>
                <td className="px-4 py-3">{m.duration || '-'}</td>
                <td className="px-4 py-3">{m.questions_answered || 0}</td>
                <td className="px-4 py-3">{m.status || 'pending'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-6 text-center text-gray-500 dark:text-gray-400">No meetings yet</p>
        )}
      </div>
    </PageShell>
  )
}
