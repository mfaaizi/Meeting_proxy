import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import api from '../api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [dbUser, setDbUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Beginner-friendly comment: Handle the result of a sign-in redirect when the page loads.
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        const token = await result.user.getIdToken()
        try {
          const res = await api.post('/api/auth/firebase', { token })
          setDbUser(res.data.user)
          setUser(result.user)
        } catch (e) {
          console.error('Backend auth error from redirect:', e)
        }
      }
    }).catch(e => {
      console.error('Redirect result error:', e)
    })

    // Keep frontend auth state in sync with Firebase auth state.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get Firebase ID token and exchange it with Flask backend.
          const token = await firebaseUser.getIdToken()
          const res = await api.post('/api/auth/firebase', { token })
          setDbUser(res.data.user)
          setUser(firebaseUser)
        } catch (error) {
          console.error('Auth sync error:', error)
        } finally {
          setLoading(false)
        }
      } else {
        setUser(null)
        setDbUser(null)
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  const refreshDbUser = async () => {
    try {
      const res = await api.get('/api/auth/me')
      setDbUser(res.data.user)
      return res.data.user
    } catch {
      return null
    }
  }

  const loginWithGoogle = async () => {
    try {
      // Beginner-friendly comment: Try opening a popup first (better UX).
      const result = await signInWithPopup(auth, googleProvider)
      return result
    } catch (popupError) {
      console.log('Popup blocked or failed, using redirect...', popupError)
      // Fallback to redirect if popup is blocked (common in some browsers).
      await signInWithRedirect(auth, googleProvider)
    }
  }

  const logout = async () => {
    await signOut(auth)
    await api.post('/api/auth/logout', {})
    setUser(null)
    setDbUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        loading,
        loginWithGoogle,
        logout,
        refreshDbUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
