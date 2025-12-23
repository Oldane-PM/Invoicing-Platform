'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RealtimeProvider } from '@/components/providers'

interface EmployeeRealtimeWrapperProps {
  children: React.ReactNode
}

/**
 * EmployeeRealtimeWrapper
 * 
 * Wraps employee portal pages with authentication check and realtime subscription.
 * Use this at the top level of employee pages to enable real-time updates.
 */
export function EmployeeRealtimeWrapper({ children }: EmployeeRealtimeWrapperProps) {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const storedEmployeeId = localStorage.getItem('employeeId')
    
    if (!storedEmployeeId) {
      router.push('/sign-in')
      return
    }

    setEmployeeId(storedEmployeeId)
    setIsReady(true)
  }, [router])

  if (!isReady || !employeeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <RealtimeProvider role="employee" employeeId={employeeId}>
      {children}
    </RealtimeProvider>
  )
}

