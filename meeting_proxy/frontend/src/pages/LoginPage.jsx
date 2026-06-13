import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function LoginPage() {
  const { loginWithGoogle, user, dbUser, loading: authLoading } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  // Beginner-friendly comment: Automatically redirect the user once they are logged in.
  // This handles both the popup flow and the redirect flow after page reload.
  useEffect(() => {
    if (user && dbUser && !authLoading) {
      if (!dbUser.photo_url) {
        navigate('/onboarding/photo')
      } else if (!dbUser.context) {
        navigate('/onboarding/context')
      } else {
        navigate('/dashboard')
      }
    }
  }, [user, dbUser, authLoading, navigate])

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      // Beginner-friendly comment: Start the Google login process.
      // If a popup is blocked, it will automatically fallback to a redirect.
      await loginWithGoogle()
      
      // Note: If using redirect, the page will reload and the useEffect above 
      // will handle navigation after the user returns.
      // If using popup, the useEffect will also detect the new user state and navigate.
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Login failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-4 top-4 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        {isDark ? 'Light' : 'Dark'} Mode
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">🤖</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MeetingProxy</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Sign in to MeetingProxy</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || authLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <span className="font-bold">G</span>
          {loading ? 'Signing In...' : 'Continue with Google'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          By signing in you agree to our terms
        </p>
      </motion.div>
    </div>
  )
}
