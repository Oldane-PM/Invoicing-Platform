'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, LogOut, Search } from 'lucide-react'
import { getManagerSubmissions } from '@/lib/supabase/queries/submissions'
import { SubmissionTable } from './_components/SubmissionTable'
import type { Submission } from '@/types/domain'

interface SubmissionWithEmployee extends Submission {
  employee: {
    id: string
    name: string
    email: string
  }
}

export default function ManagerDashboard() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<SubmissionWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [managerId, setManagerId] = useState<string>('')

  useEffect(() => {
    // Check if user is authenticated and is a manager
    const userRole = localStorage.getItem('userRole')
    if (!userRole || userRole !== 'manager') {
      router.push('/login')
      return
    }

    // Get manager ID from storage (should come from Better-Auth session in production)
    const storedManagerId = localStorage.getItem('managerId')
    if (storedManagerId) {
      setManagerId(storedManagerId)
    } else {
      // Redirect to login if no manager ID
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    if (managerId) {
      loadSubmissions()
    }
  }, [managerId])

  const loadSubmissions = async () => {
    try {
      setLoading(true)
      const data = await getManagerSubmissions(managerId)
      setSubmissions(data)
    } catch (error) {
      console.error('Error loading submissions:', error)
      alert('Failed to load submissions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredSubmissions = submissions.filter((submission) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      submission.employee.name.toLowerCase().includes(query) ||
      submission.employee.email.toLowerCase().includes(query) ||
      submission.status.toLowerCase().includes(query)
    )
  })

  const stats = {
    pending: submissions.filter((s) => s.status === 'submitted').length,
    approved: submissions.filter((s) => s.status === 'approved').length,
    totalHours: submissions.reduce((sum, s) => sum + s.hours_submitted, 0),
    teamSize: new Set(submissions.map((s) => s.employee_id)).size,
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Manager Dashboard
            </h1>
            <p className="text-gray-600">
              Manage your team and approve time submissions.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/manager/team')}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              <Users className="w-5 h-5" />
              <span>Manage Team</span>
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('managerId')
                localStorage.removeItem('userRole')
                router.push('/login')
              }}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Size</p>
                <p className="text-2xl font-bold text-gray-900">{stats.teamSize}</p>
                <p className="text-xs text-gray-500 mt-1">Active members</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-xs text-gray-500 mt-1">Needs review</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalHours}</p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                <p className="text-xs text-gray-500 mt-1">Submissions</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Submissions Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Employee Submissions</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-500">Loading submissions...</p>
            </div>
          ) : (
            <SubmissionTable
              submissions={filteredSubmissions}
              managerId={managerId}
              onActionComplete={loadSubmissions}
            />
          )}
        </div>
      </div>
    </div>
  )
}

