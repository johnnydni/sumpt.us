import { createContext, useContext } from 'react'

export interface ToastMessage {
  id: number
  text: string
  tone: 'confirm' | 'neutral'
}

export interface ToastContextValue {
  /** Short confirmation with a check mark — "Expense added ✓". */
  confirm: (text: string) => void
  notice: (text: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
