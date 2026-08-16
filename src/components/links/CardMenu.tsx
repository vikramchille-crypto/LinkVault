import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

interface CardMenuProps {
  trigger: (props: { onClick: () => void; ref: RefObject<HTMLButtonElement> }) => ReactNode
  children: (close: () => void) => ReactNode
}

// A dropdown menu rendered via a portal into document.body, positioned with
// fixed coordinates computed from the trigger button. This is necessary
// because link cards use `overflow-hidden` (for rounded thumbnail corners),
// which would otherwise silently clip a normally-positioned absolute
// dropdown — making it look like the menu button "does nothing".
export function CardMenu({ trigger, children }: CardMenuProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      setCoords({ top: rect.bottom + 6, left: Math.max(8, rect.right - 176) })
    }
    setOpen(true)
  }

  function close() {
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function handleScrollOrResize() {
      close()
    }
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open])

  return (
    <>
      {trigger({ onClick: () => (open ? close() : openMenu()), ref: buttonRef })}
      {open &&
        coords &&
        createPortal(
          <>
            {/* Invisible full-screen backdrop closes the menu on outside click */}
            <div className="fixed inset-0 z-40" onClick={close} />
            <div
              className="fixed z-50 w-44 bg-base-850 border border-base-700 rounded-xl shadow-card py-1.5"
              style={{ top: coords.top, left: coords.left }}
            >
              {children(close)}
            </div>
          </>,
          document.body
        )}
    </>
  )
}
