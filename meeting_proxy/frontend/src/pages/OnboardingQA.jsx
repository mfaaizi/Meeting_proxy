import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function OnboardingQA() {
    const navigate = useNavigate()
    const [question, setQuestion] = useState('')
    const [generatedAnswer, setGeneratedAnswer] = useState('')
    const [loadingAnswer, setLoadingAnswer] = useState(false)
    const [addedQAs, setAddedQAs] = useState([])
    const [autoGenerating, setAutoGenerating] = useState(false)
    const [autoProgress, setAutoProgress] = useState(0)
    const [autoMessages, setAutoMessages] = useState([])

    // Generate answer using LLM when user enters question
    const generateAnswer = async () => {
        if (!question.trim()) {
            toast.error('Please enter a question first')
            return
        }
        setLoadingAnswer(true)
        setGeneratedAnswer('')
        try {
            const res = await axios.post(
                '/api/generate-answer-preview',
                { question },
                { withCredentials: true }
            )
            setGeneratedAnswer(res.data.answer)
        } catch(e) {
            toast.error(
                e.response?.data?.error ||
                'Failed to generate answer'
            )
        } finally {
            setLoadingAnswer(false)
        }
    }

    // Add Q&A pair to database
    const addQA = async () => {
        if (!question || !generatedAnswer) return
        try {
            await axios.post(
                '/api/custom-qa',
                { question, answer: generatedAnswer },
                { withCredentials: true }
            )
            setAddedQAs(prev => [...prev,
                { question, answer: generatedAnswer }
            ])
            setQuestion('')
            setGeneratedAnswer('')
            toast.success('Question added!')
        } catch(e) {
            toast.error('Failed to add question')
        }
    }

    // Auto-generate 10 Q&A using GPT + user context
    const autoGenerate = async () => {
        setAutoGenerating(true)
        setAutoProgress(0)
        setAutoMessages(['Analyzing your context...'])
        try {
            const res = await axios.post(
                '/api/auto-generate-qa',
                {},
                { withCredentials: true }
            )
            setAutoProgress(100)
            setAutoMessages(prev => [...prev,
                `Generated ${res.data.count} questions!`,
                'Creating avatar videos in background...',
                'Redirecting to dashboard...'
            ])
            toast.success('Auto-generated Q&A complete!')
            setTimeout(() => navigate('/dashboard'), 3000)
        } catch(e) {
            toast.error(
                e.response?.data?.error ||
                'Auto-generation failed'
            )
            setAutoGenerating(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50
            dark:bg-gray-900 transition-colors">
            <div className="max-w-2xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between
                        items-center mb-4">
                        <span className="text-sm text-gray-500
                            dark:text-gray-400">
                            Step 3 of 3
                        </span>
                        <span className="text-sm text-gray-500
                            dark:text-gray-400">
                            {addedQAs.length} added
                        </span>
                    </div>
                    <div className="w-full bg-gray-200
                        dark:bg-gray-700 rounded-full h-2 mb-4">
                        <div className="bg-blue-500 h-2
                            rounded-full w-full"></div>
                    </div>
                    <h1 className="text-2xl font-bold
                        dark:text-white">
                        Add Expected Questions
                    </h1>
                    <p className="text-gray-600
                        dark:text-gray-400 mt-1">
                        Type a question — AI will generate
                        the perfect answer using your context.
                    </p>
                </div>

                {/* Manual Q&A section */}
                <div className="bg-white dark:bg-gray-800
                    rounded-xl p-6 shadow-sm mb-6">
                    <h2 className="font-semibold mb-4
                        dark:text-white">
                        ✍️ Add Your Own Question
                    </h2>

                    <div className="mb-4">
                        <label className="block text-sm
                            font-medium mb-2 dark:text-white">
                            Question
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={question}
                                onChange={e =>
                                    setQuestion(e.target.value)
                                }
                                onKeyDown={e =>
                                    e.key === 'Enter' &&
                                    generateAnswer()
                                }
                                placeholder="What is your name?"
                                className="flex-1 border
                                    rounded-lg px-4 py-2
                                    dark:bg-gray-700
                                    dark:text-white
                                    dark:border-gray-600
                                    focus:outline-none
                                    focus:ring-2
                                    focus:ring-blue-500"
                            />
                            <button
                                onClick={generateAnswer}
                                disabled={
                                    loadingAnswer || !question
                                }
                                className="bg-blue-500
                                    hover:bg-blue-600 text-white
                                    px-4 py-2 rounded-lg
                                    disabled:opacity-50
                                    whitespace-nowrap"
                            >
                                {loadingAnswer ?
                                    '...' : 'Generate Answer'}
                            </button>
                        </div>
                    </div>

                    {generatedAnswer && (
                        <div className="mt-4">
                            <label className="block text-sm
                                font-medium mb-2 dark:text-white">
                                Generated Answer
                                <span className="text-gray-400
                                    font-normal ml-2">
                                    (edit if needed)
                                </span>
                            </label>
                            <textarea
                                value={generatedAnswer}
                                onChange={e =>
                                    setGeneratedAnswer(e.target.value)
                                }
                                rows={3}
                                className="w-full border rounded-lg
                                    px-4 py-2 dark:bg-gray-700
                                    dark:text-white
                                    dark:border-gray-600
                                    focus:outline-none
                                    focus:ring-2
                                    focus:ring-green-500"
                            />
                            <button
                                onClick={addQA}
                                className="mt-2 bg-green-500
                                    hover:bg-green-600 text-white
                                    px-6 py-2 rounded-lg"
                            >
                                ✅ Add This Q&A
                            </button>
                        </div>
                    )}
                </div>

                {/* Added Q&As */}
                {addedQAs.length > 0 && (
                    <div className="mb-6">
                        <h3 className="font-medium mb-3
                            dark:text-white">
                            Added ({addedQAs.length})
                        </h3>
                        <div className="space-y-2">
                            {addedQAs.map((qa, i) => (
                                <div key={i}
                                    className="bg-green-50
                                    dark:bg-green-900/20
                                    border border-green-200
                                    dark:border-green-800
                                    rounded-lg p-3">
                                    <p className="font-medium
                                        text-sm dark:text-white">
                                        Q: {qa.question}
                                    </p>
                                    <p className="text-sm
                                        text-gray-600
                                        dark:text-gray-400 mt-1">
                                        A: {qa.answer}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Auto-generate section */}
                <div className="bg-gradient-to-r from-blue-50
                    to-purple-50 dark:from-blue-900/20
                    dark:to-purple-900/20 rounded-xl p-6
                    border border-blue-200 dark:border-blue-800
                    mb-6">
                    <h3 className="font-bold mb-2 dark:text-white">
                        🤖 Skip Manual Entry
                    </h3>
                    <p className="text-sm text-gray-600
                        dark:text-gray-400 mb-4">
                        Let AI analyze your context and generate
                        10 relevant questions + answers + videos
                        automatically. Perfect if you're in a hurry!
                    </p>

                    {autoGenerating ? (
                        <div>
                            <div className="w-full bg-gray-200
                                dark:bg-gray-700 rounded-full h-2
                                mb-3">
                                <div
                                    className="bg-blue-500 h-2
                                        rounded-full transition-all
                                        duration-500"
                                    style={{
                                        width: `${autoProgress}%`
                                    }}
                                ></div>
                            </div>
                            <div className="space-y-1">
                                {autoMessages.map((msg, i) => (
                                    <p key={i} className="text-sm
                                        text-blue-600
                                        dark:text-blue-400">
                                        ✓ {msg}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={autoGenerate}
                            className="w-full bg-gradient-to-r
                                from-blue-500 to-purple-500
                                text-white py-3 rounded-lg
                                font-medium hover:opacity-90"
                        >
                            🚀 Auto-Generate 10 Questions & Videos
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-gray-500
                            dark:text-gray-400 hover:underline"
                    >
                        Skip for now
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-gray-900 dark:bg-white
                            dark:text-gray-900 text-white
                            px-6 py-2 rounded-lg"
                    >
                        Go to Dashboard →
                    </button>
                </div>
            </div>
        </div>
    )
}
