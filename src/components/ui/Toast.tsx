import { useCallback, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { ToastContext, type ToastContextValue, type ToastMessage } from './toastContext'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const counter = useRef(0)
  const reduced = useReducedMotion()

  const push = useCallback((text: string, tone: ToastMessage['tone']) => {
    const id = (counter.current += 1)
    setToasts((current) => [...current.slice(-2), { id, text, tone }])
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 2400)
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      confirm: (text) => push(text, 'confirm'),
      notice: (text) => push(text, 'neutral'),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-[60] flex flex-col items-center gap-2 px-5 sm:bottom-8"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'pointer-events-auto flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium shadow-lift',
                toast.tone === 'confirm' ? 'bg-ink text-white' : 'bg-navy text-white',
              )}
            >
              {toast.tone === 'confirm' && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/15">
                  <Check size={11} strokeWidth={3} />
                </span>
              )}
              {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
