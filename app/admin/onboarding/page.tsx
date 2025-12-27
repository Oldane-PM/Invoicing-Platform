'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Clock, CheckCircle, XCircle, Search } from 'lucide-react'
import { getOnboardingQueue } from '@/lib/data/onboarding'
import type { OnboardingData } from '@/lib/data/onboarding'
import { format } from 'date-fns'

export default function AdminOnboardingQueue() {
  const router = useRouter()
  const [queue, setQueue] = useState<OnboardingData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'WAITING' | 'REJECTED'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const adminId = localStorage.getItem('employeeId')
    const userRole = localStorage.getItem('userRole')

    if (!adminId || userRole?.toUpperCase() !== 'ADMIN') {
      router.push('/sign-in')
      return
    }

    loadQueue()

    // Poll for updates every 30 seconds
    const interval = setInterval(loadQueue, 30000)
    return () => clearInterval(interval)
  }, [router])

  const loadQueue = async () => {
    try {
      const data = await getOnboardingQueue()
      setQueue(data)
    } catch (error) {
      console.error('Error loading onboarding queue:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WAITING':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
            <Clock className="w-4 h-4 mr-1" />
            Waiting
          </span>
        )
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4 mr-1" />
            Rejected
          </span>
        )
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Approved
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Not Submitted
          </span>
        )
    }
  }

  const filteredQueue = queue.filter((item) => {
    // Filter by status
    if (filter !== 'ALL' && item.adminApprovalStatus !== filter) {
      return false
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        item.employeeName.toLowerCase().includes(term) ||
        item.employeeEmail.toLowerCase().includes(term)
      )
    }

    return true
  })

  const statusCounts = {
    ALL: queue.length,
    WAITING: queue.filter((q) => q.adminApprovalStatus === 'WAITING').length,
    REJECTED: queue.filter((q) => q.adminApprovalStatus === 'REJECTED').length,
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Onboarding</h1>
          <p className="text-gray-600">Review and approve employee onboarding submissions</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({statusCounts.ALL})
              </button>
              <button
                onClick={() => setFilter('WAITING')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'WAITING'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Waiting ({statusCounts.WAITING})
              </button>
              <button
                onClick={() => setFilter('REJECTED')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'REJECTED'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Rejected ({statusCounts.REJECTED})
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Queue Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredQueue.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No employees found</h3>
              <p className="text-gray-500">
                {filter !== 'ALL'
                  ? `No employees with ${filter.toLowerCase()} status`
                  : 'All employees have completed onboarding'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                      Employee
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                      Progress
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                      Submitted
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                      Manager
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredQueue.map((item) => (
                    <tr
                      key={item.employeeId}
                      onClick={() => router.push(`/admin/onboarding/${item.employeeId}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-medium text-gray-900">{item.employeeName}</div>
                          <div className="text-sm text-gray-500">{item.employeeEmail}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(item.adminApprovalStatus)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 transition-all"
                                style={{
                                  width: `${
                                    (item.progress.completed_steps / item.progress.total_steps) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {item.progress.completed_steps}/{item.progress.total_steps}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {item.onboardingSubmittedAt
                          ? format(new Date(item.onboardingSubmittedAt), 'MMM d, yyyy')
                          : 'Not submitted'}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {item.managerName || 'Not assigned'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

