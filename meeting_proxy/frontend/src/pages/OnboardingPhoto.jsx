import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import MouseGlow from '../components/MouseGlow'
import PageBackground from '../components/PageBackground'
import api from '../api'

function StepBar({ step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: s <= step ? 'var(--orange)' : 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              color: s <= step ? '#fff' : 'var(--text-muted)',
            }}
          >
            {s < step ? '✓' : s}
          </div>
          {s < 3 && (
            <div
              className="w-16 h-0.5"
              style={{ background: s < step ? 'var(--orange)' : 'var(--border)' }}
            />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        Step {step} of 3
      </span>
    </div>
  )
}

export default function OnboardingPhoto() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onDrop = useCallback((accepted) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [] },
    maxSize: 10 * 1024 * 1024,
  })

  const upload = async () => {
    if (!file) return toast.error('Please select a photo first')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      await api.post('/api/upload-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Photo uploaded!')
      navigate('/onboarding/context')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text-primary)' }} className="min-h-screen flex items-center justify-center p-4">
      <PageBackground />
      <MouseGlow />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-2xl font-bold mb-1">
            <span style={{ color: 'var(--text-primary)' }}>Meeting</span>
            <span style={{ color: 'var(--orange)' }}>Proxy</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Account Setup</p>
        </div>

        <div
          className="mp-card p-8"
          style={{ boxShadow: 'var(--shadow-card)', background: 'var(--bg-card)' }}
        >
          {/* Top glow */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
            <div style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,107,53,0.12), transparent 60%)', height: '100%' }} />
          </div>

          <div className="relative z-10">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2">
              <span className="mp-badge px-5 py-1.5 text-xs">SETUP</span>
            </div>

            <StepBar step={1} />

            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Upload Your Photo</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              This photo will be used to create your AI avatar. Use a clear, front-facing photo.
            </p>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className="cursor-pointer rounded-xl p-8 text-center transition-all duration-200"
              style={{
                border: `2px dashed ${isDragActive ? 'var(--orange)' : 'var(--border)'}`,
                background: isDragActive ? 'rgba(255,107,53,0.05)' : 'var(--bg-input)',
              }}
            >
              <input {...getInputProps()} />
              {preview ? (
                <img src={preview} alt="preview" className="mx-auto w-32 h-32 rounded-xl object-cover mb-3" style={{ border: '2px solid var(--orange)' }} />
              ) : (
                <div className="mb-3 text-4xl">📷</div>
              )}
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {isDragActive ? 'Drop it here!' : preview ? 'Click to change photo' : 'Drag & drop or click to select'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>JPG, PNG · Max 10 MB</p>
            </div>

            <button
              onClick={upload}
              disabled={loading || !file}
              className="mp-btn-primary w-full mt-6 py-3"
            >
              {loading ? 'Uploading…' : 'Continue →'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
