/**
 * PageBackground — fixed background layer with grid overlay and radial
 * accent glows. Wraps every full-page component.
 */
export default function PageBackground() {
  return (
    <>
      {/* Base colour */}
      <div className="fixed inset-0 -z-20" style={{ background: 'var(--bg)' }} />

      {/* Radial accent glows */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 10% 15%, var(--orange-faint) 0%, transparent 45%),
            radial-gradient(circle at 85% 10%, rgba(0,0,0,0) 0%, transparent 50%),
            radial-gradient(circle at 20% 85%, var(--orange-faint) 0%, transparent 45%),
            radial-gradient(circle at 80% 80%, var(--orange-faint) 0%, transparent 45%)
          `,
        }}
      />

      {/* Grid lines */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none mp-grid"
      />
    </>
  )
}
