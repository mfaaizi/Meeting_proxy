import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import api from '../api'

export default function ManageLibrary() {
  // Manage generated videos and quickly preview/regenerate failed items.
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [previewUrl, setPreviewUrl] = useState('')
  const [regeneratingId, setRegeneratingId] = useState(null)

  const load = async () => {
    try {
      const res = await api.get('/api/library')
      setItems(res.data?.items || res.data || [])
    } catch {
      setItems([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.status === filter)),
    [items, filter]
  )

  const regenerate = async (item) => {
    setRegeneratingId(item.id)
    try {
      await api.post('/api/library/generate', { question: item.question })
      toast.success('Regeneration started')
      await load()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to regenerate')
    } finally {
      setRegeneratingId(null)
    }
  }

  return (
    <PageShell title="Your Avatar Library">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {['all', 'ready', 'pending', 'failed'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-lg px-3 py-2 text-sm ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            {key[0].toUpperCase() + key.slice(1)}
          </button>
        ))}
        <Link to="/library/custom-qa" className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
          Add Custom Question
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <div key={item.id || item.question} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="mb-2 font-semibold">{item.question}</p>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Status: {item.status || 'pending'}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewUrl(item.video_path)}
                className="rounded-lg bg-gray-200 px-3 py-2 text-sm dark:bg-gray-800"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => regenerate(item)}
                disabled={regeneratingId === item.id}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                {regeneratingId === item.id ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!previewUrl} onClose={() => setPreviewUrl('')} className="relative z-50">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-2xl rounded-2xl bg-white p-6 dark:bg-gray-900">
            <DialogTitle className="mb-4 text-xl font-bold">Video Preview</DialogTitle>
            {previewUrl ? (
              <video controls className="w-full rounded-xl" src={previewUrl} />
            ) : (
              <p>No video URL available</p>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </PageShell>
  )
}
