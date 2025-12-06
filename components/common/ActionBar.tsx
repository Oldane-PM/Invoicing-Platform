'use client'

import { ReactNode } from 'react'

type ActionVariant = 'primary' | 'success' | 'danger' | 'warning' | 'neutral' | 'info'

export interface ActionButtonConfig {
  label: string
  onClick?: () => void
  leadingIcon?: ReactNode
  variant: ActionVariant
}

const variantClasses: Record<ActionVariant, string> = {
  primary: 'bg-primary-500 hover:bg-primary-600 text-white',
  success: 'bg-green-500 hover:bg-green-600 text-white',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  info: 'bg-sky-500 hover:bg-sky-600 text-white',
  neutral: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
}

interface ActionBarProps {
  actions: ActionButtonConfig[]
}

export function ActionBar({ actions }: ActionBarProps) {
  if (!actions.length) return null

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className={`inline-flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-medium shadow-sm transition-transform active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 ${variantClasses[action.variant]}`}
        >
          {action.leadingIcon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  )
}


