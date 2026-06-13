import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import api from '../api'

export default function CustomQA() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const res = await api.get('/api/custom-qa')
      setItems(res.data?.items || res.data || [])
    } catch {
      setItems([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  const add = async () => {
    if (!question.trim() || !answer.trim()) return toast.error('Please fill both fields')
    setLoading(true)
    try {
      await api.post('/api/custom-qa', { question, answer })
      toast.success('Added and generation started')
      setQuestion('')
      setAnswer('')
      await load()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to add')
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id) => {
    setLoading(true)
    try {
      await api.delete(`/api/custom-qa/${id}`)
      toast.success('Deleted')
      await load()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell title="Custom Questions & Answers">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="grid gap-4">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Question"
            className="rounded-xl border border-gray-200 p-3 dark:border-gray-700 dark:bg-gray-900"
          />
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Answer"
            rows={4}
            className="rounded-xl border border-gray-200 p-3 dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            type="button"
            onClick={add}
            disabled={loading}
            className="w-fit rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Processing...' : 'Add & Generate Video'}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
            No custom questions yet
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="font-semibold">{item.question}</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.answer}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-800">{item.status || 'pending'}</span>
              <button
                type="button"
                onClick={() => remove(item.id)}
                disabled={loading}
                className="rounded-lg bg-red-500 px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
