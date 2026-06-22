import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'

export default function VoiceSettings() {
  const { dbUser, refreshDbUser } = useAuth()
  
  const [voices, setVoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [playingId, setPlayingId] = useState(null)
  
  // Clone Voice State
  const [cloneFiles, setCloneFiles] = useState([])
  const [cloneName, setCloneName] = useState('')
  const [isCloning, setIsCloning] = useState(false)

  useEffect(() => {
    fetchVoices()
  }, [])

  const fetchVoices = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/voices')
      setVoices(res.data.voices || [])
    } catch (error) {
      console.error("Failed to load voices:", error)
      toast.error("Failed to load ElevenLabs voices. Check your API key.")
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files) {
      setCloneFiles(Array.from(e.target.files))
    }
  }

  const handleCloneVoice = async (e) => {
    e.preventDefault()
    if (!cloneName.trim() || cloneFiles.length === 0) {
      toast.error("Please provide a name and at least one audio sample.")
      return
    }

    setIsCloning(true)
    const formData = new FormData()
    formData.append('name', cloneName)
    cloneFiles.forEach(file => {
      formData.append('file', file)
    })

    try {
      const res = await api.post('/api/voices/clone', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast.success("Voice cloned successfully!")
      setCloneName('')
      setCloneFiles([])
      
      // Auto-select the new voice
      await selectVoice(res.data.voice_id, res.data.name)
      await fetchVoices() // Refresh list
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to clone voice.")
    } finally {
      setIsCloning(false)
    }
  }

  const playPreview = async (voiceId, previewUrl) => {
    if (playingId === voiceId) return // Already playing

    try {
      setPlayingId(voiceId)
      
      let audioSrc = previewUrl
      
      // If no preview URL (like for newly cloned voices), generate one
      if (!audioSrc) {
        toast.loading("Generating preview...", { id: "preview" })
        const res = await api.post('/api/voices/preview', { voice_id: voiceId })
        audioSrc = res.data.audio_url
        toast.success("Preview ready!", { id: "preview" })
      }

      const audio = new Audio(audioSrc)
      audio.onended = () => setPlayingId(null)
      audio.onerror = () => {
        setPlayingId(null)
        toast.error("Failed to play preview")
      }
      await audio.play()
    } catch (error) {
      console.error("Preview error:", error)
      setPlayingId(null)
      toast.error("Failed to load preview")
    }
  }

  const selectVoice = async (voiceId, voiceName) => {
    setSaving(true)
    try {
      await api.put('/api/voice-settings', { 
        voice_id: voiceId,
        voice_name: voiceName
      })
      await refreshDbUser()
      toast.success(voiceId ? `Selected ${voiceName}` : "Reverted to Default Voice")
    } catch (error) {
      toast.error("Failed to save voice settings")
    } finally {
      setSaving(false)
    }
  }

  const deleteVoice = async (voiceId) => {
    if (!window.confirm("Are you sure you want to delete this cloned voice?")) return

    try {
      await api.delete(`/api/voices/${voiceId}`)
      toast.success("Voice deleted")
      await refreshDbUser()
      await fetchVoices()
    } catch (error) {
      toast.error("Failed to delete voice")
    }
  }

  const clonedVoices = voices.filter(v => v.category === 'cloned')
  const aiVoices = voices.filter(v => v.category !== 'cloned')

  return (
    <PageShell title="Voice Settings">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Current Voice Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mp-card p-8 relative overflow-hidden"
          style={{ background: 'linear-gradient(to bottom right, rgba(255,107,53,0.1), transparent)' }}
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase mb-1" style={{ color: 'var(--orange)' }}>Active Avatar Voice</p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {dbUser?.voice_name || 'Microsoft Jenny (Default)'}
              </h2>
              <p className="max-w-lg text-sm" style={{ color: 'var(--text-secondary)' }}>
                {dbUser?.voice_id 
                  ? "This voice will be used to lip-sync all your AI avatar responses during Google Meet sessions."
                  : "Using the default fallback voice. For a more personalized experience, clone your own voice or select a premium AI voice below."}
              </p>
            </div>
            {dbUser?.voice_id && (
              <div className="flex gap-3">
                <button 
                  onClick={() => playPreview(dbUser.voice_id)}
                  className="mp-btn-primary px-6 py-3"
                >
                  {playingId === dbUser.voice_id ? '⏸ Playing...' : '▶️ Play Preview'}
                </button>
                <button 
                  onClick={() => selectVoice(null, null)}
                  className="mp-btn-danger px-6 py-3"
                >
                  Reset Default
                </button>
              </div>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Voice Cloning Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="mp-card p-6">
              <p className="mp-section-title mb-1">🎙️ Clone Your Voice</p>
              <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                Upload clear audio of you speaking (no background noise) to create a digital twin of your voice.
              </p>

              <form onSubmit={handleCloneVoice} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Voice Name</label>
                  <input
                    type="text"
                    value={cloneName}
                    onChange={e => setCloneName(e.target.value)}
                    placeholder="e.g., My Professional Voice"
                    className="mp-input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Audio Samples</label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:border-indigo-500 transition-colors bg-gray-50 dark:bg-gray-700/50">
                    <input
                      type="file"
                      accept="audio/mp3, audio/wav, audio/mpeg"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="voice-upload"
                    />
                    <label htmlFor="voice-upload" className="cursor-pointer flex flex-col items-center">
                      <span className="text-2xl mb-2">📁</span>
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {cloneFiles.length > 0 ? `${cloneFiles.length} files selected` : "Click to upload audio"}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">MP3 or WAV, up to 10MB</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCloning || cloneFiles.length === 0 || !cloneName}
                  className="mp-btn-primary w-full py-3"
                >
                  {isCloning ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Cloning...</>
                  ) : "Create Voice Clone"}
                </button>
              </form>
            </div>

            {/* Cloned Voices List */}
            {clonedVoices.length > 0 && (
              <div className="mp-card p-6">
                <p className="mp-section-title mb-4">Your Voice Clones</p>
                <div className="space-y-3">
                  {clonedVoices.map(voice => (
                    <div key={voice.voice_id} className={`p-4 rounded-2xl border transition-all ${dbUser?.voice_id === voice.voice_id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-100 dark:border-gray-700'}`}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold dark:text-white">{voice.name}</span>
                        {dbUser?.voice_id === voice.voice_id && (
                          <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-md font-medium">Active</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => playPreview(voice.voice_id, voice.preview_url)}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm py-2 rounded-lg font-medium transition-colors dark:text-white"
                        >
                          {playingId === voice.voice_id ? '⏸' : '▶️'} Play
                        </button>
                        {dbUser?.voice_id !== voice.voice_id && (
                          <button 
                            onClick={() => selectVoice(voice.voice_id, voice.name)}
                            disabled={saving}
                            className="flex-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm py-2 rounded-lg font-medium transition-colors"
                          >
                            Select
                          </button>
                        )}
                        <button 
                          onClick={() => deleteVoice(voice.voice_id)}
                          className="px-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Voice Library */}
          <div className="lg:col-span-2">
            <div className="mp-card p-6 h-full flex flex-col">
              <div className="mb-6">
                <p className="mp-section-title">📚 Premium AI Voice Library</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Don't want to clone your voice? Choose from our curated library of ultra-realistic AI voices.
                </p>
              </div>

              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mb-4"/>
                  <p className="text-gray-500 font-medium">Loading premium voices...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar" style={{maxHeight: '600px'}}>
                  {aiVoices.map((voice) => (
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      key={voice.voice_id} 
                      className={`p-5 rounded-2xl border transition-all ${dbUser?.voice_id === voice.voice_id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-gray-500'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900 dark:text-white text-lg">{voice.name}</h4>
                        {dbUser?.voice_id === voice.voice_id && (
                          <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-sm">Active</span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {Object.entries(voice.labels || {}).slice(0, 3).map(([k, v]) => (
                          <span key={k} className="text-[10px] uppercase tracking-wider font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-1 rounded-md">
                            {v}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex gap-2 mt-auto">
                        <button 
                          onClick={() => playPreview(voice.voice_id, voice.preview_url)}
                          className="w-12 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl transition-colors dark:text-white"
                        >
                          {playingId === voice.voice_id ? '⏸' : '▶️'}
                        </button>
                        <button 
                          onClick={() => selectVoice(voice.voice_id, voice.name)}
                          disabled={saving || dbUser?.voice_id === voice.voice_id}
                          className={`flex-1 h-10 rounded-xl font-bold transition-all ${
                            dbUser?.voice_id === voice.voice_id 
                              ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed dark:bg-indigo-900/30 dark:text-indigo-700' 
                              : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 dark:bg-gray-800 dark:border-gray-600 dark:text-indigo-400 dark:hover:border-indigo-500'
                          }`}
                        >
                          {dbUser?.voice_id === voice.voice_id ? 'Selected' : 'Use Voice'}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
