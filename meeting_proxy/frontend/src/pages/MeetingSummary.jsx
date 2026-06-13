import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import api from '../api'

export default function MeetingSummary() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [meeting, setMeeting] = useState(null)
    const [summary, setSummary] = useState('')
    const [transcript, setTranscript] = useState('')
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [showTranscript, setShowTranscript] = useState(false)

    // Beginner-friendly comment: We fetch the meeting data from the server.
    // This includes any summary or transcript that was saved earlier.
    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await api.get(`/api/meetings/${id}/summary`)
                setMeeting(res.data.meeting)
                setSummary(res.data.summary)
                setTranscript(res.data.transcript)
            } catch (e) {
                toast.error('Failed to load meeting summary')
            } finally {
                setLoading(false)
            }
        }
        fetchSummary()
    }, [id])

    // This function calls the AI to read the transcript and write a professional summary.
    const generateSummary = async () => {
        setGenerating(true)
        try {
            const res = await api.post(`/api/meetings/${id}/generate-summary`)
            setSummary(res.data.summary)
            setTranscript(res.data.transcript)
            toast.success('Summary generated!')
        } catch (e) {
            toast.error('Failed to generate summary')
        } finally {
            setGenerating(false)
        }
    }

    const copySummary = () => {
        navigator.clipboard.writeText(summary)
        toast.success('Summary copied to clipboard!')
    }

    // Simple way to download/save as PDF using the browser's built-in print feature.
    const downloadPdf = () => {
        window.print()
    }

    if (loading) {
        return (
            <PageShell title="Loading Summary...">
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                </div>
            </PageShell>
        )
    }

    return (
        <PageShell title="Meeting Summary">
            <div className="max-w-4xl mx-auto space-y-6 print:p-0">
                
                {/* Meeting Header Info */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold dark:text-white">Session Overview</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Held on {new Date(meeting?.created_at).toLocaleDateString()} at {new Date(meeting?.created_at).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-blue-500 font-mono mt-2 truncate max-w-xs">
                            {meeting?.meet_link}
                        </p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">{meeting?.questions_answered || 0}</p>
                            <p className="text-[10px] uppercase font-bold text-gray-400">Questions</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                                {meeting?.started_at && meeting?.ended_at 
                                    ? Math.round((new Date(meeting.ended_at) - new Date(meeting.started_at)) / 60000)
                                    : 0}m
                            </p>
                            <p className="text-[10px] uppercase font-bold text-gray-400">Duration</p>
                        </div>
                    </div>
                </div>

                {/* AI Summary Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                                🤖 AI-Generated Summary
                            </h3>
                            {summary && (
                                <div className="flex gap-2 print:hidden">
                                    <button onClick={copySummary} className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg font-medium transition-colors">
                                        Copy Text
                                    </button>
                                    <button onClick={downloadPdf} className="text-xs bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                                        Save as PDF
                                    </button>
                                </div>
                            )}
                        </div>

                        {summary ? (
                            <div className="prose dark:prose-invert max-w-none bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-100 dark:border-blue-900/30 whitespace-pre-wrap">
                                {summary}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <p className="text-gray-500 dark:text-gray-400 mb-4">No summary has been generated for this meeting yet.</p>
                                <button
                                    onClick={generateSummary}
                                    disabled={generating}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                                >
                                    {generating ? 'Processing Transcript...' : '✨ Generate AI Summary'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Collapsible Transcript Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden print:border-none print:shadow-none">
                    <button 
                        onClick={() => setShowTranscript(!showTranscript)}
                        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors print:hidden"
                    >
                        <h3 className="text-lg font-bold dark:text-white">Full Meeting Transcript</h3>
                        <span className={`transform transition-transform ${showTranscript ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    
                    <div className={`${showTranscript ? 'block' : 'hidden'} p-6 pt-0 print:block`}>
                        <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border dark:border-gray-700 font-mono text-sm whitespace-pre-wrap dark:text-gray-300">
                            {transcript || 'No transcript data recorded during this session.'}
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-4 print:hidden">
                    <button
                        onClick={() => navigate('/meeting/history')}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
                    >
                        ← Back to Meeting History
                    </button>
                </div>
            </div>
        </PageShell>
    )
}
