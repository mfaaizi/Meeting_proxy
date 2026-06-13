import { useState } from 'react'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'

export default function AccountSettings() {
  const { isDark, toggleTheme } = useTheme()
  const { dbUser } = useAuth()
  const [loading, setLoading] = useState(false)

  const clearLibrary = async () => {
    setLoading(true)
    try {
      await api.delete('/api/library')
      toast.success('Library cleared')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to clear library')
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async () => {
    if (!window.confirm('Delete account permanently?')) return
    setLoading(true)
    try {
      await api.delete('/api/account')
      toast.success('Account deleted')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to delete account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell title="Account Settings">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-3 text-xl font-semibold">Account Info</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Email: {dbUser?.email || '-'}</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Connected accounts: Google ✅</p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-3 text-xl font-semibold">Theme</h2>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm dark:bg-gray-800"
          >
            Switch to {isDark ? 'Light' : 'Dark'} mode
          </button>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
        <h2 className="mb-3 text-xl font-semibold text-red-700 dark:text-red-300">Danger Zone</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={clearLibrary}
            disabled={loading}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Clear Library
          </button>
          <button
            type="button"
            onClick={deleteAccount}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Delete Account
          </button>
        </div>
      </section>
    </PageShell>
  )
}
