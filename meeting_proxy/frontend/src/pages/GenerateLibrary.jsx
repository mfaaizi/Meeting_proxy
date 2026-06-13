import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import api from '../api'

const defaults = [
  'Can you introduce yourself?',
  'What are your core strengths?',
  'How do you manage your current project?',
  'What is your background?',
  'How do you collaborate with teams?',
  'How do you solve problems?',
  'How do you communicate updates?',
  'What are your goals this year?',
  'What tools do you prefer?',
  'How do you handle feedback?',
]

export default function GenerateLibrary() {
  const [items, setItems] = useState(defaults.map((q) => ({ question: q, status: 'pending' })))
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const pollRef = useRef(null)

  const loadLibrary = async () => {
    try {
      const res = await api.get('/api/library')
      const backendItems = res.data?.items || res.data || []
      if (backendItems.length > 0) setItems(backendItems)
    } catch {
      // Keep page usable even if endpoint is unavailable.
    }
  }

  useEffect(() => {
    loadLibrary()
    return () => clearInterval(pollRef.current)
  }, [])

  const generateAll = async () => {
    setLoading(true)
    setProgress('Starting generation...')
    try {
      await api.post('/api/library/generate', {})
      toast.success('Library generation started')
      pollRef.current = setInterval(async () => {
        await loadLibrary()
      }, 5000)
      setProgress('Generating 1/10...')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to start generation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell title="Generate Your Avatar Library">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          Pre-generate videos for common questions so your avatar answers quickly during meetings.
        </p>
        <p className="mb-6 text-sm text-amber-600">This uses 10 D-ID credits.</p>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={`${item.question}-${idx}`} className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <span>{item.question}</span>
              <span>
                {item.status === 'ready' ? '✅ Generated' : item.status === 'failed' ? '❌ Failed' : '⏳ Pending'}
              </span>
            </div>
          ))}
        </div>

        {progress && <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{progress}</p>}

        <button
          type="button"
          onClick={generateAll}
          disabled={loading}
          className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Generating...' : 'Generate All Videos'}
        </button>
      </div>
    </PageShell>
  )
}
