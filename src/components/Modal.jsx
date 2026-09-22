import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, className = '' }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`card relative max-h-[min(680px,calc(100vh-2rem))] w-full overflow-hidden shadow-2xl ${className || 'max-w-lg'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between border-b border-base-700/60 px-6 py-4">
          <h3 id="modal-title" className="font-serif text-xl text-slate-50">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-base-800 hover:text-slate-100"
            aria-label="Close dialog"
          >
            <X size={17} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-7rem)] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}