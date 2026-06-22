import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { HomeIcon, BookOpenIcon, VideoCameraIcon, ClockIcon, QuestionMarkCircleIcon, Cog6ToothIcon, UserCircleIcon, SunIcon, MoonIcon, Bars3Icon, XMarkIcon, PlusCircleIcon, SparklesIcon, MicrophoneIcon } from '@heroicons/react/24/outline';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/meeting/prep', label: 'New Meeting', icon: VideoCameraIcon },
  { to: '/meeting/history', label: 'History', icon: ClockIcon },
  { to: '/library/manage', label: 'Library', icon: BookOpenIcon },
  { to: '/library/generate', label: 'Generate', icon: SparklesIcon },
  { to: '/library/custom-qa', label: 'Custom Q&A', icon: PlusCircleIcon },
  { to: '/settings/voice', label: 'Voice', icon: MicrophoneIcon },
  { to: '/help', label: 'Help', icon: QuestionMarkCircleIcon },
]

const settingsItems = [
  { to: '/settings/profile', label: 'Profile', icon: UserCircleIcon },
  { to: '/settings/account', label: 'Account', icon: Cog6ToothIcon },
]

export default function Sidebar() {
  const { isDark, toggleTheme } = useTheme()
  const { dbUser, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const close = () => setMobileOpen(false)

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 mb-8">
        <Link to="/dashboard" onClick={close}>
          <span className="text-2xl font-bold">
            <span style={{ color: 'var(--text-primary)' }}>Meeting</span>
            <span style={{ color: 'var(--orange)' }}>Proxy</span>
          </span>
        </Link>
      </div>

      {/* User chip */}
      <div className="mx-3 mb-6 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <img
            src={dbUser?.profile_picture || 'https://via.placeholder.com/36'}
            referrerPolicy="no-referrer"
            alt="avatar"
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            style={{ border: '1.5px solid var(--orange)' }}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {dbUser?.name || 'User'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {dbUser?.email || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-1">
        <p className="px-4 mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Main
        </p>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={close}
            className={({ isActive }) =>
              `mp-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        <p className="px-4 mt-6 mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Settings
        </p>
        {settingsItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={close}
            className={({ isActive }) =>
              `mp-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="px-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={toggleTheme}
          className="mp-nav-link w-full mb-2"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          {isDark
            ? <SunIcon className="w-4 h-4" />
            : <MoonIcon className="w-4 h-4" />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={logout}
          className="w-full text-left mp-nav-link"
          style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="mp-sidebar hidden md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)' }}
      >
        <Link to="/dashboard">
          <span className="text-xl font-bold">
            <span style={{ color: 'var(--text-primary)' }}>Meeting</span>
            <span style={{ color: 'var(--orange)' }}>Proxy</span>
          </span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ color: 'var(--text-primary)' }}>
          {mobileOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />
          <aside
            className="md:hidden mp-sidebar open"
            style={{ transform: 'translateX(0)' }}
          >
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}
