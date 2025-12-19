'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RealtimeProvider } from '@/components/providers'

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [managerId, setManagerId] = useState<string | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    // Check authorization
    const userRole = localStorage.getItem('userRole')
    const storedEmployeeId = localStorage.getItem('employeeId')
    const storedManagerId = localStorage.getItem('managerId')
    
    const isManager = userRole === 'MANAGER' || userRole === 'manager'
    const isAdmin = userRole === 'ADMIN' || userRole === 'admin'
    
    if (!userRole || (!isManager && !isAdmin)) {
      router.push('/sign-in')
      return
    }

    setEmployeeId(storedEmployeeId)
    setManagerId(storedManagerId || storedEmployeeId) // Manager's employee ID is their manager ID
    setIsAuthorized(true)
  }, [router])

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <RealtimeProvider 
      role="manager" 
      employeeId={employeeId || undefined}
      managerId={managerId || undefined}
    >
      {children}
    </RealtimeProvider>
  )
}

