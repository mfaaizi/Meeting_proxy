import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import api from '../api'

function SettingRow({ icon, label, desc, action }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
          {desc && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export default function AccountSettings() {
  const { isDark, toggleTheme } = useTheme()
  const { dbUser } = useAuth()
  const [loading, setLoading] = useState(false)

  const clearLibrary = async () => {
    if (!window.confirm('Clear all library videos? This cannot be undone.')) return
    setLoading(true)
    try {
      await api.delete('/api/library')
      toast.success('Library cleared')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to clear library')
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async () => {
    if (!window.confirm('Permanently delete your account and all data?')) return
    setLoading(true)
    try {
      await api.delete('/api/account')
      toast.success('Account deleted')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to delete account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell title="Account Settings" subtitle="Manage your account preferences and data">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Account info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mp-card p-6">
          <p className="mp-section-title">👤 Account Information</p>
          <div className="space-y-3">
            <SettingRow icon="✉️" label="Email" desc={dbUser?.email || '—'} />
            <SettingRow
              icon="🔗"
              label="Connected Accounts"
              desc="Google OAuth via Firebase"
              action={
                <span className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                  Connected ✅
                </span>
              }
            />
          </div>
        </motion.div>

        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mp-card p-6">
          <p className="mp-section-title">🎨 Appearance</p>
          <SettingRow
            icon={isDark ? '🌙' : '☀️'}
            label="Theme"
            desc={isDark ? 'Dark mode active' : 'Light mode active'}
            action={
              <button
                onClick={toggleTheme}
                className="mp-btn-ghost px-4 py-2 text-sm"
              >
                Switch to {isDark ? 'Light' : 'Dark'}
              </button>
            }
          />
        </motion.div>

        {/* Danger zone */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-6"
          style={{ border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}
        >
          <p className="mp-section-title" style={{ color: '#ef4444' }}>⚠️ Danger Zone</p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            These actions are irreversible. Please proceed with caution.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.04)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>Clear Library</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Delete all generated avatar videos</p>
              </div>
              <button
                onClick={clearLibrary}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                {loading ? '…' : 'Clear Library'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl" style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>Delete Account</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Permanently delete your account and all data</p>
              </div>
              <button
                onClick={deleteAccount}
                disabled={loading}
                className="mp-btn-danger px-4 py-2 text-sm"
              >
                {loading ? '…' : 'Delete Account'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </PageShell>
  )
}
