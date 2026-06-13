import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
      {/* Hero section with animated gradient background. */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="h-full w-full animate-pulse bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="mb-4 text-7xl">
            🤖
          </motion.div>
          <h1 className="mb-4 text-4xl font-bold sm:text-6xl">Your AI Meeting Proxy</h1>
          <p className="mb-8 max-w-3xl text-lg sm:text-2xl">
            Let your AI avatar attend meetings, answer questions, and represent you — 24/7
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/login" className="rounded-xl bg-white px-6 py-3 font-semibold text-blue-700">
              Get Started Free
            </Link>
            <Link to="/help" className="rounded-xl border border-white px-6 py-3 font-semibold">
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="mb-8 text-center text-3xl font-bold">Features</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-2 text-xl font-semibold">🎭 Realistic Avatar</h3>
            <p className="text-gray-600 dark:text-gray-300">D-ID powered talking avatar for natural video responses.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-2 text-xl font-semibold">🧠 AI Powered</h3>
            <p className="text-gray-600 dark:text-gray-300">GPT-4o answers your questions using your personal context.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-2 text-xl font-semibold">🎙️ Voice Recognition</h3>
            <p className="text-gray-600 dark:text-gray-300">Whisper STT technology listens and transcribes meeting audio.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <h2 className="mb-8 text-center text-3xl font-bold">How It Works</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            '1. Upload your photo',
            '2. Add your context/bio',
            '3. Generate your avatar library',
            '4. Join any Google Meet as your AI proxy',
          ].map((step) => (
            <div key={step} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              {step}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
        © 2026 MeetingProxy
      </footer>
    </div>
  )
}
