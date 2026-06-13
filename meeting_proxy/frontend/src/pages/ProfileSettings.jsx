import { useEffect, useState } from 'react'
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
      toast.success('Profile updated')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell title="Profile Settings">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-5 flex items-center gap-4">
          <img
            src={dbUser?.profile_picture || 'https://via.placeholder.com/72'}
            alt="Current profile"
            className="h-18 w-18 rounded-full border border-gray-200 object-cover dark:border-gray-700"
          />
          <button type="button" className="rounded-lg bg-gray-100 px-4 py-2 text-sm dark:bg-gray-800">
            Change Photo
          </button>
        </div>

        <div className="grid gap-4">
          <input value={dbUser?.name || ''} readOnly className="rounded-xl border border-gray-200 bg-gray-100 p-3 dark:border-gray-700 dark:bg-gray-800" />
          <input value={dbUser?.email || ''} readOnly className="rounded-xl border border-gray-200 bg-gray-100 p-3 dark:border-gray-700 dark:bg-gray-800" />
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={6}
            placeholder="Context / bio"
            className="rounded-xl border border-gray-200 p-3 dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            placeholder="Default meeting link"
            className="rounded-xl border border-gray-200 p-3 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>

        <button
          type="button"
          onClick={save}
          disabled={loading}
          className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </PageShell>
  )
}
