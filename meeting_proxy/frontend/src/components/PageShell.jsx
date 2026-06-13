import { motion } from 'framer-motion'
import Navbar from './Navbar'

export default function PageShell({ title, children }) {
  // Shared page wrapper adds Navbar and a subtle motion transition.
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white">
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6"
      >
        {title && <h1 className="mb-6 text-3xl font-bold">{title}</h1>}
        {children}
      </motion.main>
    </div>
  )
}
