import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAFUcoXkDEn-k4nKjziVTxGHoDFVfSV8p8",
  authDomain: "meetingproxy.firebaseapp.com",
  projectId: "meetingproxy",
  storageBucket: "meetingproxy.firebasestorage.app",
  messagingSenderId: "805689322227",
  appId: "1:805689322227:web:52862b0cbc3e2efd882586"
}

// Beginner-friendly comment: Initializing the Firebase app with our project credentials.
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Keep user logged in after page refresh using local storage persistence.
setPersistence(auth, browserLocalPersistence)

export const googleProvider = new GoogleAuthProvider()
// Force account selection on every login attempt for better UX.
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

export default app