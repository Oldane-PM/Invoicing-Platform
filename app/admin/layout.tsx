'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RealtimeProvider } from '@/components/providers'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    // Check authorization
    const userRole = localStorage.getItem('userRole')
    const storedEmployeeId = localStorage.getItem('employeeId')
    
    const isAdmin = userRole === 'ADMIN' || userRole === 'admin'
    
    if (!userRole || !isAdmin) {
      router.push('/sign-in')
      return
    }

    setEmployeeId(storedEmployeeId)
    setIsAuthorized(true)
  }, [router])

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <RealtimeProvider 
      role="admin" 
      employeeId={employeeId || undefined}
    >
      {children}
    </RealtimeProvider>
  )
}

