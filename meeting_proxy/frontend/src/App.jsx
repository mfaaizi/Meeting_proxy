import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'

// Pages
import LandingPage       from './pages/LandingPage'
import LoginPage         from './pages/LoginPage'
import OnboardingPhoto   from './pages/OnboardingPhoto'
import OnboardingContext from './pages/OnboardingContext'
import OnboardingQA      from './pages/OnboardingQA'
import Dashboard         from './pages/Dashboard'
import GenerateLibrary   from './pages/GenerateLibrary'
import ManageLibrary     from './pages/ManageLibrary'
import CustomQA          from './pages/CustomQA'
import MeetingSetup      from './pages/MeetingSetup'
import MeetingPrep       from './pages/MeetingPrep'
import MeetingJoin       from './pages/MeetingJoin'
import ActiveMeeting     from './pages/ActiveMeeting'
import MeetingHistory    from './pages/MeetingHistory'
import MeetingSummary    from './pages/MeetingSummary'
import ProfileSettings   from './pages/ProfileSettings'
import AccountSettings   from './pages/AccountSettings'
import VoiceSettings     from './pages/VoiceSettings'
import HelpPage          from './pages/HelpPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function LoadingScreen() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'var(--bg)' }}
    >
      <div className="text-center">
        <div
          className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--orange)' }}
        />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#22c55e', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
              },
            }}
          />
          <Routes>
            {/* Public */}
            <Route path="/"      element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Onboarding */}
            <Route path="/onboarding/photo"
              element={<ProtectedRoute><OnboardingPhoto /></ProtectedRoute>} />
            <Route path="/onboarding/context"
              element={<ProtectedRoute><OnboardingContext /></ProtectedRoute>} />
            <Route path="/onboarding/qa"
              element={<ProtectedRoute><OnboardingQA /></ProtectedRoute>} />

            {/* Dashboard */}
            <Route path="/dashboard"
              element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            {/* Library */}
            <Route path="/library/generate"
              element={<ProtectedRoute><GenerateLibrary /></ProtectedRoute>} />
            <Route path="/library/manage"
              element={<ProtectedRoute><ManageLibrary /></ProtectedRoute>} />
            <Route path="/library/custom-qa"
              element={<ProtectedRoute><CustomQA /></ProtectedRoute>} />

            {/* Meeting */}
            <Route path="/meeting/prep"
              element={<ProtectedRoute><MeetingPrep /></ProtectedRoute>} />
            <Route path="/meeting/setup"
              element={<ProtectedRoute><MeetingSetup /></ProtectedRoute>} />
            <Route path="/meeting/join/:sessionId"
              element={<ProtectedRoute><MeetingJoin /></ProtectedRoute>} />
            <Route path="/meeting/active"
              element={<ProtectedRoute><ActiveMeeting /></ProtectedRoute>} />
            <Route path="/meeting/history"
              element={<ProtectedRoute><MeetingHistory /></ProtectedRoute>} />
            <Route path="/meeting/summary/:id"
              element={<ProtectedRoute><MeetingSummary /></ProtectedRoute>} />

            {/* Settings */}
            <Route path="/settings/profile"
              element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
            <Route path="/settings/account"
              element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
            <Route path="/settings/voice"
              element={<ProtectedRoute><VoiceSettings /></ProtectedRoute>} />

            {/* Help */}
            <Route path="/help"
              element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
