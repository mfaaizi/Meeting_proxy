import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import PageShell from '../components/PageShell'
import api from '../api'

export default function OnboardingPhoto() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onDrop = useCallback((acceptedFiles) => {
    const selected = acceptedFiles[0]
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [] },
    maxSize: 10 * 1024 * 1024,
  })

  const uploadPhoto = async () => {
    if (!file) return toast.error('Please upload a photo first')
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      await api.post('/api/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Photo uploaded successfully')
      navigate('/onboarding/context')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell title="Upload Your Photo">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-6 h-2 rounded bg-gray-200 dark:bg-gray-700">
          <div className="h-2 w-1/3 rounded bg-blue-500" />
        </div>
        <p className="mb-6 text-gray-600 dark:text-gray-300">Step 1 of 3 (33%)</p>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          This photo will be used to create your AI avatar
        </p>

        <div
          {...getRootProps()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-10 text-center dark:border-gray-600"
        >
          <input {...getInputProps()} />
          {isDragActive ? 'Drop your photo here...' : 'Drag and drop photo here, or click to select'}
        </div>

        {preview && (
          <img src={preview} alt="Preview" className="mt-4 h-40 w-40 rounded-xl object-cover" />
        )}

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Supported formats: JPG, PNG (max 10MB)
        </p>

        <button
          type="button"
          onClick={uploadPhoto}
          disabled={loading}
          className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Uploading...' : 'Continue'}
        </button>
      </div>
    </PageShell>
  )
}
