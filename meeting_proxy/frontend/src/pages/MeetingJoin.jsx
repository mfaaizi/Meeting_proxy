import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'

export default function MeetingJoin() {
    const { sessionId } = useParams()
    const { dbUser } = useAuth()
    const navigate = useNavigate()
    const [meetLink, setMeetLink] = useState('')
    const [joining, setJoining] = useState(false)
    const [checklist, setChecklist] = useState({
        obs: false,
        cable: false,
        chrome: false
    })

    // Pre-fill meet link from user profile
    useEffect(() => {
        if (dbUser?.meet_link) {
            setMeetLink(dbUser.meet_link)
        }
    }, [dbUser])

    const allChecked = Object.values(checklist).every(v => v)

    const joinMeeting = async () => {
        if (!meetLink.trim()) {
            toast.error('Please enter a meeting link!')
            return
        }
        if (!allChecked) {
            toast.error(
                'Please complete the checklist first!'
            )
            return
        }

        setJoining(true)
        try {
            const res = await axios.post(
                `/api/meeting-prep/join/${sessionId}`,
                { meet_link: meetLink },
                { withCredentials: true }
            )
            toast.success('Bot is joining the meeting!')
            navigate('/meeting/active')
        } catch(e) {
            toast.error(
                e.response?.data?.error ||
                'Failed to join meeting'
            )
            setJoining(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50
            dark:bg-gray-900 transition-colors">
            <Navbar />
            <div className="max-w-lg mx-auto px-4 py-16">

                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">✅</div>
                    <h1 className="text-2xl font-bold
                        dark:text-white">
                        Videos Ready!
                    </h1>
                    <p className="text-gray-500
                        dark:text-gray-400 mt-2">
                        Session ID: {sessionId}
                    </p>
                </div>

                {/* Meet link input */}
                <div className="bg-white dark:bg-gray-800
                    rounded-xl p-6 shadow-sm mb-4">
                    <h3 className="font-semibold mb-3
                        dark:text-white">
                        🔗 Meeting Link
                    </h3>
                    <input
                        type="text"
                        value={meetLink}
                        onChange={e => setMeetLink(e.target.value)}
                        placeholder="https://meet.google.com/xxx-xxxx-xxx"
                        className="w-full border rounded-lg
                            px-4 py-2 dark:bg-gray-700
                            dark:text-white dark:border-gray-600
                            focus:outline-none focus:ring-2
                            focus:ring-blue-500"
                    />
                </div>

                {/* Checklist */}
                <div className="bg-white dark:bg-gray-800
                    rounded-xl p-6 shadow-sm mb-6">
                    <h3 className="font-semibold mb-4
                        dark:text-white">
                        ✅ Before Joining Checklist
                    </h3>
                    <div className="space-y-3">
                        {[
                            {
                                key: 'obs',
                                label: 'OBS Studio is open',
                                sub: 'Virtual Camera must be started'
                            },
                            {
                                key: 'cable',
                                label: 'VB-Audio Cable is installed',
                                sub: 'For audio routing to meeting'
                            },
                            {
                                key: 'chrome',
                                label: 'Chrome browser is available',
                                sub: 'Bot will open Chrome automatically'
                            },
                        ].map((item) => (
                            <label key={item.key}
                                className="flex items-start
                                gap-3 cursor-pointer group">
                                <div
                                    onClick={() => setChecklist(
                                        prev => ({
                                            ...prev,
                                            [item.key]: !prev[item.key]
                                        })
                                    )}
                                    className={`w-5 h-5 rounded
                                        border-2 flex-shrink-0
                                        mt-0.5 flex items-center
                                        justify-center cursor-pointer
                                        transition-colors
                                        ${checklist[item.key]
                                            ? 'bg-green-500 border-green-500'
                                            : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                >
                                    {checklist[item.key] && (
                                        <span className="text-white
                                            text-xs font-bold">
                                            ✓
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium
                                        text-sm dark:text-white
                                        group-hover:text-blue-500">
                                        {item.label}
                                    </p>
                                    <p className="text-xs
                                        text-gray-400">
                                        {item.sub}
                                    </p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Join button */}
                <button
                    onClick={joinMeeting}
                    disabled={joining || !meetLink}
                    className={`w-full py-4 rounded-xl
                        font-bold text-lg transition-all
                        flex items-center justify-center gap-2
                        ${allChecked && meetLink
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500'
                        }
                        disabled:opacity-50`}
                >
                    {joining ? (
                        <>
                            <div className="w-5 h-5 border-2
                                border-white border-t-transparent
                                rounded-full animate-spin">
                            </div>
                            Bot is joining...
                        </>
                    ) : (
                        '🚀 Join Meeting as Avatar'
                    )}
                </button>

                {joining && (
                    <div className="mt-4 bg-blue-50
                        dark:bg-blue-900/20 rounded-xl p-4
                        text-center">
                        <p className="text-blue-600
                            dark:text-blue-400 text-sm">
                            🤖 Chrome is opening and joining
                            the meeting. Check your desktop!
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
