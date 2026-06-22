import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'

const statusIcon = { ready: '✅', failed: '❌', pending: '⏳', generating: '🔄' }

function StepIndicator({ current, steps }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: i <= current ? 'var(--orange)' : 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                color: i <= current ? '#fff' : 'var(--text-muted)',
              }}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span className="text-xs hidden sm:block" style={{ color: i === current ? 'var(--orange)' : 'var(--text-muted)' }}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-8 sm:w-12 h-0.5 flex-shrink-0" style={{ background: i < current ? 'var(--orange)' : 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function MeetingPrep() {
  const { dbUser } = useAuth()
  const navigate = useNavigate()
  const pollRef = useRef(null)

  const [mode, setMode] = useState('join') // 'join' or 'create'
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  // JOIN MODE STATE
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [checklist, setChecklist] = useState({ obs: false, cable: false, chrome: false })
  const [meetLink, setMeetLink] = useState(dbUser?.meet_link || '')

  // CREATE MODE STATE
  const [meetingContext, setMeetingContext] = useState('')
  const [suggestedQs, setSuggestedQs] = useState([])
  const [selectedQs, setSelectedQs] = useState([])
  const [qaList, setQaList] = useState([])

  // VIDEO PROGRESS STATE (create step 3)
  const [genSessionId, setGenSessionId] = useState(null)
  const [videoItems, setVideoItems] = useState([])   // [{question, status}]
  const [videosReady, setVideosReady] = useState(false)

  useEffect(() => {
    api.get('/api/sessions').then((r) => setSessions(r.data?.sessions || r.data || [])).catch(() => { })
    return () => clearInterval(pollRef.current)
  }, [])

  useEffect(() => {
    if (dbUser?.meet_link && !meetLink) setMeetLink(dbUser.meet_link)
  }, [dbUser])

  // Poll session folder for video count while on progress step
  const startPolling = (sessionId, totalVideos) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.get('/api/sessions')
        const allSessions = r.data?.sessions || r.data || []
        const found = allSessions.find(s => (s.session_id || s.id) === sessionId)
        if (found) {
          const readyCount = found.video_count_on_disk ?? found.video_count ?? 0
          // Update item statuses
          setVideoItems(prev => prev.map((item, i) => ({
            ...item,
            status: i < readyCount ? 'ready' : (i === readyCount ? 'generating' : 'pending')
          })))
          if (readyCount >= totalVideos) {
            clearInterval(pollRef.current)
            setVideosReady(true)
            toast.success('All videos generated! You can now join the meeting.')
          }
        }
      } catch { }
    }, 5000)
  }

  // --- JOIN MODE HANDLERS ---
  const selectSession = (s) => {
    setSelectedSession(s)
    setMode('join')
    setStep(1)
  }

  const joinMeeting = async () => {
    if (!meetLink.trim()) return toast.error('Please enter a meeting link')
    if (!selectedSession) return toast.error('Please select a session')
    setLoading(true)
    try {
      const sid = selectedSession.session_id || selectedSession.id
      await api.post(`/api/meeting-prep/join/${sid}`, {
        meet_link: meetLink,
      })
      toast.success('Bot is joining the meeting!')
      navigate('/meeting/active')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to join meeting')
    } finally {
      setLoading(false)
    }
  }

  // --- CREATE MODE HANDLERS ---
  const startCreateMode = () => {
    setMode('create')
    setStep(0)
  }

  const suggestQuestions = async () => {
    if (!meetLink.trim()) return toast.error('Please enter a meeting link')
    if (!meetingContext.trim()) return toast.error('Please enter meeting context')
    setLoading(true)
    try {
      const res = await api.post('/api/meeting-prep/suggest-questions', { meeting_context: meetingContext })
      setSuggestedQs(res.data.questions || [])
      setSelectedQs([])
      setStep(1)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to suggest questions')
    } finally {
      setLoading(false)
    }
  }

  const toggleQ = (q) => {
    setSelectedQs((p) => {
      if (p.includes(q)) return p.filter((x) => x !== q)
      if (p.length >= 5) {
        toast.error('You can only select exactly 5 questions.')
        return p
      }
      return [...p, q]
    })
  }

  const generateAnswers = async () => {
    if (selectedQs.length !== 5) return toast.error('Please select exactly 5 questions')
    setLoading(true)
    try {
      const res = await api.post('/api/meeting-prep/generate-answers', {
        questions: selectedQs,
        meeting_context: meetingContext
      })
      setQaList(res.data.qa_list || [])
      setStep(2)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to generate answers')
    } finally {
      setLoading(false)
    }
  }

  const generateVideos = async () => {
    setGenerating(true)
    try {
      const res = await api.post('/api/meeting-prep/generate-videos', {
        qa_list: qaList,
        meet_link: meetLink,
        meeting_context: meetingContext
      })
      toast.success('Session created! Videos are generating in the background…')

      const newSession = res.data?.session || res.data
      const sessionId = newSession?.session_id || newSession?.id

      setSessions((p) => [newSession, ...p])
      setSelectedSession(newSession)
      setGenSessionId(sessionId)

      // Build initial video item list from qaList for the progress screen
      const initItems = qaList.map((qa, i) => ({
        question: qa.question,
        status: 'pending'
      }))
      setVideoItems(initItems)
      setVideosReady(false)

      // Move to progress step
      setStep(3)

      // Start polling for progress
      startPolling(sessionId, qaList.length)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to generate videos')
    } finally {
      setGenerating(false)
    }
  }

  const proceedToJoin = () => {
    clearInterval(pollRef.current)
    // Reset create state
    setMeetingContext('')
    setSuggestedQs([])
    setSelectedQs([])
    setQaList([])
    setGenSessionId(null)
    setVideoItems([])
    setVideosReady(false)
    // Go to join step with the new session selected
    setMode('join')
    setStep(1)
  }

  const JOIN_STEPS = ['Select Session', 'Review & Join']
  const CREATE_STEPS = ['Setup Context', 'Select Questions', 'Review Answers', 'Generating Videos']
  const currentSteps = mode === 'join' ? JOIN_STEPS : CREATE_STEPS

  const readyCount = videoItems.filter(v => v.status === 'ready').length
  const totalCount = videoItems.length || 5
  const progressPct = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0

  return (
    <PageShell
      title={mode === 'join' ? 'Prepare Meeting' : 'New Meeting Session'}
      subtitle={mode === 'join' ? 'Set up your AI proxy session before joining' : 'Configure AI responses for this specific meeting'}
    >
      <StepIndicator current={step} steps={currentSteps} />

      <AnimatePresence mode="wait">
        {/* ======================= */}
        {/*       JOIN MODE         */}
        {/* ======================= */}
        {mode === 'join' && step === 0 && (
          <motion.div key="join-step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={startCreateMode}
                className="mp-card p-6 text-left transition-all cursor-pointer"
                style={{ border: '2px dashed var(--orange)', background: 'rgba(255,107,53,0.04)' }}
              >
                <div className="text-3xl mb-3">✨</div>
                <p className="font-bold" style={{ color: 'var(--orange)' }}>Create New Session</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Generate a fresh set of avatar videos for a specific meeting context
                </p>
              </button>

              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSession(s)}
                  className="mp-card p-6 text-left cursor-pointer"
                >
                  <div className="text-3xl mb-3">📁</div>
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    Session {s.session_id?.slice(0, 8) || s.id}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {s.video_count_on_disk ?? s.video_count ?? 0} videos · {s.created_at || 'Recent'}
                  </p>
                  <span className={`mt-3 inline-block ${s.status === 'ready' ? 'status-ready' : 'status-pending'}`}>
                    {s.status || 'pending'}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {mode === 'join' && step === 1 && (
          <motion.div key="join-step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="mp-card p-6">
                  <p className="mp-section-title">🔗 Meeting Link</p>
                  <input
                    value={meetLink}
                    onChange={(e) => setMeetLink(e.target.value)}
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    className="mp-input"
                  />
                </div>
                <div className="mp-card p-6">
                  <p className="mp-section-title">📋 Session Summary</p>
                  <div className="flex items-center gap-4 mb-4 mt-2">
                    <img
                      src={dbUser?.profile_picture || 'https://via.placeholder.com/48'}
                      referrerPolicy="no-referrer"
                      alt="avatar"
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      style={{ border: '2px solid var(--orange)' }}
                    />
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {dbUser?.name || 'Your Avatar'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Proxy Ready
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>Session</span>
                      <span style={{ color: 'var(--text-primary)' }}>{selectedSession?.session_id?.slice(0, 12) || selectedSession?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>Videos ready</span>
                      <span style={{ color: 'var(--orange)' }}>{selectedSession?.video_count_on_disk ?? selectedSession?.video_count ?? '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mp-card p-6">
                <p className="mp-section-title">✅ Pre-join Checklist</p>
                <div className="space-y-3">
                  {[
                    { id: 'obs', icon: '🎬', label: 'OBS Studio is open', sub: 'Virtual Camera must be started' },
                    { id: 'cable', icon: '🔊', label: 'VB-Audio Cable installed', sub: 'Required for audio routing' },
                    { id: 'chrome', icon: '🌐', label: 'Chrome browser available', sub: 'Bot opens Chrome automatically' },
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setChecklist(p => ({ ...p, [item.id]: !p[item.id] }))}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                      style={{
                        background: checklist[item.id] ? 'rgba(34,197,94,0.06)' : 'var(--bg-input)',
                        border: `1px solid ${checklist[item.id] ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`
                      }}
                    >
                      <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors"
                        style={{
                          borderColor: checklist[item.id] ? '#22c55e' : 'var(--border-strong)',
                          background: checklist[item.id] ? '#22c55e' : 'transparent',
                          color: '#fff'
                        }}
                      >
                        {checklist[item.id] && <span className="text-xs">✓</span>}
                      </div>
                      <span className="text-xl flex-shrink-0">{item.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setMode('join'); setStep(0) }} className="mp-btn-ghost px-4 py-2.5">← Back</button>
                  <button
                    onClick={joinMeeting}
                    disabled={loading || !meetLink || !checklist.obs || !checklist.cable || !checklist.chrome}
                    className="mp-btn-primary flex-1 py-2.5"
                    style={{
                      background: (meetLink && checklist.obs && checklist.cable && checklist.chrome) ? 'linear-gradient(135deg, #22c55e, #16a34a)' : undefined
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2 justify-center">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Joining…
                      </span>
                    ) : '🚀 Join as Avatar'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================= */}
        {/*      CREATE MODE        */}
        {/* ======================= */}
        {mode === 'create' && step === 0 && (
          <motion.div key="create-step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="mp-card p-6">
                <p className="mp-section-title">🔗 Meeting Link</p>
                <input
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  className="mp-input"
                />
              </div>
              <div className="mp-card p-6">
                <p className="mp-section-title">📝 Meeting Context</p>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                  Provide an agenda, attendee names, or topics. The AI will use this to generate relevant questions.
                </p>
                <textarea
                  value={meetingContext}
                  onChange={(e) => setMeetingContext(e.target.value)}
                  placeholder="e.g. Sync with the frontend team to discuss the new React dashboard features..."
                  rows={6}
                  className="mp-input resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setMode('join'); setStep(0) }} className="mp-btn-ghost px-5 py-3">← Cancel</button>
                <button onClick={suggestQuestions} disabled={loading} className="mp-btn-primary flex-1 py-3">
                  {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyzing Context...
                    </span>
                  ) : 'Suggest Questions →'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'create' && step === 1 && (
          <motion.div key="create-step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Select exactly 5 questions that are most likely to be asked.
              </p>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{
                background: selectedQs.length === 5 ? 'rgba(255,107,53,0.12)' : 'var(--bg-input)',
                color: selectedQs.length === 5 ? 'var(--orange)' : 'var(--text-muted)',
                border: `1px solid ${selectedQs.length === 5 ? 'var(--orange)' : 'var(--border)'}`
              }}>
                {selectedQs.length} / 5 Selected
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {suggestedQs.map((q, i) => {
                const isSelected = selectedQs.includes(q)
                return (
                  <div
                    key={i}
                    onClick={() => toggleQ(q)}
                    className="mp-card p-4 flex items-center gap-3 cursor-pointer transition-colors"
                    style={{ border: isSelected ? '1.5px solid var(--orange)' : undefined }}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{
                        background: isSelected ? 'var(--orange)' : 'transparent',
                        border: `1.5px solid ${isSelected ? 'var(--orange)' : 'var(--border)'}`,
                        color: '#fff',
                      }}
                    >
                      {isSelected ? '✓' : ''}
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{q}</p>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="mp-btn-ghost px-5 py-2.5">← Back</button>
              <button
                onClick={generateAnswers}
                disabled={loading || selectedQs.length !== 5}
                className="mp-btn-primary flex-1 py-2.5"
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating Answers...
                  </span>
                ) : 'Generate Answers for Selected →'}
              </button>
            </div>
          </motion.div>
        )}

        {mode === 'create' && step === 2 && (
          <motion.div key="create-step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="space-y-4 mb-6">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Review the AI-generated answers based on your meeting context.
              </p>
              {qaList.map((qa, i) => (
                <div key={i} className="mp-card p-5">
                  <p className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>Q{i + 1}: {qa.question}</p>
                  <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                    {qa.answer}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="mp-btn-ghost px-5 py-3">← Back</button>
              <button
                onClick={generateVideos}
                disabled={generating}
                className="mp-btn-primary flex-1 py-3"
                style={{ background: 'linear-gradient(135deg, var(--orange), var(--orange-dark))' }}
              >
                {generating ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting Generation...
                  </span>
                ) : '✨ Generate Videos & Create Session'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ======================= */}
        {/* CREATE STEP 3: PROGRESS */}
        {/* ======================= */}
        {mode === 'create' && step === 3 && (
          <motion.div key="create-step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="max-w-2xl mx-auto space-y-6">

              {/* Progress Header */}
              <motion.div
                className="mp-card p-6"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                      {videosReady ? '🎉 All Videos Ready!' : '🎬 Generating Avatar Videos…'}
                    </h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {videosReady
                        ? 'Your avatar responses have been generated. You can now join the meeting.'
                        : `${readyCount} of ${totalCount} videos complete · Checking every 5s`}
                    </p>
                  </div>
                  <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--orange)' }}>
                    {progressPct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: 'var(--border)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: videosReady ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, var(--orange), var(--orange-dark))' }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{readyCount} of {totalCount} complete</span>
                  {!videosReady && (
                    <span className="flex items-center gap-1" style={{ color: 'var(--orange)' }}>
                      <span className="w-2 h-2 rounded-full animate-pulse inline-block" style={{ background: 'var(--orange)' }} />
                      Generating in background
                    </span>
                  )}
                  {videosReady && <span style={{ color: '#22c55e' }}>✓ Complete</span>}
                </div>
              </motion.div>

              {/* Per-video status list */}
              <div className="space-y-2">
                {videoItems.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="mp-card p-4 flex items-center gap-4"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                    >
                      {item.status === 'ready' ? '✅'
                        : item.status === 'generating' ? (
                          <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin inline-block" style={{ borderColor: 'var(--orange)', borderTopColor: 'transparent' }} />
                        )
                          : item.status === 'failed' ? '❌' : '⏳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        Q{i + 1}: {item.question}
                      </p>
                      <span className={`mt-1 inline-block ${item.status === 'ready' ? 'status-ready' : item.status === 'failed' ? 'status-failed' : 'status-pending'}`}>
                        {item.status || 'pending'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Info/warning */}
              {!videosReady && (
                <div className="p-4 rounded-xl flex items-start gap-3 text-sm" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <span className="text-lg flex-shrink-0">⚠️</span>
                  <span style={{ color: '#f59e0b' }}>
                    You can wait here or come back later — generation runs in the background even if you leave. Your session will appear in the session list when complete.
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => { clearInterval(pollRef.current); setMode('join'); setStep(0) }}
                  className="mp-btn-ghost px-5 py-3"
                >
                  ← Back to Sessions
                </button>
                <button
                  onClick={proceedToJoin}
                  disabled={!videosReady}
                  className="mp-btn-primary flex-1 py-3"
                  style={{
                    background: videosReady ? 'linear-gradient(135deg, #22c55e, #16a34a)' : undefined,
                    opacity: videosReady ? 1 : 0.5,
                    cursor: videosReady ? 'pointer' : 'not-allowed'
                  }}
                >
                  {videosReady ? '🚀 Proceed to Join Meeting →' : `⏳ Waiting for videos… (${readyCount}/${totalCount})`}
                </button>
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </PageShell>
  )
}