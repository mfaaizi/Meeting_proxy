import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'

const STEPS = [
    'Meeting Context',
    'Select Questions',
    'Review Answers',
    'Generate Videos'
]

export default function MeetingPrep() {
    const navigate = useNavigate()

    // Step tracker
    const [currentStep, setCurrentStep] = useState(0)

    // Step 1: Meeting context
    const [meetingContext, setMeetingContext] = useState('')
    const [meetLink, setMeetLink] = useState('')

    // Step 2: Questions
    const [suggestedQuestions, setSuggestedQuestions] = useState([])
    const [selectedQuestions, setSelectedQuestions] = useState([])
    const [loadingQuestions, setLoadingQuestions] = useState(false)

    // Step 3: Answers
    const [qaList, setQaList] = useState([])
    const [loadingAnswers, setLoadingAnswers] = useState(false)

    // Step 4: Generation
    const [generationProgress, setGenerationProgress] = useState(0)
    const [generationStatus, setGenerationStatus] = useState([])
    const [generating, setGenerating] = useState(false)
    const [sessionId, setSessionId] = useState(null)

    // Past sessions
    const [pastSessions, setPastSessions] = useState([])
    const [loadingPast, setLoadingPast] = useState(true)
    const [reusingSession, setReusingSession] = useState(null)

    // Load past sessions on mount
    useEffect(() => {
        const loadPastSessions = async () => {
            try {
                const res = await axios.get(
                    '/api/sessions',
                    { withCredentials: true }
                )
                setPastSessions(res.data.sessions || [])
            } catch(e) {
                console.error('Failed to load sessions:', e)
            } finally {
                setLoadingPast(false)
            }
        }
        loadPastSessions()
    }, [])

    // STEP 1: Get suggested questions from GPT
    const getSuggestedQuestions = async () => {
        if (!meetingContext.trim()) {
            toast.error('Please describe the meeting first')
            return
        }
        setLoadingQuestions(true)
        try {
            const res = await axios.post(
                '/api/meeting-prep/suggest-questions',
                { meeting_context: meetingContext },
                { withCredentials: true }
            )
            setSuggestedQuestions(res.data.questions)
            setCurrentStep(1)
        } catch(e) {
            toast.error(
                e.response?.data?.error ||
                'Failed to generate questions'
            )
        } finally {
            setLoadingQuestions(false)
        }
    }

    // Toggle question selection (max 5)
    const toggleQuestion = (q) => {
        setSelectedQuestions(prev => {
            const exists = prev.includes(q)
            if (exists) {
                return prev.filter(x => x !== q)
            }
            if (prev.length >= 5) {
                toast.error('Select exactly 5 questions')
                return prev
            }
            return [...prev, q]
        })
    }

    // STEP 2 → 3: Generate answers for selected questions
    const generateAnswers = async () => {
        if (selectedQuestions.length !== 5) {
            toast.error(
                `Select exactly 5 questions (${selectedQuestions.length}/5 selected)`
            )
            return
        }
        setLoadingAnswers(true)
        try {
            const res = await axios.post(
                '/api/meeting-prep/generate-answers',
                {
                    questions: selectedQuestions,
                    meeting_context: meetingContext
                },
                { withCredentials: true }
            )
            setQaList(res.data.qa_list)
            setCurrentStep(2)
        } catch(e) {
            toast.error('Failed to generate answers')
        } finally {
            setLoadingAnswers(false)
        }
    }

    // Reuse a past session
    const reuseSession = async (sessionId) => {
        setReusingSession(sessionId)
        try {
            const res = await axios.post(
                `/api/sessions/${sessionId}/reuse`,
                {},
                { withCredentials: true }
            )
            toast.success(res.data.message)
            navigate(`/meeting/join/${sessionId}`)
        } catch(e) {
            toast.error(
                e.response?.data?.error || 'Failed to reuse session'
            )
        } finally {
            setReusingSession(null)
        }
    }

    // Update answer when user edits
    const updateAnswer = (index, newAnswer) => {
        setQaList(prev => prev.map((qa, i) =>
            i === index ? { ...qa, answer: newAnswer } : qa
        ))
    }

    // STEP 3 → 4: Generate all videos
    const generateVideos = async () => {
        setGenerating(true)
        setCurrentStep(3)
        setGenerationProgress(0)
        setGenerationStatus([
            '🎬 Starting video generation...'
        ])

        try {
            // Create a meeting prep session
            const res = await axios.post(
                '/api/meeting-prep/generate-videos',
                {
                    qa_list: qaList,
                    meet_link: meetLink,
                    meeting_context: meetingContext
                },
                { withCredentials: true }
            )

            setSessionId(res.data.session_id)

            // Poll for progress
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await axios.get(
                        `/api/meeting-prep/status/${res.data.session_id}`,
                        { withCredentials: true }
                    )

                    setGenerationProgress(
                        statusRes.data.progress
                    )
                    setGenerationStatus(
                        statusRes.data.status_messages
                    )

                    if (statusRes.data.complete) {
                        clearInterval(pollInterval)
                        setGenerating(false)
                        toast.success(
                            'All videos ready! Joining meeting...'
                        )
                        // Navigate to join meeting
                        setTimeout(() => {
                            navigate(
                                `/meeting/join/${res.data.session_id}`
                            )
                        }, 2000)
                    }

                    if (statusRes.data.error) {
                        clearInterval(pollInterval)
                        setGenerating(false)
                        toast.error(statusRes.data.error)
                    }
                } catch(e) {
                    clearInterval(pollInterval)
                    setGenerating(false)
                }
            }, 3000)

        } catch(e) {
            toast.error(
                e.response?.data?.error ||
                'Generation failed'
            )
            setGenerating(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 py-8">

                {/* Progress steps */}
                <div className="flex items-center mb-8">
                    {STEPS.map((step, i) => (
                        <div key={i} className="flex items-center flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${i <= currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                {i < currentStep ? '✓' : i + 1}
                            </div>
                            <div className="ml-2 hidden sm:block">
                                <p className={`text-xs font-medium ${i <= currentStep ? 'text-blue-500' : 'text-gray-400'}`}>{step}</p>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-3 ${i < currentStep ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Past Sessions Section */}
                {currentStep === 0 && pastSessions.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6 border border-gray-100 dark:border-gray-700">
                        <h2 className="font-bold text-lg mb-1 dark:text-white">
                            📂 Previous Sessions
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Reuse videos from a previous meeting prep — no need to regenerate!
                        </p>
                        <div className="space-y-3">
                            {pastSessions.slice(0, 5).map((s) => (
                                <div key={s.session_id} className="border dark:border-gray-600 rounded-xl p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-sm dark:text-white line-clamp-1">
                                            {s.meeting_context?.slice(0, 60) || 'No context'}...
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {s.video_count_on_disk} videos • {new Date(s.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {s.folder_exists ? (
                                            <button
                                                onClick={() => reuseSession(s.session_id)}
                                                disabled={reusingSession === s.session_id}
                                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
                                            >
                                                {reusingSession === s.session_id ? 'Loading...' : '♻️ Reuse'}
                                            </button>
                                        ) : (
                                            <span className="text-xs text-red-400 px-3 py-1.5">
                                                Videos deleted
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 0: Meeting Context */}
                {currentStep === 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h1 className="text-xl font-bold mb-1 dark:text-white">
                            🎯 What is this meeting about?
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Describe the meeting context so GPT can suggest relevant questions.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Meeting Description
                                </label>
                                <textarea
                                    value={meetingContext}
                                    onChange={(e) => setMeetingContext(e.target.value)}
                                    placeholder="e.g. A technical interview for a React Developer position at a fintech startup. I need to explain my project architecture..."
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Google Meet Link (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={meetLink}
                                    onChange={(e) => setMeetLink(e.target.value)}
                                    placeholder="https://meet.google.com/xxx-yyyy-zzz"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <button
                                onClick={getSuggestedQuestions}
                                disabled={loadingQuestions || !meetingContext.trim()}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {loadingQuestions ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                        Analyzing Context...
                                    </>
                                ) : (
                                    'Suggest Questions →'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 1: Select Questions */}
                {currentStep === 1 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-1">
                            <h1 className="text-xl font-bold dark:text-white">
                                📋 Select 5 Questions
                            </h1>
                            <span className={`text-sm font-bold ${selectedQuestions.length === 5 ? 'text-green-500' : 'text-blue-500'}`}>
                                {selectedQuestions.length}/5
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Choose exactly 5 questions you expect to be asked.
                        </p>

                        <div className="space-y-2 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {suggestedQuestions.map((q, i) => (
                                <div
                                    key={i}
                                    onClick={() => toggleQuestion(q)}
                                    className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start ${
                                        selectedQuestions.includes(q)
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-100 dark:border-gray-700 hover:border-blue-300'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center ${
                                        selectedQuestions.includes(q)
                                            ? 'bg-blue-500 border-blue-500 text-white'
                                            : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                        {selectedQuestions.includes(q) && '✓'}
                                    </div>
                                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-200">
                                        {q}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setCurrentStep(0)}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={generateAnswers}
                                disabled={loadingAnswers || selectedQuestions.length !== 5}
                                className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {loadingAnswers ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                        Drafting Answers...
                                    </>
                                ) : (
                                    'Review Answers →'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Review Answers */}
                {currentStep === 2 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <h1 className="text-xl font-bold mb-1 dark:text-white">
                            ✍️ Review & Edit Answers
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            GPT has drafted answers based on your context. Edit them to sound more like you.
                        </p>

                        <div className="space-y-6 mb-8 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                            {qaList.map((qa, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-bold">
                                            {i + 1}
                                        </span>
                                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                            {qa.question}
                                        </h3>
                                    </div>
                                    <textarea
                                        value={qa.answer}
                                        onChange={(e) => updateAnswer(i, e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[80px]"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setCurrentStep(1)}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={generateVideos}
                                className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center"
                            >
                                Generate 6 Videos →
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Generation Progress */}
                {currentStep === 3 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                        <div className="mb-6">
                            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                {generating ? (
                                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span className="text-3xl">✅</span>
                                )}
                            </div>
                            <h1 className="text-2xl font-bold dark:text-white">
                                {generating ? 'Generating Your Avatar' : 'Ready to Join!'}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">
                                This uses D-ID credits to create realistic talking videos.
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-8">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Progress</span>
                                <span className="text-blue-500 font-bold">{generationProgress}%</span>
                            </div>
                            <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500 ease-out"
                                    style={{ width: `${generationProgress}%` }}
                                />
                            </div>
                        </div>

                        {/* Status Messages */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-left max-h-[150px] overflow-y-auto">
                            {generationStatus.map((msg, i) => (
                                <p key={i} className="text-sm text-gray-600 dark:text-gray-400 mb-1 last:mb-0 last:text-blue-500 last:font-medium">
                                    {msg}
                                </p>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
