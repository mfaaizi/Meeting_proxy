import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import PageBackground from './PageBackground'
import MouseGlow from './MouseGlow'

export default function PageShell({ title, subtitle, children, noPad = false }) {
  return (
    <div style={{ background: 'var(--bg)' }} className="min-h-screen">
      <PageBackground />
      <MouseGlow />
      <Sidebar />

      {/* Main content area offset by sidebar width on desktop */}
      <div className="mp-layout">
        {/* Mobile top spacing */}
        <div className="md:hidden h-14" />

        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={noPad ? '' : 'px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto'}
        >
          {(title || subtitle) && (
            <div className="mb-8">
              {title && (
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {children}
        </motion.main>
      </div>
    </div>
  )
}
