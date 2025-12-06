'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react'
import { EmployeeDetailDrawer, EmployeeDetail } from '@/components/admin/employee-drawer'

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
}

interface Manager {
  id: string
  name: string
  email: string
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
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  
  // Detail Drawer
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [contractTypeFilter, setContractTypeFilter] = useState('all')
  const [managerFilter, setManagerFilter] = useState('all')
  const [rateTypeFilter, setRateTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    // Check if user is authenticated and is an admin
    const userRole = localStorage.getItem('userRole')
    if (!userRole || userRole !== 'admin') {
      router.push('/login')
      return
    }
    loadInitialData()
  }, [router])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      await Promise.all([loadEmployees(), loadManagers()])
    } finally {
      setLoading(false)
    }
  }

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees/directory')
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || [])
        setFilteredEmployees(data.employees || [])
      } else {
        console.error('Failed to fetch employees')
        setEmployees([])
        setFilteredEmployees([])
      }
    } catch (error) {
      console.error('Error loading employees:', error)
      setEmployees([])
      setFilteredEmployees([])
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

  // Apply filters
  useEffect(() => {
    let result = [...employees]

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

    setFilteredEmployees(result)
    setCurrentPage(1) // Reset to first page when filters change
  }, [employees, searchQuery, contractTypeFilter, managerFilter, rateTypeFilter, statusFilter])

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

    const employeeDetail: EmployeeDetail = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      initials,
      contractorType: employee.rate_type === 'fixed' ? 'Full-time' : 'Contractor',
      status: employee.status === 'active' ? 'Active' : 'Inactive',
      hourlyRate: employee.hourly_rate || employee.monthly_rate || 0,
      overtimeRate: employee.overtime_rate || undefined,
    }
    setSelectedEmployee(employeeDetail)
    setIsDrawerOpen(true)
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

          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Employee Directory</h1>
          <p className="text-slate-500">View and manage all employee and contractor profiles.</p>
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
              <div className="relative min-w-[180px]">
                <select
                  value={contractTypeFilter}
                  onChange={(e) => setContractTypeFilter(e.target.value)}
                  className="w-full appearance-none px-4 py-3 pr-10 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                >
                  <option value="all">Contract Type</option>
                  <option value="Internal Project">Internal Project</option>
                  <option value="Client Facing Project">Client Facing Project</option>
                  <option value="Operational">Operational</option>
                  <option value="Intern">Intern</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Reporting Manager */}
              <div className="relative min-w-[180px]">
                <select
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                  className="w-full appearance-none px-4 py-3 pr-10 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                >
                  <option value="all">Reporting Manager</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Rate Type */}
              <div className="relative min-w-[150px]">
                <select
                  value={rateTypeFilter}
                  onChange={(e) => setRateTypeFilter(e.target.value)}
                  className="w-full appearance-none px-4 py-3 pr-10 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                >
                  <option value="all">Rate Type</option>
                  <option value="hourly">Hourly</option>
                  <option value="fixed">Fixed</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Employee Status */}
              <div className="relative min-w-[160px]">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none px-4 py-3 pr-10 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                >
                  <option value="all">Employee Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

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
                        <div>
                          <span className="text-sm font-medium text-slate-900">
                            {employee.rate_type === 'hourly'
                              ? `$${employee.hourly_rate || 0}/hr`
                              : `$${(employee.monthly_rate || 0).toLocaleString()}/mo`}
                          </span>
                          <p className="text-xs text-slate-400">
                            {employee.rate_type === 'hourly' ? 'Hourly' : 'Fixed'}
                          </p>
                        </div>
                      </td>

                      {/* Overtime Rate */}
                      <td className="px-6 py-4">
                        <span className={`text-sm ${employee.rate_type === 'hourly' && employee.overtime_rate ? 'text-slate-900' : 'text-slate-400'}`}>
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
        onManagerUpdate={(employeeId, managerId, managerName) => {
          // Update the Employee Directory table immediately when manager changes
          setEmployees((prev) =>
            prev.map((emp) =>
              emp.id === employeeId
                ? {
                    ...emp,
                    reporting_manager_id: managerId,
                    reporting_manager_name: managerName,
                  }
                : emp
            )
          )
        }}
      />
    </div>
  )
}
