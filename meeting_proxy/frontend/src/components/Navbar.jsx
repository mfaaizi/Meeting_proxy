import { Link, NavLink } from 'react-router-dom'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

function navClass({ isActive }) {
  return isActive
    ? 'text-blue-600 dark:text-blue-400 font-semibold'
    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
}

export default function Navbar() {
  // Navbar appears on all protected pages for consistent navigation.
  const { isDark, toggleTheme } = useTheme()
  const { dbUser, logout } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/dashboard" className="text-xl font-bold text-gray-900 dark:text-white">
          MeetingProxy <span role="img" aria-label="robot">🤖</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm sm:gap-6">
          <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
          <NavLink to="/library/manage" className={navClass}>Library</NavLink>
          <NavLink to="/meeting/history" className={navClass}>Meetings</NavLink>
          <NavLink to="/help" className={navClass}>Help</NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            title="Toggle theme"
          >
            {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>

          <Link to="/settings/profile">
            <img
              src={dbUser?.profile_picture || 'https://via.placeholder.com/40'}
              alt="User avatar"
              className="h-10 w-10 rounded-full border border-gray-200 object-cover dark:border-gray-700"
            />
          </Link>

          <button
            type="button"
            onClick={logout}
            className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
