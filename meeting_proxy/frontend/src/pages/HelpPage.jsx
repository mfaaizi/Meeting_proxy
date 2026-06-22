import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import PageShell from '../components/PageShell'

const faqs = [
  {
    q: 'How does MeetingProxy join meetings?',
    a: 'It uses Selenium to automate Chrome, OBS for virtual camera/audio, and VB-Audio Cable for audio routing. The bot logs into Google with a dedicated account and joins your meeting link.',
  },
  {
    q: 'How are answers generated?',
    a: 'Questions are transcribed via OpenAI Whisper, matched against your pre-generated video library, then answered using GPT-4o with your personal context if no match is found.',
  },
  {
    q: 'Can I customize expected questions?',
    a: 'Yes. Use the Custom Q&A page to add your own questions and answers. The system generates a D-ID avatar video for each one automatically.',
  },
  {
    q: 'Is my data secure?',
    a: 'Authentication is handled by Firebase Google OAuth. Session state is stored in server-side cookies. Your context and videos are tied to your account only.',
  },
  {
    q: 'Can I stop a meeting anytime?',
    a: 'Yes. Click "Stop Meeting" from the Active Meeting page. The bot will leave the call and you\'ll be redirected to the summary page.',
  },
  {
    q: 'What happens if D-ID credits run out?',
    a: 'The system tries up to 4 D-ID API keys in sequence. If all are exhausted it falls back to pre-cached library videos. Add a fresh key in your .env file.',
  },
  {
    q: 'Why does the bot join with the wrong camera or mic?',
    a: 'Make sure OBS Virtual Camera is started before clicking Join, and that VB-Audio Cable Output is selected as the microphone in Google Meet audio settings.',
  },
]

const steps = [
  { icon: '🔑', title: 'Sign In with Google', desc: 'Firebase handles authentication securely. No passwords stored.' },
  { icon: '📷', title: 'Upload Your Photo', desc: 'A clear front-facing photo is used to create your AI avatar.' },
  { icon: '✍️', title: 'Add Your Context', desc: 'Write a bio — the AI uses this to answer questions accurately.' },
  { icon: '⚡', title: 'Generate Library', desc: 'Pre-generate videos for common questions using D-ID credits.' },
  { icon: '🚀', title: 'Join as Avatar', desc: 'Paste a Google Meet link and let the bot attend for you.' },
]

const requirements = [
  { icon: '🎬', name: 'OBS Studio', desc: 'Free. Provides virtual camera output.', link: 'https://obsproject.com' },
  { icon: '🔊', name: 'VB-Audio Cable', desc: 'Free. Routes audio between apps.', link: 'https://vb-audio.com/Cable/' },
  { icon: '🌐', name: 'Google Chrome', desc: 'The bot automates Chrome to join Meet.' },
  { icon: '🎭', name: 'D-ID Account', desc: 'Required for avatar video generation.', link: 'https://studio.d-id.com' },
]

function FAQItem({ item }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ border: `1px solid ${open ? 'var(--orange)' : 'var(--border)'}`, background: open ? 'rgba(255,107,53,0.04)' : 'var(--bg-input)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold pr-4" style={{ color: 'var(--text-primary)' }}>{item.q}</span>
        <ChevronDownIcon
          className="w-4 h-4 flex-shrink-0 transition-transform"
          style={{ color: 'var(--orange)', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function HelpPage() {
  return (
    <PageShell title="Help & Documentation" subtitle="Everything you need to get MeetingProxy running">

      {/* How it works */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mp-card p-6 mb-6">
        <p className="mp-section-title">🗺️ How It Works</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map((s, i) => (
            <div key={s.title} className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3"
                style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid var(--border)' }}
              >
                {s.icon}
              </div>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-2"
                style={{ background: 'var(--orange)', color: '#fff' }}
              >
                {i + 1}
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* System requirements */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mp-card p-6">
          <p className="mp-section-title">🔧 System Requirements</p>
          <div className="space-y-3">
            {requirements.map((r) => (
              <div key={r.name} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                <span className="text-xl flex-shrink-0">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.desc}</p>
                </div>
                {r.link && (
                  <a
                    href={r.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-2 py-1 rounded flex-shrink-0"
                    style={{ background: 'rgba(255,107,53,0.1)', color: 'var(--orange)', border: '1px solid var(--border)' }}
                  >
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* OBS setup guide */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mp-card p-6">
          <p className="mp-section-title">🎬 OBS Setup Guide</p>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Open OBS Studio and click Tools → WebSocket Server Settings. Enable it on port 4455.' },
              { step: '2', text: 'In OBS → Tools → Virtual Camera → Start Virtual Camera.' },
              { step: '3', text: 'Add a Browser Source pointing to http://127.0.0.1:5000/avatar-player' },
              { step: '4', text: 'In Advanced Audio Properties, set Desktop Audio monitoring to "Monitor and Output" with CABLE Input as the monitoring device.' },
              { step: '5', text: 'In Google Meet, select OBS Virtual Camera as video and CABLE Output as microphone.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 text-sm">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: 'var(--orange)', color: '#fff' }}
                >
                  {item.step}
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>{item.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* FAQ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mp-card p-6 mb-6">
        <p className="mp-section-title">❓ Frequently Asked Questions</p>
        <div className="space-y-2">
          {faqs.map((item) => (
            <FAQItem key={item.q} item={item} />
          ))}
        </div>
      </motion.div>

      {/* Contact */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mp-card p-6">
        <p className="mp-section-title">📬 Contact & Support</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Email Support</p>
            <p className="text-sm" style={{ color: 'var(--orange)' }}>support@meetingproxy.ai</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Version</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>MeetingProxy v1.0 · FYP 2026</p>
          </div>
        </div>
      </motion.div>
    </PageShell>
  )
}
