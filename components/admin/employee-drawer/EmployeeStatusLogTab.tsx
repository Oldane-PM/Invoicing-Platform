'use client'

import { StatusLogEntry } from './types'
import { CheckCircle2, XCircle, Clock, DollarSign, MessageCircle, UserPlus, UserMinus, FileText } from 'lucide-react'

interface EmployeeStatusLogTabProps {
  entries: StatusLogEntry[]
}

// Get icon and color based on action title
function getActivityStyle(actionTitle: string) {
  const title = actionTitle.toLowerCase()
  
  if (title.includes('approved')) {
    return {
      icon: CheckCircle2,
      bg: 'bg-emerald-500',
      iconColor: 'text-white',
      borderColor: 'border-emerald-100',
      bgLight: 'bg-emerald-50',
    }
  }
  if (title.includes('rejected')) {
    return {
      icon: XCircle,
      bg: 'bg-red-500',
      iconColor: 'text-white',
      borderColor: 'border-red-100',
      bgLight: 'bg-red-50',
    }
  }
  if (title.includes('payment') || title.includes('paid')) {
    return {
      icon: DollarSign,
      bg: 'bg-blue-500',
      iconColor: 'text-white',
      borderColor: 'border-blue-100',
      bgLight: 'bg-blue-50',
    }
  }
  if (title.includes('clarification')) {
    return {
      icon: MessageCircle,
      bg: 'bg-amber-500',
      iconColor: 'text-white',
      borderColor: 'border-amber-100',
      bgLight: 'bg-amber-50',
    }
  }
  if (title.includes('manager assigned') || title.includes('team')) {
    return {
      icon: UserPlus,
      bg: 'bg-indigo-500',
      iconColor: 'text-white',
      borderColor: 'border-indigo-100',
      bgLight: 'bg-indigo-50',
    }
  }
  if (title.includes('removed')) {
    return {
      icon: UserMinus,
      bg: 'bg-slate-500',
      iconColor: 'text-white',
      borderColor: 'border-slate-200',
      bgLight: 'bg-slate-50',
    }
  }
  if (title.includes('submitted') || title.includes('hours')) {
    return {
      icon: Clock,
      bg: 'bg-violet-500',
      iconColor: 'text-white',
      borderColor: 'border-violet-100',
      bgLight: 'bg-violet-50',
    }
  }
  
  // Default
  return {
    icon: FileText,
    bg: 'bg-slate-400',
    iconColor: 'text-white',
    borderColor: 'border-slate-200',
    bgLight: 'bg-slate-50',
  }
}

export function EmployeeStatusLogTab({ entries }: EmployeeStatusLogTabProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No activity log entries found.</p>
        <p className="text-xs text-slate-400 mt-1">Activities will appear here when submissions are created or updated.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">Activity & Status Log</h3>
      
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
        
        <div className="space-y-0">
          {entries.map((entry, index) => {
            const style = getActivityStyle(entry.actionTitle)
            const IconComponent = style.icon
            
            return (
              <div key={entry.id} className={`relative pl-10 ${index !== entries.length - 1 ? 'pb-5' : ''}`}>
                {/* Timeline icon */}
                <div className={`absolute left-0 top-1 w-8 h-8 rounded-full ${style.bg} border-[3px] border-white shadow-sm flex items-center justify-center`}>
                  <IconComponent className={`w-4 h-4 ${style.iconColor}`} />
                </div>
                
                {/* Content card */}
                <div className={`rounded-xl border ${style.borderColor} ${style.bgLight} px-4 py-3`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {entry.actionTitle}
                    </span>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {entry.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{entry.description}</p>
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-[10px] font-medium text-slate-600">
                      {entry.performedBy.charAt(0).toUpperCase()}
                    </span>
                    {entry.performedBy}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
