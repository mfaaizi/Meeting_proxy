import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import MouseGlow from '../components/MouseGlow'
import PageBackground from '../components/PageBackground'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

const features = [
  {
    icon: '🎭',
    title: 'Realistic Avatar',
    desc: 'D-ID powered lip-synced video that looks and moves just like you.',
  },
  {
    icon: '🧠',
    title: 'Smart AI Responses',
    desc: 'GPT-4o answers questions using your personal knowledge base.',
  },
  {
    icon: '🎙️',
    title: 'Voice Recognition',
    desc: 'Whisper STT listens, transcribes, and triggers the right answer.',
  },
  {
    icon: '📋',
    title: 'Meeting Summaries',
    desc: 'Get detailed transcripts and AI-written summaries after every session.',
  },
  {
    icon: '📚',
    title: 'Video Library',
    desc: 'Pre-generate responses to common questions for instant replies.',
  },
  {
    icon: '🔒',
    title: 'Secure by Design',
    desc: 'Firebase auth, session cookies, and zero data sharing.',
  },
]

const steps = [
  { num: '01', title: 'Upload Your Photo', desc: 'A single clear photo is all your avatar needs.' },
  { num: '02', title: 'Add Your Context', desc: 'Tell the AI who you are — it uses this to answer for you.' },
  { num: '03', title: 'Generate Your Library', desc: 'Pre-record responses to the most common questions.' },
  { num: '04', title: 'Join as Your AI Proxy', desc: 'Paste a Google Meet link and let the bot handle the rest.' },
]

export default function LandingPage() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text-primary)' }} className="min-h-screen overflow-x-hidden">
      <PageBackground />
      <MouseGlow />

      {/* ── Navbar ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-xl font-bold">
          <span style={{ color: 'var(--text-primary)' }}>Meeting</span>
          <span style={{ color: 'var(--orange)' }}>Proxy</span>
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
          </button>
          <Link to="/login" className="mp-btn-primary text-sm px-4 py-2">
            Sign In
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="mp-badge mb-6 inline-block">AI Meeting Technology</span>
          <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-6">
            Your AI Avatar,{' '}
            <span style={{ color: 'var(--orange)' }}>Attending</span>
            <br />
            Meetings For You
          </h1>
          <p className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            MeetingProxy creates a digital twin that joins calls, answers questions, and represents you — with your face, your voice, and your knowledge.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/login" className="mp-btn-primary px-8 py-3 text-base">
              Get Started Free →
            </Link>
            <Link to="/help" className="mp-btn-ghost px-8 py-3 text-base">
              See How It Works
            </Link>
          </div>
        </motion.div>

        {/* Floating stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto"
        >
          {[
            { val: '10x', label: 'Faster Responses' },
            { val: '24/7', label: 'Availability' },
            { val: '100%', label: 'Your Voice' },
          ].map((s) => (
            <div key={s.label} className="mp-card p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--orange)' }}>{s.val}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="px-4 sm:px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="mp-badge mb-3 inline-block">Features</span>
          <h2 className="text-3xl font-bold">Everything You Need</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="mp-card p-6"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-4 sm:px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="mp-badge mb-3 inline-block">Process</span>
          <h2 className="text-3xl font-bold">Up & Running in Minutes</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="mp-card p-6 flex gap-5 items-start"
            >
              <span className="text-3xl font-black flex-shrink-0" style={{ color: 'var(--orange)', opacity: 0.7 }}>
                {s.num}
              </span>
              <div>
                <h3 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{s.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 sm:px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mp-card max-w-2xl mx-auto p-12"
          style={{ boxShadow: '0 0 60px rgba(255,107,53,0.25)' }}
        >
          <h2 className="text-3xl font-bold mb-4">Ready to Clone Yourself?</h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
            Sign in with Google and have your AI proxy ready in under 5 minutes.
          </p>
          <Link to="/login" className="mp-btn-primary px-10 py-3 text-base">
            Start for Free →
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-8 text-center text-sm border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        © 2026 MeetingProxy · Built with AI
      </footer>
    </div>
  )
}
