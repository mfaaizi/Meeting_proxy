import { useEffect, useState } from 'react'

/**
 * MouseGlow — renders a radial gradient that follows the cursor.
 * Drop it at the top of any full-page component.
 */
export default function MouseGlow() {
  const [pos, setPos] = useState({ x: -999, y: -999 })

  useEffect(() => {
    const move = (e) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <>
      {/* The base radial glow */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(320px at ${pos.x}px ${pos.y}px, var(--mouse-glow), transparent 80%)`,
        }}
      />

      {/* Grid lines that only appear/glow around the mouse */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--orange) 1px, transparent 1px),
            linear-gradient(to bottom, var(--orange) 1px, transparent 1px)
          `,
          backgroundSize: '52px 52px',
          opacity: 0.25,
          WebkitMaskImage: `radial-gradient(320px at ${pos.x}px ${pos.y}px, black, transparent 70%)`,
          maskImage: `radial-gradient(320px at ${pos.x}px ${pos.y}px, black, transparent 70%)`,
        }}
      />
    </>
  )
}
