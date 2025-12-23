'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  Search,
  X,
  User,
  DollarSign,
  Users,
  FileText,
  RefreshCw,
  CreditCard,
  MessageCircle,
  Ban,
  MoreHorizontal,
  AlertTriangle,
} from 'lucide-react'
import Swal from 'sweetalert2'
import { EmployeeDetailDrawer, EmployeeDetail } from '@/components/admin/employee-drawer'
import { RequestClarificationDialog } from '@/components/admin/request-clarification-dialog'
import { RejectSubmissionDialog } from '@/components/admin/reject-submission-dialog'
import { AdminCalendarControl } from '@/components/admin/calendar-controls'
import { AppHeader } from '@/components/layout/AppHeader'
import { FilterPanel } from '@/components/common/FilterPanel'
import { Combobox } from '@/components/ui/combobox'
import type { SubmissionStatus } from '@/types/domain'
import { 
  adminCanProcessPayment, 
  adminCanReject, 
  adminCanRequestClarification,
  getStatusDisplay,
  getAdminStatusLabel 
} from '@/lib/submission-status'

// Admin Action Types
type AdminAction = 'process_payment' | 'reject' | 'need_clarification'

const ACTION_LABELS: Record<AdminAction, string> = {
  process_payment: 'Process Payment',
  reject: 'Reject',
  need_clarification: 'Need Clarification',
}

// Types
interface Employee {
  id: string
  name: string
  email: string
  hourly_rate: number | null
  active_project: string | null
  role: string
}

interface Manager {
  id: string
  name: string
  email: string
}

interface Project {
  id: string
  name: string
}

interface Submission {
  id: string
  employee_id: string
  manager_id: string | null
  submission_date: string
  hours_submitted: number
  overtime_hours: number | null
  description: string
  overtime_description: string | null
  status: SubmissionStatus
  invoice_id: string | null
  manager_comment: string | null
  admin_comment: string | null
  created_at: string
  updated_at: string
  employee: Employee
  manager: Manager | null
}

// Status colors mapping using new canonical statuses
const statusConfig: Record<SubmissionStatus | 'not_submitted', { bg: string; text: string; label: string }> = {
  SUBMITTED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Manager' },
  MANAGER_APPROVED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Ready for Payment' },
  MANAGER_REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Manager Rejected' },
  ADMIN_PAID: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
  ADMIN_REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
  NEEDS_CLARIFICATION: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Awaiting Clarification' },
  not_submitted: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Not Submitted' },
}

// Contractor/Role type colors
const contractorTypeConfig: Record<string, { bg: string; text: string; label: string }> = {
  'employee': { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Employee' },
  'manager': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Manager' },
  'admin': { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Admin' },
  'contractor': { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Contractor' },
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)

  const handleMenuToggle = (submissionId: string, buttonEl: HTMLButtonElement | null) => {
    if (showActionMenu === submissionId) {
      setShowActionMenu(null)
      setMenuPosition(null)
    } else if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 208, // 208px is menu width (w-52)
      })
      setShowActionMenu(submissionId)
    }
  }
  
  // Employee Detail Drawer
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  // Calendar Controls Drawer
  const [isCalendarControlOpen, setIsCalendarControlOpen] = useState(false)

  // Dialog states for admin actions
  const [clarificationOpen, setClarificationOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [selectedActionRow, setSelectedActionRow] = useState<Submission | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [contractorTypeFilter, setContractorTypeFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [managerFilter, setManagerFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  
  // Stats - calculated from filtered submissions
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    paid: 0,
    totalHours: 0,
    totalAmount: 0,
    uniqueEmployees: 0,
  })

  // Base stats (unfiltered) for comparison
  const [baseStats, setBaseStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
  })

  useEffect(() => {
    // Check if user is authenticated and is an admin
    const userRole = localStorage.getItem('userRole')
    // Support both uppercase and lowercase role checks for backwards compatibility
    const isAdmin = userRole === 'ADMIN' || userRole === 'admin'
    
    if (!userRole || !isAdmin) {
      // Show unauthorized message and redirect to appropriate dashboard
      if (userRole) {
        showUnauthorizedToast()
        // Redirect to correct dashboard based on role
        const dashboardPaths: Record<string, string> = {
          'MANAGER': '/manager/dashboard',
          'manager': '/manager/dashboard',
          'EMPLOYEE': '/',
          'employee': '/',
        }
        router.push(dashboardPaths[userRole] || '/sign-in')
      } else {
        router.push('/sign-in')
      }
      return
    }
    loadInitialData()
  }, [router])
  
  const showUnauthorizedToast = () => {
    if (typeof window !== 'undefined') {
      const toastDiv = document.createElement('div')
      toastDiv.className = 'fixed top-4 right-4 z-[100] bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg'
      toastDiv.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span>You don't have access to that area.</span>
        </div>
      `
      document.body.appendChild(toastDiv)
      setTimeout(() => toastDiv.remove(), 4000)
    }
  }

  const loadInitialData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadSubmissions(),
        loadManagers(),
        loadProjects(),
        loadBaseStats(),
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadBaseStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        if (data.stats) {
          setBaseStats({
            totalEmployees: data.stats.totalEmployees || 0,
            activeEmployees: data.stats.activeEmployees || 0,
          })
        }
      }
    } catch (error) {
      console.error('Error loading base stats:', error)
    }
  }

  const loadSubmissions = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (managerFilter !== 'all') params.append('manager', managerFilter)
      if (monthFilter !== 'all') params.append('month', monthFilter)
      if (searchQuery) params.append('search', searchQuery)
      if (contractorTypeFilter !== 'all') params.append('contractorType', contractorTypeFilter)
      if (projectFilter !== 'all') params.append('project', projectFilter)

      const response = await fetch(`/api/admin/submissions?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        const submissions = data.submissions || []
        setSubmissions(submissions)
        calculateStats(submissions)
      } else {
        console.error('Failed to fetch submissions')
        setSubmissions([])
        calculateStats([])
      }
    } catch (error) {
      console.error('Error loading submissions:', error)
      setSubmissions([])
      calculateStats([])
    }
  }

  const loadManagers = async () => {
    try {
      const response = await fetch('/api/admin/managers')
      if (response.ok) {
        const data = await response.json()
        setManagers(data.managers || [])
      }
    } catch (error) {
      console.error('Error loading managers:', error)
    }
  }

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/admin/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const calculateStats = (subs: Submission[]) => {
    // Calculate total hours and amount from filtered submissions
    let totalHours = 0
    let totalAmount = 0
    const employeeIds = new Set<string>()

    subs.forEach(sub => {
      const hours = (sub.hours_submitted || 0) + (sub.overtime_hours || 0)
      totalHours += hours
      const rate = sub.employee?.hourly_rate || 0
      totalAmount += hours * rate
      if (sub.employee_id) {
        employeeIds.add(sub.employee_id)
      }
    })

    setStats({
      totalSubmissions: subs.length,
      submitted: subs.filter(s => s.status === 'SUBMITTED').length,
      approved: subs.filter(s => s.status === 'MANAGER_APPROVED').length,
      rejected: subs.filter(s => s.status === 'MANAGER_REJECTED' || s.status === 'ADMIN_REJECTED').length,
      paid: subs.filter(s => s.status === 'ADMIN_PAID').length,
      totalHours,
      totalAmount,
      uniqueEmployees: employeeIds.size,
    })
  }

  // Effect to reload when filters change
  useEffect(() => {
    if (!loading) {
      loadSubmissions()
    }
  }, [statusFilter, contractorTypeFilter, projectFilter, managerFilter, monthFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadSubmissions()
  }

  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setContractorTypeFilter('all')
    setProjectFilter('all')
    setManagerFilter('all')
    setMonthFilter('all')
  }

  // Check if any filters are active
  const hasActiveFilters = 
    searchQuery !== '' ||
    statusFilter !== 'all' ||
    contractorTypeFilter !== 'all' ||
    projectFilter !== 'all' ||
    managerFilter !== 'all' ||
    monthFilter !== 'all'

  // Get active filter summary for display
  const getActiveFilterSummary = () => {
    const parts: string[] = []
    if (searchQuery) parts.push(`"${searchQuery}"`)
    if (statusFilter !== 'all') parts.push(statusFilter.replace('_', ' '))
    if (contractorTypeFilter !== 'all') parts.push(contractorTypeFilter)
    if (monthFilter !== 'all') {
      const monthOpt = getMonthOptions().find(m => m.value === monthFilter)
      if (monthOpt) parts.push(monthOpt.label)
    }
    return parts.join(', ')
  }

  const handleLogout = () => {
    localStorage.removeItem('userRole')
    localStorage.removeItem('managerId')
    localStorage.removeItem('employeeId')
    localStorage.removeItem('employeeName')
    localStorage.removeItem('employeeEmail')
    router.push('/sign-in')
  }

  const handleRowClick = (submission: Submission) => {
    // Create employee detail for drawer
    const employee = submission.employee
    if (employee) {
      const initials = employee.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()

      // Normalize role from database
      const normalizeRole = (role: string | null | undefined): 'ADMIN' | 'MANAGER' | 'EMPLOYEE' => {
        if (!role) return 'EMPLOYEE'
        const upperRole = role.toUpperCase()
        if (upperRole === 'ADMIN' || upperRole === 'MANAGER' || upperRole === 'EMPLOYEE') {
          return upperRole as 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
        }
        return 'EMPLOYEE'
      }

      const employeeDetail: EmployeeDetail = {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        initials,
        contractorType: (employee.role === 'employee' ? 'Full-time' : 
                        employee.role === 'contractor' ? 'Contractor' : 
                        employee.role === 'manager' ? 'Full-time' : 'Freelancer') as EmployeeDetail['contractorType'],
        status: 'Active',
        hourlyRate: employee.hourly_rate || 50,
        // Add role for access control
        role: normalizeRole(employee.role),
        reportingManagerId: null,
        reportingManagerName: null,
      }
      setSelectedEmployee(employeeDetail)
      setIsDrawerOpen(true)
    }
    setShowActionMenu(null)
  }

  // Handle admin action selection
  const handleAdminAction = (submission: Submission, action: AdminAction) => {
    // Validate action is allowed based on status
    if (action === 'process_payment' && !adminCanProcessPayment(submission.status)) {
      Swal.fire({
        icon: 'error',
        title: 'Action Not Allowed',
        text: 'Payment can only be processed for manager-approved submissions.',
      })
      return
    }
    if (action === 'reject' && !adminCanReject(submission.status)) {
      Swal.fire({
        icon: 'error',
        title: 'Action Not Allowed',
        text: 'Only manager-approved submissions can be rejected.',
      })
      return
    }
    if (action === 'need_clarification' && !adminCanRequestClarification(submission.status)) {
      Swal.fire({
        icon: 'error',
        title: 'Action Not Allowed',
        text: 'Clarification can only be requested for manager-approved submissions.',
      })
      return
    }

    setSelectedActionRow(submission)
    setShowActionMenu(null)

    switch (action) {
      case 'process_payment':
        handleProcessPayment(submission)
        break
      case 'reject':
        setRejectOpen(true)
        break
      case 'need_clarification':
        setClarificationOpen(true)
        break
    }
  }

  const handleProcessPayment = async (submission: Submission) => {
    const result = await Swal.fire({
      title: 'Process Payment',
      text: `Process payment of $${((submission.hours_submitted + (submission.overtime_hours || 0)) * (submission.employee?.hourly_rate || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })} for ${submission.employee?.name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#22C55E',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Process Payment',
    })

    if (result.isConfirmed) {
      try {
        // Use the new process-payment endpoint
        const adminId = localStorage.getItem('employeeId') || 'admin'
        const response = await fetch(`/api/submissions/${submission.id}/process-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminId }),
        })

        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Payment Processed!',
            text: 'Submission has been marked as paid.',
            timer: 2000,
            showConfirmButton: false,
          })
          loadSubmissions()
        } else {
          const data = await response.json()
          throw new Error(data.error || 'Failed to process payment')
        }
      } catch (error: any) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to process payment.',
        })
      }
    }
  }

  const handleRejectSubmission = async (reason: string) => {
    if (!selectedActionRow) return

    try {
      const adminId = localStorage.getItem('employeeId') || 'admin'
      const response = await fetch(`/api/submissions/${selectedActionRow.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: adminId, rejectionReason: reason, isAdminAction: true }),
      })

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Submission Rejected',
          text: 'The employee has been notified.',
          timer: 2000,
          showConfirmButton: false,
        })
        loadSubmissions()
        setRejectOpen(false)
        setSelectedActionRow(null)
      } else {
        throw new Error('Failed to reject')
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to reject submission.',
      })
    }
  }

  const handleSendClarification = async (message: string) => {
    if (!selectedActionRow) return

    try {
      const adminId = localStorage.getItem('employeeId') || 'admin'
      const response = await fetch(`/api/submissions/${selectedActionRow.id}/request-clarification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, message }),
      })

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Clarification Requested',
          text: `Message sent to ${selectedActionRow.manager?.name || 'the manager'}. Status changed to "Needs Clarification".`,
          timer: 2000,
          showConfirmButton: false,
        })
        
        setClarificationOpen(false)
        setSelectedActionRow(null)
        loadSubmissions()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send clarification request')
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to send clarification request.',
      })
    }
  }

  // Generate month options for the last 12 months
  const getMonthOptions = () => {
    const months = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      months.push({ value, label })
    }
    return months
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        portal="admin"
        title="Admin Dashboard"
        subtitle="Monitor submissions, status, and contractor details."
        primaryActionLabel="Review All Employees"
        primaryActionIcon={<Users className="w-4 h-4" />}
        onPrimaryAction={() => {
          router.push('/admin/employees')
        }}
        onCalendarClick={() => setIsCalendarControlOpen(true)}
      />

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Active Filter Indicator */}
        {hasActiveFilters && (
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>
              <strong>Filtered view:</strong> {getActiveFilterSummary()} 
              <span className="text-slate-500 ml-1">({stats.totalSubmissions} results)</span>
            </span>
            <button
              onClick={resetFilters}
              className="ml-auto text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Overview Stats Cards - 4 Card Layout (Filtered) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {/* Card 1 - Total Submissions */}
          <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-5 flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">Total Submissions</p>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-semibold text-slate-900">{stats.totalSubmissions}</p>
              <p className="text-sm text-slate-500 mt-1">{stats.uniqueEmployees} employees</p>
            </div>
          </div>

          {/* Card 2 - Pending Reviews */}
          <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-5 flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">Pending Reviews</p>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-semibold text-slate-900">{stats.approved}</p>
              <p className="text-sm text-slate-500 mt-1">Awaiting payment</p>
            </div>
          </div>

          {/* Card 3 - Total Amount */}
          <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-5 flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">Total Amount</p>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-semibold text-slate-900">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalAmount)}
              </p>
              <p className="text-sm text-slate-500 mt-1">{stats.totalHours.toLocaleString()} hours</p>
            </div>
          </div>

          {/* Card 4 - Paid */}
          <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-5 flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">Paid</p>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-semibold text-slate-900">{stats.paid}</p>
              <p className="text-sm text-slate-500 mt-1">{stats.rejected} rejected</p>
            </div>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <FilterPanel>
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, type, project…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-800 placeholder-slate-400 transition-all duration-200"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap gap-3">
              {/* Role/Contractor Type */}
              <Combobox
                placeholder="Role Type"
                value={contractorTypeFilter}
                onChange={setContractorTypeFilter}
                options={[
                  { value: 'all', label: 'All Roles' },
                  { value: 'employee', label: 'Employee' },
                  { value: 'manager', label: 'Manager' },
                  { value: 'contractor', label: 'Contractor' },
                ]}
                className="min-w-[160px]"
                clearable={false}
              />

              {/* Status */}
              <Combobox
                placeholder="All Statuses"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'SUBMITTED', label: 'Submitted' },
                  { value: 'MANAGER_APPROVED', label: 'Manager Approved' },
                  { value: 'MANAGER_REJECTED', label: 'Manager Rejected' },
                  { value: 'NEEDS_CLARIFICATION', label: 'Needs Clarification' },
                  { value: 'ADMIN_PAID', label: 'Paid' },
                  { value: 'ADMIN_REJECTED', label: 'Admin Rejected' },
                ]}
                className="min-w-[160px]"
                clearable={false}
              />

              {/* Project */}
              <Combobox
                placeholder="Project"
                value={projectFilter}
                onChange={setProjectFilter}
                options={[
                  { value: 'all', label: 'All Projects' },
                  ...projects.map((project) => ({
                    value: project.id,
                    label: project.name,
                  })),
                ]}
                className="min-w-[160px]"
                clearable={false}
                emptyMessage="No projects found"
              />

              {/* Manager */}
              <Combobox
                placeholder="Manager"
                value={managerFilter}
                onChange={setManagerFilter}
                options={[
                  { value: 'all', label: 'All Managers' },
                  ...managers.map((manager) => ({
                    value: manager.id,
                    label: manager.name,
                  })),
                ]}
                className="min-w-[160px]"
                clearable={false}
                emptyMessage="No managers found"
              />

              {/* Month */}
              <Combobox
                placeholder="Month"
                value={monthFilter}
                onChange={setMonthFilter}
                options={[
                  { value: 'all', label: 'All Months' },
                  ...getMonthOptions().map((month) => ({
                    value: month.value,
                    label: month.label,
                  })),
                ]}
                className="min-w-[180px]"
                clearable={false}
              />

              {/* Reset Filters */}
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center space-x-2 px-4 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200 font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </div>
          </form>
        </FilterPanel>

        {/* Main Table Component */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
              <p className="mt-4 text-slate-500">Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">No submissions found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-[14px] font-semibold text-slate-700">
                      Month / Year
                    </th>
                    <th className="px-6 py-3 text-left text-[14px] font-semibold text-slate-700">
                      Employee Name
                    </th>
                    <th className="px-6 py-3 text-left text-[14px] font-semibold text-slate-700">
                      Contractor Type
                    </th>
                    <th className="px-6 py-3 text-left text-[14px] font-semibold text-slate-700">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-[14px] font-semibold text-slate-700">
                      Total Hours
                    </th>
                    <th className="px-6 py-3 text-left text-[14px] font-semibold text-slate-700">
                      Overtime Hours
                    </th>
                    <th className="px-6 py-3 text-right text-[14px] font-semibold text-slate-700">
                      Invoice Amount ($)
                    </th>
                    <th className="px-6 py-3 text-left text-[14px] font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-[14px] font-semibold text-slate-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((submission) => {
                    // Get status config
                    const status = statusConfig[submission.status] || statusConfig.SUBMITTED
                    
                    // Use role for the badge
                    const role = submission.employee?.role || 'employee'
                    const typeStyle = contractorTypeConfig[role] || contractorTypeConfig.employee

                    return (
                      <tr
                        key={submission.id}
                        onClick={() => handleRowClick(submission)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        {/* Month / Year */}
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900">
                            {submission.submission_date 
                              ? new Date(submission.submission_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </span>
                        </td>

                        {/* Employee Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                              {submission.employee?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'E'}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {submission.employee?.name || 'Unknown'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {submission.employee?.email || ''}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contractor Type */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
                            {typeStyle.label}
                          </span>
                        </td>

                        {/* Last Updated Date */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">
                            {submission.updated_at 
                              ? new Date(submission.updated_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: '2-digit',
                                })
                              : '—'}
                          </span>
                        </td>

                        {/* Total Hours */}
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900">
                            {submission.hours_submitted}h
                          </span>
                        </td>

                        {/* Overtime Hours */}
                        <td className="px-6 py-4">
                          <span className={`text-sm font-medium ${submission.overtime_hours ? 'text-slate-900' : 'text-slate-400'}`}>
                            {submission.overtime_hours ? `${submission.overtime_hours}h` : '—'}
                          </span>
                        </td>

                        {/* Invoice Amount ($) */}
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-emerald-600">
                            {(() => {
                              const totalHours = (submission.hours_submitted || 0) + (submission.overtime_hours || 0)
                              const hourlyRate = submission.employee?.hourly_rate || 0
                              const total = totalHours * hourlyRate
                              return total > 0 
                                ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : '—'
                            })()}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleMenuToggle(submission.id, e.currentTarget)}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                              aria-label="Open actions menu"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {showActionMenu === submission.id && menuPosition && typeof document !== 'undefined' && createPortal(
                              <>
                                <div
                                  className="fixed inset-0 z-[9998]"
                                  onClick={() => {
                                    setShowActionMenu(null)
                                    setMenuPosition(null)
                                  }}
                                />
                                <div 
                                  className="fixed w-52 bg-white rounded-xl border border-slate-200 shadow-xl z-[9999] py-1"
                                  style={{ top: menuPosition.top, left: menuPosition.left }}
                                >
                                {/* Process Payment - only for MANAGER_APPROVED */}
                                {adminCanProcessPayment(submission.status) && (
                                  <button
                                    onClick={() => {
                                      setShowActionMenu(null)
                                      setMenuPosition(null)
                                      handleAdminAction(submission, 'process_payment')
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-emerald-50 flex items-center gap-3 border-b border-slate-100"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                      <CreditCard className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <span className="font-medium">Process Payment</span>
                                  </button>
                                )}

                                {/* Reject - only for MANAGER_APPROVED */}
                                {adminCanReject(submission.status) && (
                                  <button
                                    onClick={() => {
                                      setShowActionMenu(null)
                                      setMenuPosition(null)
                                      handleAdminAction(submission, 'reject')
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-red-50 flex items-center gap-3 border-b border-slate-100"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                      <Ban className="w-4 h-4 text-red-600" />
                                    </div>
                                    <span className="font-medium">Reject</span>
                                  </button>
                                )}

                                {/* Need Clarification - only for MANAGER_APPROVED */}
                                {adminCanRequestClarification(submission.status) && (
                                  <button
                                    onClick={() => {
                                      setShowActionMenu(null)
                                      setMenuPosition(null)
                                      handleAdminAction(submission, 'need_clarification')
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-amber-50 flex items-center gap-3 border-b border-slate-100"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                      <MessageCircle className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <span className="font-medium">Need Clarification</span>
                                  </button>
                                )}

                                {/* View Details - always available */}
                                <button
                                  onClick={() => {
                                    setShowActionMenu(null)
                                    setMenuPosition(null)
                                    handleRowClick(submission)
                                  }}
                                  className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                    <User className="w-4 h-4 text-slate-600" />
                                  </div>
                                  <span className="font-medium">View Details</span>
                                </button>
                              </div>
                              </>,
                              document.body
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Employee Detail Panel (Slide-in) */}
      {showDetailPanel && selectedSubmission && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowDetailPanel(false)} />
          
          <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl transform transition-transform duration-300">
            <div className="h-full flex flex-col">
              {/* Panel Header */}
              <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-violet-600 to-indigo-600">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Employee Details</h2>
                  <button
                    onClick={() => setShowDetailPanel(false)}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Employee Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                    {selectedSubmission.employee?.name?.charAt(0)?.toUpperCase() || 'E'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {selectedSubmission.employee?.name}
                    </h3>
                    <p className="text-slate-500">{selectedSubmission.employee?.email}</p>
                  </div>
                </div>

                {/* Submission Details */}
                <div className="bg-slate-50 rounded-xl p-5 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    Submission Details
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Submission Date</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatDate(selectedSubmission.submission_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Status</p>
                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${statusConfig[selectedSubmission.status].bg} ${statusConfig[selectedSubmission.status].text}`}>
                        {statusConfig[selectedSubmission.status].label}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Hours Submitted</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedSubmission.hours_submitted} hours
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Overtime Hours</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedSubmission.overtime_hours || 0} hours
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Hourly Rate</p>
                      <p className="text-sm font-medium text-slate-900">
                        ${selectedSubmission.employee?.hourly_rate?.toFixed(2) || '0.00'}/hr
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Total Amount</p>
                      <p className="text-sm font-bold text-green-600">
                        ${((selectedSubmission.hours_submitted + (selectedSubmission.overtime_hours || 0)) * (selectedSubmission.employee?.hourly_rate || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-slate-50 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                    Work Description
                  </h4>
                  <p className="text-sm text-slate-600">
                    {selectedSubmission.description || 'No description provided.'}
                  </p>
                  
                  {selectedSubmission.overtime_description && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">Overtime Description</p>
                      <p className="text-sm text-slate-600">
                        {selectedSubmission.overtime_description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Manager Comment */}
                {(selectedSubmission.status === 'MANAGER_REJECTED' || selectedSubmission.status === 'MANAGER_APPROVED') && selectedSubmission.manager_comment && (
                  <div className={`rounded-xl p-5 border ${selectedSubmission.status === 'MANAGER_REJECTED' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                    <h4 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${selectedSubmission.status === 'MANAGER_REJECTED' ? 'text-red-700' : 'text-blue-700'}`}>
                      Manager Comment
                    </h4>
                    <p className={`text-sm ${selectedSubmission.status === 'MANAGER_REJECTED' ? 'text-red-600' : 'text-blue-600'}`}>
                      {selectedSubmission.manager_comment}
                    </p>
                  </div>
                )}

                {/* Admin Comment */}
                {(selectedSubmission.status === 'ADMIN_REJECTED' || selectedSubmission.status === 'NEEDS_CLARIFICATION' || selectedSubmission.status === 'ADMIN_PAID') && selectedSubmission.admin_comment && (
                  <div className={`rounded-xl p-5 border ${selectedSubmission.status === 'ADMIN_REJECTED' ? 'bg-red-50 border-red-200' : selectedSubmission.status === 'NEEDS_CLARIFICATION' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                    <h4 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${selectedSubmission.status === 'ADMIN_REJECTED' ? 'text-red-700' : selectedSubmission.status === 'NEEDS_CLARIFICATION' ? 'text-amber-700' : 'text-green-700'}`}>
                      {selectedSubmission.status === 'ADMIN_REJECTED' ? 'Rejection Reason' : selectedSubmission.status === 'NEEDS_CLARIFICATION' ? 'Clarification Request' : 'Payment Reference'}
                    </h4>
                    <p className={`text-sm ${selectedSubmission.status === 'ADMIN_REJECTED' ? 'text-red-600' : selectedSubmission.status === 'NEEDS_CLARIFICATION' ? 'text-amber-600' : 'text-green-600'}`}>
                      {selectedSubmission.admin_comment}
                    </p>
                  </div>
                )}

                {/* Manager Info */}
                {selectedSubmission.manager && (
                  <div className="bg-slate-50 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                      Assigned Manager
                    </h4>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {selectedSubmission.manager.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {selectedSubmission.manager.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Footer - only show actions for MANAGER_APPROVED status */}
              {adminCanProcessPayment(selectedSubmission.status) && (
                <div className="px-6 py-4 border-t border-slate-200 flex space-x-3">
                  <button
                    onClick={() => handleAdminAction(selectedSubmission, 'process_payment')}
                    className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Process Payment</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedActionRow(selectedSubmission)
                      setRejectOpen(true)
                    }}
                    className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Ban className="w-5 h-5" />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Drawer */}
      <EmployeeDetailDrawer
        employee={selectedEmployee}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false)
          setSelectedEmployee(null)
        }}
        onManagerUpdate={(employeeId, managerId, managerName) => {
          // Update local submissions data when manager changes
          // Refresh submissions to reflect new manager assignments
          loadSubmissions()
        }}
      />

      {/* Request Clarification Dialog */}
      <RequestClarificationDialog
        open={clarificationOpen}
        onClose={() => {
          setClarificationOpen(false)
          setSelectedActionRow(null)
        }}
        onSend={handleSendClarification}
        employee={selectedActionRow ? {
          name: selectedActionRow.employee?.name || 'Unknown',
          email: selectedActionRow.employee?.email || '',
          regularHours: selectedActionRow.hours_submitted || 0,
          overtimeHours: selectedActionRow.overtime_hours || 0,
        } : null}
        managerName={selectedActionRow?.manager?.name || 'Manager'}
      />

      {/* Reject Submission Dialog */}
      <RejectSubmissionDialog
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false)
          setSelectedActionRow(null)
        }}
        onReject={handleRejectSubmission}
        employee={selectedActionRow ? {
          name: selectedActionRow.employee?.name || 'Unknown',
          email: selectedActionRow.employee?.email || '',
          regularHours: selectedActionRow.hours_submitted || 0,
          overtimeHours: selectedActionRow.overtime_hours || 0,
        } : null}
        submissionLabel={selectedActionRow ? formatDate(selectedActionRow.submission_date) + ' submission' : undefined}
      />

      {/* Calendar Controls Drawer */}
      <AdminCalendarControl
        isOpen={isCalendarControlOpen}
        onClose={() => setIsCalendarControlOpen(false)}
        onSave={() => {
          // Reload data if needed after holidays are set
          loadSubmissions()
        }}
      />
    </div>
  )
}
