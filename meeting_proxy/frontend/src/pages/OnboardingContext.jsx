import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import api from '../api'

export default function OnboardingContext() {
  // This step collects personal context used by the AI during meetings.
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const maxChars = 1000

  const saveContext = async () => {
    setLoading(true)
    try {
      await api.put('/api/profile', { context })
      toast.success('Profile context saved')
      navigate('/onboarding/qa')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to save context')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell title="Tell Us About Yourself">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-6 h-2 rounded bg-gray-200 dark:bg-gray-700">
          <div className="h-2 w-2/3 rounded bg-blue-500" />
        </div>
        <p className="mb-6 text-gray-600 dark:text-gray-300">Step 2 of 3 (66%)</p>
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          Your avatar will use this to answer questions in meetings
        </p>

        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value.slice(0, maxChars))}
          rows={10}
          className="w-full rounded-xl border border-gray-200 bg-white p-4 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          placeholder="I am [Your Name], a [your role] at [company/university]. I specialize in [skills]. My current project is [project description]..."
        />

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {context.length}/{maxChars}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={saveContext}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
          <Link to="/dashboard" className="text-sm text-gray-600 underline dark:text-gray-300">
            Skip for now
          </Link>
        </div>
      </div>
    </PageShell>
  )
}
