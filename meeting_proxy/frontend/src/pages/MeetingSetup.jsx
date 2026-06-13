import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'

export default function MeetingSetup() {
  const { dbUser } = useAuth()
  const navigate = useNavigate()
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [meetLink, setMeetLink] = useState(
    dbUser?.meet_link || ''
  );
  const [scheduledList, setScheduledList] = useState([]);
  const [scheduling, setScheduling] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load saved meeting link from user profile
  useEffect(() => {
    if (dbUser?.meet_link) {
      setMeetLink(dbUser.meet_link)
    }
  }, [dbUser])

  // Function to join the meeting immediately
  const startMeeting = async () => {
    if (!meetLink.trim()) return toast.error('Please enter a meeting link')
    setLoading(true)
    try {
      const res = await api.post('/api/meetings/join', { meet_link: meetLink })
      toast.success('Bot joining meeting...')
      navigate('/meeting/active', { state: { meeting: res.data?.meeting || null } })
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to start meeting')
    } finally {
      setLoading(false)
    }
  }

  // Function to schedule a meeting for auto-join
  const scheduleMeeting = async () => {
    if (!scheduledDate || !scheduledTime || !meetLink) {
      return toast.error('Please fill in all scheduling fields')
    }
    setScheduling(true)
    try {
      await api.post('/api/meetings/schedule', {
        meet_link: meetLink,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      })
      setScheduledList(prev => [...prev, { date: scheduledDate, time: scheduledTime, link: meetLink }])
      toast.success('Meeting scheduled! Bot will auto-join at the set time.')
      setScheduledDate('')
      setScheduledTime('')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to schedule meeting')
    } finally {
      setScheduling(false)
    }
  }

  return (
    <PageShell title="Join Meeting as Avatar">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Meeting Scheduler Section */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
              📅 Schedule Auto-Join
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Set a time and the bot will automatically join when the meeting starts.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium mb-1 dark:text-gray-300">Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 dark:text-gray-300">Time</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-medium mb-1 dark:text-gray-300">Meeting Link</label>
              <input
                type="text"
                value={meetLink}
                onChange={e => setMeetLink(e.target.value)}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-purple-5 00 outline-none"
              />
            </div>
            <button
              onClick={scheduleMeeting}
              disabled={!scheduledDate || !scheduledTime || !meetLink || scheduling}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl disabled:opacity-50 font-bold transition-all shadow-lg shadow-purple-500/20 active:scale-[0.98]"
            >
              {scheduling ? 'Scheduling...' : '📅 Schedule Bot to Auto-Join'}
            </button>
            {/* List of scheduled meetings */}
            {scheduledList.length > 0 && (
              <div className="mt-6 border-t dark:border-gray-700 pt-6">
                <h3 className="text-sm font-bold mb-3 dark:text-white">Scheduled for Today</h3>
                <div className="space-y-2">
                  {scheduledList.map((m, i) => (
                    <div key={i} className="flex justify-between items-center bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                      <div>
                        <p className="text-sm font-bold dark:text-white">{m.date} at {m.time}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">{m.link}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Scheduled</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Immediate Join Section */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 text-xl font-bold dark:text-white">Join Right Now</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter a link and join the meeting immediately as an avatar.
            </p>
            <label className="block text-xs font-medium mb-1 dark:text-gray-300">Meeting Link</label>
            <input
              value={meetLink}
              onChange={e => setMeetLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="button"
              onClick={startMeeting}
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 font-bold text-white disabled:opacity-60 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
            >
              {loading ? 'Bot is joining...' : '🚀 Start Avatar Bot Now'}
            </button>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 text-xl font-bold dark:text-white">Prerequisites</h2>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm dark:text-gray-300"><span className="text-green-500">✅</span> OBS Virtual Camera running</li>
              <li className="flex items-center gap-2 text-sm dark:text-gray-300"><span className="text-green-500">✅</span> VB-Audio Cable installed</li>
              <li className="flex items-center gap-2 text-sm dark:text-gray-300"><span className="text-green-500">✅</span> Library videos generated</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold dark:text-white">Quick Setup Guide</h2>
            <Disclosure>
              {({ open }) => (
                <>
                  <DisclosureButton className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-4 py-4 text-left font-medium dark:bg-gray-700 dark:text-white transition-colors hover:bg-gray-100 dark:hover:bg-gray-600">
                    <span>How to set up OBS?</span>
                    <ChevronDownIcon className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </DisclosureButton>
                  <DisclosurePanel className="mt-4 space-y-3 px-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>1. Open OBS and click <strong>Start Virtual Camera</strong>.</p>
                    <p>2. Create a <strong>Browser Source</strong> in OBS pointing to your Flask video stream URL.</p>
                    <p>3. In your meeting settings, select <strong>CABLE Output</strong> as your microphone.</p>
                    <p>4. Select <strong>OBS Virtual Camera</strong> as your video input.</p>
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>
          </section>
        </div>
      </div>
    </PageShell>
  )
}
