'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Search } from 'lucide-react'
import { getManagerSubmissions } from '@/lib/supabase/queries/submissions'
import { SubmissionTable } from './_components/SubmissionTable'
import { SubmissionDetailDrawer } from './_components/SubmissionDetailDrawer'
import type { Submission } from '@/types/domain'
import { AppHeader } from '@/components/layout/AppHeader'
import { FilterPanel } from '@/components/common/FilterPanel'

interface SubmissionWithEmployee extends Submission {
  employee: {
    id: string
    name: string
    email: string
    hourly_rate: number | null
  }
}

export default function ManagerDashboard() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<SubmissionWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [managerId, setManagerId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'SUBMITTED' | 'MANAGER_APPROVED' | 'MANAGER_REJECTED' | 'NEEDS_CLARIFICATION'>(
    'all'
  )
  const [timeFilter, setTimeFilter] = useState<'all' | '30' | '90'>('all')
  
  // Drawer state
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithEmployee | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleRowClick = (submission: SubmissionWithEmployee) => {
    setSelectedSubmission(submission)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setSelectedSubmission(null)
  }

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
    const query = searchQuery.trim().toLowerCase()

    // Search by employee name, email, or status
    if (query) {
      const matchesSearch =
        submission.employee.name.toLowerCase().includes(query) ||
        submission.employee.email.toLowerCase().includes(query) ||
        submission.status.toLowerCase().includes(query)

      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter !== 'all' && submission.status !== statusFilter) {
      return false
    }

    // Time filter (last 30 / 90 days)
    if (timeFilter !== 'all') {
      const days = timeFilter === '30' ? 30 : 90
      const now = new Date()
      const cutoff = new Date(now)
      cutoff.setDate(now.getDate() - days)

      const submissionDate = new Date((submission as any).submission_date)
      if (isNaN(submissionDate.getTime()) || submissionDate < cutoff) {
        return false
      }
    }

    return true
  })

  // Calculate stats from FILTERED submissions so cards match table
  const stats = {
    pending: filteredSubmissions.filter((s) => s.status === 'SUBMITTED' || s.status === 'NEEDS_CLARIFICATION').length,
    approved: filteredSubmissions.filter((s) => s.status === 'MANAGER_APPROVED' || s.status === 'ADMIN_PAID').length,
    rejected: filteredSubmissions.filter((s) => s.status === 'MANAGER_REJECTED').length,
    totalHours: filteredSubmissions.reduce((sum, s) => sum + (s.hours_submitted || 0) + (s.overtime_hours || 0), 0),
    totalAmount: filteredSubmissions.reduce((sum, s) => {
      const hours = (s.hours_submitted || 0) + (s.overtime_hours || 0)
      const rate = s.employee?.hourly_rate || 0
      return sum + (hours * rate)
    }, 0),
    teamSize: new Set(filteredSubmissions.map((s) => s.employee_id)).size,
    totalSubmissions: filteredSubmissions.length,
  }

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || timeFilter !== 'all'

  // Get active filter summary
  const getActiveFilterSummary = () => {
    const parts: string[] = []
    if (searchQuery) parts.push(`"${searchQuery}"`)
    if (statusFilter !== 'all') {
      const labels: Record<string, string> = {
        'SUBMITTED': 'Pending',
        'MANAGER_APPROVED': 'Approved',
        'MANAGER_REJECTED': 'Rejected',
        'NEEDS_CLARIFICATION': 'Clarification'
      }
      parts.push(labels[statusFilter] || statusFilter)
    }
    if (timeFilter !== 'all') parts.push(`Last ${timeFilter} days`)
    return parts.join(', ')
  }

  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setTimeFilter('all')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        portal="manager"
        title="Manager Dashboard"
        subtitle="Manage your team and approve time submissions."
        primaryActionLabel="Manage Team"
        primaryActionIcon={<Users className="w-4 h-4" />}
        onPrimaryAction={() => router.push('/manager/team')}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Active Filter Indicator */}
        {hasActiveFilters && (
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>
              <strong>Filtered view:</strong> {getActiveFilterSummary()}
              <span className="text-slate-500 ml-1">({stats.totalSubmissions} results)</span>
            </span>
            <button
              onClick={resetFilters}
              className="ml-auto text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Stats Cards - Values reflect current filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.teamSize} employees</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.totalHours.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  ${stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
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
                <p className="text-xs text-gray-500 mt-1">{stats.rejected} rejected</p>
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
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Employee Submissions</h2>
          </div>

          <FilterPanel title="Filters & Search">
            <div className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {/* Search input */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by employee name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Status filter */}
                <div className="relative w-full md:w-56">
                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as 'all' | 'SUBMITTED' | 'MANAGER_APPROVED' | 'MANAGER_REJECTED' | 'NEEDS_CLARIFICATION')
                    }
                    className="w-full appearance-none px-4 py-2.5 pr-10 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="SUBMITTED">Pending Review</option>
                    <option value="MANAGER_APPROVED">Approved</option>
                    <option value="MANAGER_REJECTED">Rejected</option>
                    <option value="NEEDS_CLARIFICATION">Needs Clarification</option>
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                    ▾
                  </span>
                </div>

                {/* Time filter */}
                <div className="relative w-full md:w-52">
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value as 'all' | '30' | '90')}
                    className="w-full appearance-none px-4 py-2.5 pr-10 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  >
                    <option value="all">All Time</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                    ▾
                  </span>
                </div>
              </div>

              {/* Reset button */}
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
              >
                Reset Filters
              </button>
            </div>
          </FilterPanel>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-slate-500">Loading submissions...</p>
            </div>
          ) : (
            <SubmissionTable
              submissions={filteredSubmissions}
              managerId={managerId}
              onActionComplete={loadSubmissions}
              onRowClick={handleRowClick}
            />
          )}
        </div>
      </div>

      {/* Submission Detail Drawer */}
      <SubmissionDetailDrawer
        submission={selectedSubmission}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  )
}

