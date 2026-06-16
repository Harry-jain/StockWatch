'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <section className="w-full max-w-lg rounded-lg border border-background-border bg-background-elevated p-4 shadow-2xl">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <Button variant="ghost" className="h-9 w-9 px-0" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </Button>
        </header>
        {children}
      </section>
    </div>
  )
}
