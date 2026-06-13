import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import OnboardingPhoto from './pages/OnboardingPhoto'
import OnboardingContext from './pages/OnboardingContext'
import OnboardingQA from './pages/OnboardingQA'
import Dashboard from './pages/Dashboard'
import GenerateLibrary from './pages/GenerateLibrary'
import ManageLibrary from './pages/ManageLibrary'
import CustomQA from './pages/CustomQA'
import MeetingSetup from './pages/MeetingSetup'
import ActiveMeeting from './pages/ActiveMeeting'
import MeetingHistory from './pages/MeetingHistory'
import ProfileSettings from './pages/ProfileSettings'
import AccountSettings from './pages/AccountSettings'
import HelpPage from './pages/HelpPage'
import MeetingSummary from './pages/MeetingSummary'
import MeetingPrep from './pages/MeetingPrep'
import MeetingJoin from './pages/MeetingJoin'

// Protect private routes and show loading while auth state initializes.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" />
  return children
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/onboarding/photo"
              element={<ProtectedRoute><OnboardingPhoto /></ProtectedRoute>}
            />
            <Route
              path="/onboarding/context"
              element={<ProtectedRoute><OnboardingContext /></ProtectedRoute>}
            />
            <Route
              path="/onboarding/qa"
              element={<ProtectedRoute><OnboardingQA /></ProtectedRoute>}
            />
            <Route
              path="/dashboard"
              element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
            />
            <Route
              path="/library/generate"
              element={<ProtectedRoute><GenerateLibrary /></ProtectedRoute>}
            />
            <Route
              path="/library/manage"
              element={<ProtectedRoute><ManageLibrary /></ProtectedRoute>}
            />
            <Route
              path="/library/custom-qa"
              element={<ProtectedRoute><CustomQA /></ProtectedRoute>}
            />
            <Route
              path="/meeting/setup"
              element={<ProtectedRoute><MeetingSetup /></ProtectedRoute>}
            />
            <Route
              path="/meeting/active"
              element={<ProtectedRoute><ActiveMeeting /></ProtectedRoute>}
            />
            <Route
              path="/meeting/history"
              element={<ProtectedRoute><MeetingHistory /></ProtectedRoute>}
            />
            <Route
              path="/settings/profile"
              element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>}
            />
            <Route
              path="/settings/account"
              element={<ProtectedRoute><AccountSettings /></ProtectedRoute>}
            />
            <Route
              path="/meeting/prep"
              element={<ProtectedRoute><MeetingPrep /></ProtectedRoute>}
            />
            <Route
              path="/meeting/join/:sessionId"
              element={<ProtectedRoute><MeetingJoin /></ProtectedRoute>}
            />
            <Route
              path="/meeting/summary/:id"
              element={<ProtectedRoute><MeetingSummary /></ProtectedRoute>}
            />
            <Route
              path="/help"
              element={<ProtectedRoute><HelpPage /></ProtectedRoute>}
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
