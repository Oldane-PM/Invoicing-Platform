'use client'

import { ReactNode, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FilterPanelProps {
  children: ReactNode
  title?: string
  defaultOpen?: boolean
}

export function FilterPanel({ children, title = 'Filters', defaultOpen = true }: FilterPanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
      <header
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="text-sm font-medium text-slate-700">{title}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </header>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </section>
  )
}


