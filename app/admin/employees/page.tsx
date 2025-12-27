'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  RefreshCw,
} from 'lucide-react'
import { EmployeeDetailDrawer, EmployeeDetail } from '@/components/admin/employee-drawer'
import { Combobox } from '@/components/ui/combobox'
import { useEmployees, useManagers, useUpdateEmployee } from '@/hooks'

// Types
interface Employee {
  id: string
  name: string
  email: string
  contract_start_date: string | null
  contract_end_date: string | null
  rate_type: 'hourly' | 'fixed'
  hourly_rate: number | null
  monthly_rate: number | null
  overtime_rate: number | null
  position: string | null
  contract_type: string | null
  reporting_manager_id: string | null
  reporting_manager_name: string | null
  status: string
  role: string
  admin_approval_status: string | null
  personal_info_completed_at: string | null
  banking_info_completed_at: string | null
  onboarding_submitted_at: string | null
  onboarding_status: string | null
}

// Contract Type Badge Configuration
const contractTypeBadgeConfig: Record<string, { light: string; dark: string }> = {
  'Internal Project': { light: '#DBEAFE', dark: '#1E40AF' },
  'Client Facing Project': { light: '#F3E8FF', dark: '#7C3AED' },
  'Operational': { light: '#D1FAE5', dark: '#059669' },
  'Intern': { light: '#FED7AA', dark: '#C2410C' },
}

export default function EmployeeDirectory() {
  const router = useRouter()
  
  // Use TanStack Query hooks for data fetching with auto-refresh
  const { 
    data: employeesData, 
    isLoading: loadingEmployees, 
    refetch: refetchEmployees,
    isRefetching 
  } = useEmployees()
  
  const { data: managersData, isLoading: loadingManagers } = useManagers()
  
  // Update mutation
  const updateEmployee = useUpdateEmployee()
  
  // Transform data for the component
  const employees: Employee[] = useMemo(() => {
    if (!employeesData) return []
    return employeesData.map((emp: any) => ({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      contract_start_date: emp.contract_start_date || emp.created_at || null,
      contract_end_date: emp.contract_end_date || null,
      rate_type: emp.rate_type || (emp.hourly_rate ? 'hourly' : 'fixed'),
      hourly_rate: emp.hourly_rate || null,
      monthly_rate: emp.monthly_rate || (emp.hourly_rate ? emp.hourly_rate * 160 : null),
      overtime_rate: emp.overtime_rate || (emp.hourly_rate ? Math.round(emp.hourly_rate * 1.5) : null),
      position: emp.position || emp.active_project || null,
      contract_type: emp.contract_type || null,
      reporting_manager_id: emp.reporting_manager_id || null,
      reporting_manager_name: null, // Will be looked up
      status: emp.status?.toLowerCase() || 'active',
      role: emp.role || 'employee',
      admin_approval_status: emp.admin_approval_status || null,
      personal_info_completed_at: emp.personal_info_completed_at || null,
      banking_info_completed_at: emp.banking_info_completed_at || null,
      onboarding_submitted_at: emp.onboarding_submitted_at || null,
      onboarding_status: emp.onboarding_status || null,
    }))
  }, [employeesData])
  
  const managers = useMemo(() => {
    if (!managersData) return []
    return managersData.map((m: any) => ({
      id: m.id,
      name: m.name,
      email: m.email,
    }))
  }, [managersData])
  
  // Add manager names to employees
  const employeesWithManagers = useMemo(() => {
    const managerMap = new Map(managers.map(m => [m.id, m.name]))
    return employees.map(emp => ({
      ...emp,
      reporting_manager_name: emp.reporting_manager_id 
        ? managerMap.get(emp.reporting_manager_id) || null 
        : null
    }))
  }, [employees, managers])
  
  // Detail Drawer
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  // Onboarding approval state
  const [approvingEmployeeId, setApprovingEmployeeId] = useState<string | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [contractTypeFilter, setContractTypeFilter] = useState('all')
  const [managerFilter, setManagerFilter] = useState('all')
  const [rateTypeFilter, setRateTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Combine loading states
  const loading = loadingEmployees || loadingManagers

  // Apply filters using useMemo for performance
  const filteredEmployees = useMemo(() => {
    let result = [...employeesWithManagers]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (emp) =>
          emp.name.toLowerCase().includes(query) ||
          emp.email.toLowerCase().includes(query) ||
          (emp.position && emp.position.toLowerCase().includes(query))
      )
    }

    // Contract type filter
    if (contractTypeFilter !== 'all') {
      result = result.filter((emp) => emp.contract_type === contractTypeFilter)
    }

    // Manager filter
    if (managerFilter !== 'all') {
      result = result.filter((emp) => emp.reporting_manager_id === managerFilter)
    }

    // Rate type filter
    if (rateTypeFilter !== 'all') {
      result = result.filter((emp) => emp.rate_type === rateTypeFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((emp) => 
        statusFilter === 'active' ? emp.status === 'active' : emp.status !== 'active'
      )
    }

    return result
  }, [employeesWithManagers, searchQuery, contractTypeFilter, managerFilter, rateTypeFilter, statusFilter])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, contractTypeFilter, managerFilter, rateTypeFilter, statusFilter])

  const resetFilters = () => {
    setSearchQuery('')
    setContractTypeFilter('all')
    setManagerFilter('all')
    setRateTypeFilter('all')
    setStatusFilter('all')
  }

  const handleRowClick = (employee: Employee) => {
    const initials = employee.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()

    // Normalize role from database (lowercase) to app format (uppercase)
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
      contractorType: employee.rate_type === 'fixed' ? 'Full-time' : 'Contractor',
      status: employee.status === 'active' ? 'Active' : 'Inactive',
      hourlyRate: employee.hourly_rate || employee.monthly_rate || 0,
      overtimeRate: employee.overtime_rate || undefined,
      // Add role and reporting manager fields
      role: normalizeRole(employee.role),
      reportingManagerId: employee.reporting_manager_id,
      reportingManagerName: employee.reporting_manager_name,
    }
    setSelectedEmployee(employeeDetail)
    setIsDrawerOpen(true)
  }

  const handleApproveOnboarding = async (employeeId: string, employeeName: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent row click
    
    const adminId = localStorage.getItem('employeeId')
    if (!adminId) {
      alert('Admin ID not found. Please log in again.')
      return
    }

    setApprovingEmployeeId(employeeId)

    try {
      const response = await fetch(`/api/admin/employees/${employeeId}/approve-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve onboarding')
      }

      // Success toast
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in-right'
      toast.textContent = `✓ ${employeeName}'s onboarding approved`
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)

      // Refresh employee list
      await refetchEmployees()
    } catch (error) {
      console.error('Error approving onboarding:', error)
      
      // Error toast
      const toast = document.createElement('div')
      toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in-right'
      toast.textContent = `✗ ${error instanceof Error ? error.message : 'Failed to approve onboarding'}`
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 4000)
    } finally {
      setApprovingEmployeeId(null)
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Contract Type Badge - Read-only visual badge
  const getContractTypeBadge = (contractType: string | null) => {
    if (!contractType) {
      return <span className="text-sm text-slate-400">—</span>
    }
    
    const config = contractTypeBadgeConfig[contractType] || {
      light: '#E2E8F0',
      dark: '#475569',
    }
    return (
      <span
        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium h-7"
        style={{ backgroundColor: config.light, color: config.dark }}
      >
        {contractType}
      </span>
    )
  }

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          {/* Back Button */}
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Overview</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 mb-2">Employee Directory</h1>
              <p className="text-slate-500">View and manage all employee and contractor profiles.</p>
            </div>
            <button
              onClick={() => refetchEmployees()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
              {isRefetching ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-slate-800 placeholder-slate-400 transition-all duration-200"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Contract Type */}
              <Combobox
                placeholder="Contract Type"
                value={contractTypeFilter}
                onChange={setContractTypeFilter}
                options={[
                  { value: 'all', label: 'All Contract Types' },
                  { value: 'Internal Project', label: 'Internal Project' },
                  { value: 'Client Facing Project', label: 'Client Facing Project' },
                  { value: 'Operational', label: 'Operational' },
                  { value: 'Intern', label: 'Intern' },
                ]}
                className="min-w-[180px]"
                clearable={false}
              />

              {/* Reporting Manager */}
              <Combobox
                placeholder="Reporting Manager"
                value={managerFilter}
                onChange={setManagerFilter}
                options={[
                  { value: 'all', label: 'All Managers' },
                  ...managers.map((manager) => ({
                    value: manager.id,
                    label: manager.name,
                    sublabel: manager.email,
                  })),
                ]}
                className="min-w-[180px]"
                clearable={false}
                emptyMessage="No managers found"
              />

              {/* Rate Type */}
              <Combobox
                placeholder="Rate Type"
                value={rateTypeFilter}
                onChange={setRateTypeFilter}
                options={[
                  { value: 'all', label: 'All Rate Types' },
                  { value: 'hourly', label: 'Hourly' },
                  { value: 'fixed', label: 'Fixed' },
                ]}
                className="min-w-[150px]"
                clearable={false}
              />

              {/* Employee Status */}
              <Combobox
                placeholder="Employee Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                className="min-w-[160px]"
                clearable={false}
              />

              {/* Reset Filters */}
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-4 py-3 text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all duration-200 font-medium"
              >
                <X className="w-4 h-4" />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Employee Table - Read Only */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
              <p className="mt-4 text-slate-500">Loading employees...</p>
            </div>
          ) : paginatedEmployees.length === 0 ? (
            // Empty State
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No employees found</h3>
              <p className="text-slate-500">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Contract Start Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      End Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Rate Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Rate
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Fixed Income
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Overtime Rate
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Position
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Contract Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Reporting Manager
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      onClick={() => handleRowClick(employee)}
                      className="hover:bg-[#F9FAFB] cursor-pointer transition-all duration-200"
                    >
                      {/* Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium text-slate-700 shrink-0">
                            {getInitials(employee.name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{employee.name}</p>
                            <p className="text-xs text-slate-500">{employee.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contract Start Date */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-900">
                          {formatDate(employee.contract_start_date) || '—'}
                        </span>
                      </td>

                      {/* End Date */}
                      <td className="px-6 py-4">
                        <span className={`text-sm ${employee.contract_end_date ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                          {formatDate(employee.contract_end_date) || 'Ongoing'}
                        </span>
                      </td>

                      {/* Rate Type - Static Text */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-900">
                          {employee.rate_type ? (employee.rate_type === 'hourly' ? 'Hourly' : 'Fixed') : '—'}
                        </span>
                      </td>

                      {/* Rate */}
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${employee.rate_type === 'hourly' ? 'text-slate-900' : 'text-slate-400'}`}>
                          {employee.rate_type === 'hourly'
                            ? `$${employee.hourly_rate || 0}/hr`
                            : '—'}
                        </span>
                      </td>

                      {/* Fixed Income */}
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${employee.rate_type === 'fixed' ? 'text-slate-900' : 'text-slate-400'}`}>
                          {employee.rate_type === 'fixed'
                            ? `$${(employee.monthly_rate || 0).toLocaleString()}/mo`
                            : '—'}
                        </span>
                      </td>

                      {/* Overtime Rate */}
                      <td className="px-6 py-4">
                        <span className={`text-sm ${employee.rate_type === 'hourly' && employee.overtime_rate ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                          {employee.rate_type === 'hourly' && employee.overtime_rate
                            ? `$${employee.overtime_rate}/hr`
                            : '—'}
                        </span>
                      </td>

                      {/* Position */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-900">{employee.position || '—'}</span>
                      </td>

                      {/* Contract Type Badge - Read Only */}
                      <td className="px-6 py-4">
                        {getContractTypeBadge(employee.contract_type)}
                      </td>

                      {/* Manager - Static Text */}
                      <td className="px-6 py-4">
                        <span className={`text-sm ${employee.reporting_manager_name ? 'text-slate-900' : 'text-slate-400'}`}>
                          {employee.reporting_manager_name || '—'}
                        </span>
                      </td>

                      {/* Actions - Onboarding Approval */}
                      <td className="px-6 py-4">
                        {employee.admin_approval_status === 'WAITING' && (
                          <button
                            onClick={(e) => handleApproveOnboarding(employee.id, employee.name, e)}
                            disabled={approvingEmployeeId === employee.id}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {approvingEmployeeId === employee.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Approving...
                              </>
                            ) : (
                              'Approve'
                            )}
                          </button>
                        )}
                        {employee.admin_approval_status === 'APPROVED' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Approved
                          </span>
                        )}
                        {employee.admin_approval_status === 'REJECTED' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Rejected
                          </span>
                        )}
                        {employee.admin_approval_status === 'NOT_SUBMITTED' && (
                          <span className="text-sm text-slate-400">Not submitted</span>
                        )}
                        {!employee.admin_approval_status && (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredEmployees.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Showing {startIndex + 1}–{Math.min(endIndex, filteredEmployees.length)} of{' '}
                {filteredEmployees.length} employees
              </p>

              <div className="flex items-center gap-1">
                {/* Previous */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                {/* Page Numbers */}
                {getPageNumbers().map((page, index) =>
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-slate-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`w-9 h-9 flex items-center justify-center text-sm rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-[#7B2FF7] text-white font-medium'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Employee Detail Drawer */}
      <EmployeeDetailDrawer
        employee={selectedEmployee}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false)
          setSelectedEmployee(null)
        }}
        onManagerUpdate={async (employeeId, managerId, managerName) => {
          // With TanStack Query, the list will auto-refresh via realtime subscription
          // or we can manually trigger a refetch
          await refetchEmployees()
        }}
      />
    </div>
  )
}
