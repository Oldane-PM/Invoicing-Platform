'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, FileText, Users, Loader2 } from 'lucide-react'
import {
  getOnboardingStatus,
  adminApproveOnboarding,
  adminRejectOnboarding,
  adminCompleteContract,
  adminAssignManager,
} from '@/lib/data/onboarding'
import { OnboardingProgress } from '@/components/employee/OnboardingProgress'
import type { OnboardingData } from '@/lib/data/onboarding'
import { getEmployeeById } from '@/lib/supabase/queries/employees'
import Swal from 'sweetalert2'

export default function AdminOnboardingDetail({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [employee, setEmployee] = useState<OnboardingData | null>(null)
  const [employeeDetails, setEmployeeDetails] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [adminId, setAdminId] = useState('')
  
  // Action states
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [isCompletingContract, setIsCompletingContract] = useState(false)
  const [isAssigningManager, setIsAssigningManager] = useState(false)
  
  // Form states
  const [rejectionReason, setRejectionReason] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [managers, setManagers] = useState<any[]>([])

  useEffect(() => {
    const storedAdminId = localStorage.getItem('employeeId')
    const userRole = localStorage.getItem('userRole')

    if (!storedAdminId || userRole?.toUpperCase() !== 'ADMIN') {
      router.push('/sign-in')
      return
    }

    setAdminId(storedAdminId)
    loadEmployee()
    loadManagers()
  }, [params.id, router])

  const loadEmployee = async () => {
    try {
      const [status, details] = await Promise.all([
        getOnboardingStatus(params.id),
        getEmployeeById(params.id),
      ])
      
      setEmployee(status)
      setEmployeeDetails(details)
    } catch (error) {
      console.error('Error loading employee:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load employee information',
      })
    } finally {
      setIsLoading(false)
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

  const handleApprove = async () => {
    if (!employee || employee.adminApprovalStatus !== 'WAITING') {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Approve',
        text: 'Employee must be in waiting status to approve',
      })
      return
    }

    const result = await Swal.fire({
      title: 'Approve Onboarding?',
      text: 'This will approve the employee\'s personal and banking information.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Approve',
      cancelButtonText: 'Cancel',
    })

    if (!result.isConfirmed) return

    setIsApproving(true)
    try {
      const response = await adminApproveOnboarding(params.id, adminId)
      if (response.success) {
        Swal.fire({
          icon: 'success',
          title: 'Approved!',
          text: 'Employee onboarding has been approved',
          timer: 2000,
        })
        await loadEmployee()
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.error || 'Failed to approve onboarding',
        })
      }
    } catch (error) {
      console.error('Error approving:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An unexpected error occurred',
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    const { value: reason } = await Swal.fire({
      title: 'Reject Onboarding',
      text: 'Please provide a reason for rejection:',
      input: 'textarea',
      inputPlaceholder: 'Enter rejection reason...',
      inputAttributes: {
        'aria-label': 'Rejection reason',
      },
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Reject',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'You must provide a rejection reason'
        }
      },
    })

    if (!reason) return

    setIsRejecting(true)
    try {
      const response = await adminRejectOnboarding(params.id, reason)
      if (response.success) {
        Swal.fire({
          icon: 'success',
          title: 'Rejected',
          text: 'Employee has been notified of the rejection',
          timer: 2000,
        })
        await loadEmployee()
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.error || 'Failed to reject onboarding',
        })
      }
    } catch (error) {
      console.error('Error rejecting:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An unexpected error occurred',
      })
    } finally {
      setIsRejecting(false)
    }
  }

  const handleCompleteContract = async () => {
    const { value: rate } = await Swal.fire({
      title: 'Complete Contract Setup',
      text: 'Enter hourly rate:',
      input: 'number',
      inputPlaceholder: 'Hourly rate (e.g., 75)',
      inputAttributes: {
        min: '0',
        step: '0.01',
      },
      showCancelButton: true,
      confirmButtonText: 'Complete',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value || parseFloat(value) <= 0) {
          return 'Please enter a valid hourly rate'
        }
      },
    })

    if (!rate) return

    setIsCompletingContract(true)
    try {
      const response = await adminCompleteContract(params.id, adminId, {
        hourly_rate: parseFloat(rate),
      })
      
      if (response.success) {
        Swal.fire({
          icon: 'success',
          title: 'Complete!',
          text: 'Contract details have been set up',
          timer: 2000,
        })
        await loadEmployee()
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.error || 'Failed to complete contract',
        })
      }
    } catch (error) {
      console.error('Error completing contract:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An unexpected error occurred',
      })
    } finally {
      setIsCompletingContract(false)
    }
  }

  const handleAssignManager = async () => {
    const managerOptions: any = {}
    managers.forEach((m) => {
      managerOptions[m.id] = m.name
    })

    const { value: managerId } = await Swal.fire({
      title: 'Assign Manager',
      input: 'select',
      inputOptions: managerOptions,
      inputPlaceholder: 'Select a manager',
      showCancelButton: true,
      confirmButtonText: 'Assign',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'Please select a manager'
        }
      },
    })

    if (!managerId) return

    setIsAssigningManager(true)
    try {
      const response = await adminAssignManager(params.id, managerId)
      if (response.success) {
        Swal.fire({
          icon: 'success',
          title: 'Assigned!',
          text: 'Manager has been assigned successfully',
          timer: 2000,
        })
        await loadEmployee()
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.error || 'Failed to assign manager',
        })
      }
    } catch (error) {
      console.error('Error assigning manager:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An unexpected error occurred',
      })
    } finally {
      setIsAssigningManager(false)
    }
  }

  if (isLoading || !employee || !employeeDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.push('/admin/onboarding')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Queue
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{employee.employeeName}</h1>
          <p className="text-gray-600">{employee.employeeEmail}</p>
        </div>

        {/* Employee Information Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">Full Name</label>
                <p className="text-gray-900">{employeeDetails.name || '—'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Address</label>
                <p className="text-gray-900">{employeeDetails.address || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">State</label>
                  <p className="text-gray-900">{employeeDetails.state_parish || '—'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Country</label>
                  <p className="text-gray-900">{employeeDetails.country || '—'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Zip Code</label>
                <p className="text-gray-900">{employeeDetails.zip_code || '—'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <p className="text-gray-900">{employeeDetails.phone || '—'}</p>
              </div>
            </div>
          </div>

          {/* Banking Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Banking Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">Bank Name</label>
                <p className="text-gray-900">{employeeDetails.bank_name || '—'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Bank Address</label>
                <p className="text-gray-900">{employeeDetails.bank_address || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">SWIFT Code</label>
                  <p className="text-gray-900">{employeeDetails.swift_code || '—'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">ABA Routing</label>
                  <p className="text-gray-900">{employeeDetails.aba_wire_routing || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Account Type</label>
                  <p className="text-gray-900">{employeeDetails.account_type || '—'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Currency</label>
                  <p className="text-gray-900">{employeeDetails.currency || '—'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Account Number</label>
                <p className="text-gray-900 font-mono">
                  {employeeDetails.account_number ? '•'.repeat(employeeDetails.account_number.length - 4) + employeeDetails.account_number.slice(-4) : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <OnboardingProgress
            progress={employee.progress}
            approvalStatus={employee.adminApprovalStatus}
            rejectionReason={employee.adminRejectionReason}
          />
        </div>

        {/* Admin Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Actions</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Approve/Reject */}
            {employee.adminApprovalStatus === 'WAITING' && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
                >
                  {isApproving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  disabled={isRejecting}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  {isRejecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  Reject
                </button>
              </>
            )}

            {/* Complete Contract */}
            {employee.progress.step4_admin_approval && !employee.progress.step5_contract_complete && (
              <button
                onClick={handleCompleteContract}
                disabled={isCompletingContract}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {isCompletingContract ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
                Complete Contract
              </button>
            )}

            {/* Assign Manager */}
            {employee.progress.step5_contract_complete && !employee.progress.step6_manager_assigned && (
              <button
                onClick={handleAssignManager}
                disabled={isAssigningManager || managers.length === 0}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {isAssigningManager ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Users className="w-5 h-5" />
                )}
                Assign Manager
              </button>
            )}
          </div>

          {/* Status Messages */}
          {employee.onboardingStatus === 'COMPLETE' && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-emerald-800 font-medium">
                ✓ Onboarding Complete - Employee can now submit timesheets
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

