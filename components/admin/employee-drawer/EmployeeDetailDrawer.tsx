'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, CheckCircle } from 'lucide-react'
import { EmployeeSubmissionsTab } from './EmployeeSubmissionsTab'
import { EmployeeInvoicesTab } from './EmployeeInvoicesTab'
import { EmployeeContractInfoTab } from './EmployeeContractInfoTab'
import { EmployeeAccessControlTab } from './EmployeeAccessControlTab'
import { EmployeeStatusLogTab } from './EmployeeStatusLogTab'
import {
  EmployeeDetail,
  Submission,
  Invoice,
  ContractInfo,
  StatusLogEntry,
  UserRole,
} from './types'

interface EmployeeDetailDrawerProps {
  employee: EmployeeDetail | null
  isOpen: boolean
  onClose: () => void
  onManagerUpdate?: (employeeId: string, managerId: string | null, managerName: string | null) => void
}

type TabValue = 'submissions' | 'invoices' | 'contract' | 'access-control' | 'status-log'

interface ToastState {
  show: boolean
  title: string
  variant: 'success' | 'error'
}

export function EmployeeDetailDrawer({
  employee,
  isOpen,
  onClose,
  onManagerUpdate,
}: EmployeeDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('status-log')
  const [loading, setLoading] = useState(false)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null)
  const [statusLog, setStatusLog] = useState<StatusLogEntry[]>([])
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([])
  
  // ✅ Track full employee data from API (for Access Control tab)
  const [employeeData, setEmployeeData] = useState<any>(null)
  
  // Toast state
  const [toast, setToast] = useState<ToastState>({ show: false, title: '', variant: 'success' })

  // Handle ESC key to close drawer
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    },
    [isOpen, onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Load real data when employee changes
  useEffect(() => {
    if (employee && isOpen) {
      loadEmployeeData(employee.id)
      loadManagers()
    }
  }, [employee, isOpen])

  const loadEmployeeData = async (employeeId: string) => {
    try {
      setLoading(true)
      
      // 🔍 Log what we're fetching
      console.log('[Drawer] Loading employee data for:', employeeId)
      
      const response = await fetch(`/api/admin/employees/${employeeId}`)
      
      if (response.ok) {
        const data = await response.json()
        
        console.log('[Drawer] Successfully loaded employee data')
        
        // ✅ Store full employee data (for Access Control tab)
        if (data.employee) {
          setEmployeeData(data.employee)
        }
        
        // Set submissions
        if (data.submissions) {
          setSubmissions(data.submissions)
        }
        
        // Set invoices
        if (data.invoices) {
          setInvoices(data.invoices)
        }
        
        // Set contract info
        if (data.contractInfo) {
          setContractInfo(data.contractInfo)
        }
        
        // Set status log
        if (data.statusLog) {
          setStatusLog(data.statusLog)
        }
      } else {
        // 🚨 DETAILED ERROR LOGGING
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ [Drawer] Failed to load employee data:', {
          status: response.status,
          statusText: response.statusText,
          employeeId,
          error: errorData.error,
          details: errorData.details,
          hint: errorData.hint,
          code: errorData.code,
          url: `/api/admin/employees/${employeeId}`
        })
        
        // Clear data on error
        setEmployeeData(null)
        setSubmissions([])
        setInvoices([])
        setContractInfo(null)
        setStatusLog([])
      }
    } catch (error: any) {
      // 🚨 DETAILED ERROR LOGGING
      console.error('❌ [Drawer] Exception loading employee data:', {
        employeeId,
        error: error?.message || String(error),
        stack: error?.stack,
        name: error?.name
      })
      setEmployeeData(null)
      setSubmissions([])
      setInvoices([])
      setContractInfo(null)
      setStatusLog([])
    } finally {
      setLoading(false)
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

  // Handle contract info update
  const handleUpdateContractInfo = (updatedInfo: ContractInfo) => {
    setContractInfo(updatedInfo)
    // TODO: Persist to backend API
    console.log('Contract info updated:', updatedInfo)
  }

  // Show toast notification
  const showToast = (options: { title: string; variant: 'success' | 'error' }) => {
    setToast({ show: true, ...options })
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }))
    }, 4000)
  }

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!employee) return null

  // Tabs ordered as per design: Submissions, Invoices, Contract Info, Access Control, Status Log
  const tabs = [
    { value: 'submissions' as TabValue, label: 'Submissions' },
    { value: 'invoices' as TabValue, label: 'Invoices' },
    { value: 'contract' as TabValue, label: 'Contract\nInfo' },
    { value: 'access-control' as TabValue, label: 'Access\nControl' },
    { value: 'status-log' as TabValue, label: 'Status\nLog' },
  ]

  const contractorTypeConfig: Record<string, { bg: string; text: string }> = {
    'Full-time': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    'Part-time': { bg: 'bg-amber-50', text: 'text-amber-700' },
    Contractor: { bg: 'bg-sky-50', text: 'text-sky-700' },
    Freelancer: { bg: 'bg-violet-50', text: 'text-violet-700' },
    Employee: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    employee: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  }

  const statusStyle =
    employee.status === 'Active'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-slate-100 text-slate-600 border-slate-200'

  const typeStyle = contractorTypeConfig[employee.contractorType] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-screen w-full max-w-[640px] bg-white shadow-2xl rounded-l-3xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-xl font-semibold text-slate-700 shrink-0">
              {employee.initials}
            </div>

            {/* Text info */}
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-slate-900">{employee.name}</h2>
              <p className="text-sm text-slate-500">{employee.email}</p>

              {/* Status pills */}
              <div className="flex flex-wrap gap-2 mt-1">
                <span
                  className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${typeStyle.bg} ${typeStyle.text}`}
                >
                  {employee.contractorType}
                </span>
                <span
                  className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${statusStyle}`}
                >
                  {employee.status}
                </span>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="inline-flex rounded-full bg-slate-100 p-1 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition-all duration-200 ${
                  activeTab === tab.value
                    ? 'bg-white text-slate-900 font-medium shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-8 pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'submissions' && (
                <EmployeeSubmissionsTab submissions={submissions} />
              )}
              {activeTab === 'invoices' && <EmployeeInvoicesTab invoices={invoices} />}
              {activeTab === 'contract' && contractInfo && employee && (
                <EmployeeContractInfoTab
                  contractInfo={contractInfo}
                  employeeId={employee.id}
                  onUpdateContractInfo={handleUpdateContractInfo}
                  managers={managers}
                  onToast={showToast}
                />
              )}
              {activeTab === 'access-control' && employee && employeeData && (
                <EmployeeAccessControlTab
                  employeeId={employee.id}
                  currentRole={(employeeData.role?.toUpperCase() || 'EMPLOYEE') as UserRole}
                  currentManagerId={employeeData.reporting_manager_id || null}
                  currentManagerName={(employeeData as any).reporting_manager?.name || null}
                  managers={managers}
                  onToast={showToast}
                  onRoleUpdate={(role, managerId, managerName) => {
                    // ✅ Refresh drawer data to sync both tabs
                    loadEmployeeData(employee.id)
                    // Notify parent component (Employee Directory) about manager change
                    onManagerUpdate?.(employee.id, managerId, managerName)
                  }}
                />
              )}
              {activeTab === 'status-log' && <EmployeeStatusLogTab entries={statusLog} />}
            </>
          )}
        </div>

        {/* Toast Notification */}
        {toast.show && (
          <div className="fixed top-4 right-4 z-[100] animate-slide-in">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
              toast.variant === 'success' 
                ? 'bg-emerald-50 border-emerald-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <CheckCircle className={`w-5 h-5 ${
                toast.variant === 'success' ? 'text-emerald-500' : 'text-red-500'
              }`} />
              <span className={`text-sm font-medium ${
                toast.variant === 'success' ? 'text-emerald-900' : 'text-red-900'
              }`}>
                {toast.title}
              </span>
              <button
                onClick={() => setToast(prev => ({ ...prev, show: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
