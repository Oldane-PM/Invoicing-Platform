'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Database } from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated and is an admin
    const userRole = localStorage.getItem('userRole')
    if (!userRole || userRole !== 'admin') {
      router.push('/login')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('userRole')
    localStorage.removeItem('managerId')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
            <p className="text-gray-600">Manage system-wide settings and configurations.</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Admin Dashboard
          </h2>
          <p className="text-gray-600">
            Admin functionality coming soon. This dashboard will allow you to manage
            system-wide settings, users, and configurations.
          </p>
        </div>
      </div>
    </div>
  )
}

