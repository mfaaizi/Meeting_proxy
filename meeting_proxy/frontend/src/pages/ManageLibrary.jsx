import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import api from '../api'

const FILTERS = ['all', 'ready', 'pending', 'failed']
const statusClass = { ready: 'status-ready', pending: 'status-pending', failed: 'status-failed' }
const statusIcon  = { ready: '✅', pending: '⏳', failed: '❌' }

export default function ManageLibrary() {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [previewUrl, setPreviewUrl] = useState('')
  const [regenId, setRegenId] = useState(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    try {
      const res = await api.get('/api/library')
      setItems(res.data?.items || res.data || [])
    } catch {
      setItems([])
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let list = filter === 'all' ? items : items.filter((i) => i.status === filter)
    if (search) list = list.filter((i) => (i.question || '').toLowerCase().includes(search.toLowerCase()))
    return list
  }, [items, filter, search])

  const counts = useMemo(() => ({
    all: items.length,
    ready: items.filter((i) => i.status === 'ready').length,
    pending: items.filter((i) => i.status === 'pending').length,
    failed: items.filter((i) => i.status === 'failed').length,
  }), [items])

  const regenerate = async (item) => {
    setRegenId(item.id)
    try {
      await api.post('/api/library/generate', { question: item.question })
      toast.success('Regeneration started')
      await load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to regenerate')
    } finally {
      setRegenId(null)
    }
  }

  return (
    <PageShell title="Avatar Library" subtitle="Manage your pre-generated video responses">

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-3 mb-6"
      >
        {/* Filter tabs */}
        <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: filter === f ? 'var(--orange)' : 'transparent',
                color: filter === f ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {f[0].toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions…"
          className="mp-input flex-1 min-w-[160px]"
          style={{ padding: '8px 12px' }}
        />

        <Link to="/library/custom-qa" className="mp-btn-primary px-4 py-2 text-sm whitespace-nowrap">
          + Add Custom Q
        </Link>
      </motion.div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="mp-card p-16 text-center">
          <div className="text-5xl mb-4">📚</div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No videos found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {items.length === 0 ? 'Generate your library to get started.' : 'Try a different filter or search.'}
          </p>
          {items.length === 0 && (
            <Link to="/library/generate" className="mp-btn-primary mt-5 px-6 py-2.5 inline-block">
              Generate Library
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((item, i) => (
              <motion.div
                key={item.id || item.question}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.03 }}
                className="mp-card p-5"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                  >
                    {statusIcon[item.status] || '⏳'}
                  </div>
                  <p className="text-sm font-medium leading-snug flex-1" style={{ color: 'var(--text-primary)' }}>
                    {item.question}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className={statusClass[item.status] || 'status-pending'}>{item.status || 'pending'}</span>
                  <div className="flex gap-2">
                    {item.video_path && (
                      <button
                        onClick={() => setPreviewUrl(item.video_path)}
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      >
                        Preview
                      </button>
                    )}
                    <button
                      onClick={() => regenerate(item)}
                      disabled={regenId === item.id}
                      className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid var(--border)', color: 'var(--orange)' }}
                    >
                      {regenId === item.id ? (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin" />
                          …
                        </span>
                      ) : 'Regen'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Preview modal */}
      <Dialog open={!!previewUrl} onClose={() => setPreviewUrl('')} className="relative z-50">
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            className="w-full max-w-2xl rounded-2xl p-6"
            style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                Video Preview
              </DialogTitle>
              <button onClick={() => setPreviewUrl('')} style={{ color: 'var(--text-muted)' }}>
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            {previewUrl ? (
              <video controls className="w-full rounded-xl" src={previewUrl} style={{ border: '1px solid var(--border)' }} />
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No video URL available</p>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </PageShell>
  )
}
