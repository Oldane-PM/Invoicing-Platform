'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Lock, Info, CheckCircle } from 'lucide-react'
import { getOnboardingStatus, resubmitOnboarding } from '@/lib/data/onboarding'
import { OnboardingProgress } from '@/components/employee/OnboardingProgress'
import type { OnboardingData } from '@/lib/data/onboarding'

export default function OnboardingStatusPage() {
  const router = useRouter()
  const [status, setStatus] = useState<OnboardingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isResubmitting, setIsResubmitting] = useState(false)
  const [employeeId, setEmployeeId] = useState('')

  useEffect(() => {
    // Get userId (auth user) - users in onboarding don't have employeeId yet
    const userId = localStorage.getItem('userId') || localStorage.getItem('employeeId')
    if (!userId) {
      console.log('[Onboarding Status] No userId found, redirecting to sign-in')
      router.push('/sign-in')
      return
    }
    setEmployeeId(userId)
    loadStatus(userId)

    const interval = setInterval(() => {
      loadStatus(userId)
    }, 30000)

    return () => clearInterval(interval)
  }, [router])

  const loadStatus = async (empId: string) => {
    try {
      const data = await getOnboardingStatus(empId)
      if (data) {
        setStatus(data)
        if (data.onboardingStatus === 'COMPLETE') {
          router.push('/employee')
        }
      }
    } catch (error) {
      console.error('Error loading onboarding status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResubmit = async () => {
    if (!employeeId) return
    setIsResubmitting(true)
    try {
      const result = await resubmitOnboarding(employeeId)
      if (result.success) {
        await loadStatus(employeeId)
      }
    } catch (error) {
      console.error('Error resubmitting:', error)
    } finally {
      setIsResubmitting(false)
    }
  }

  const handleEditPersonalInfo = () => {
    router.push('/employee/onboarding/personal')
  }

  const handleEditBankingInfo = () => {
    router.push('/employee/onboarding/banking')
  }

  if (isLoading || !status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }

  const isRejected = status.adminApprovalStatus === 'REJECTED'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-14 h-14 text-amber-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isRejected ? 'Action Required' : 'Your Information Has Been Submitted'}
          </h1>

          <p className="text-gray-600 mb-6">
            {isRejected
              ? 'Your onboarding submission was rejected. Please review the feedback below and resubmit.'
              : 'An administrator is reviewing your details. You will be notified once your account is approved.'}
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 border border-blue-200 rounded-full text-blue-800 font-medium">
            <CheckCircle className="w-5 h-5" />
            {status.progress.completed_steps} of {status.progress.total_steps} steps completed
          </div>
        </div>

        {isRejected && status.adminRejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Info className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Submission Rejected by Administrator
                </h3>
                <p className="text-red-800 mb-4">{status.adminRejectionReason}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleEditPersonalInfo}
                    className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium"
                  >
                    Edit Personal Info
                  </button>
                  <button
                    onClick={handleEditBankingInfo}
                    className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium"
                  >
                    Edit Banking Info
                  </button>
                  <button
                    onClick={handleResubmit}
                    disabled={isResubmitting}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                  >
                    {isResubmitting ? 'Resubmitting...' : 'Resubmit for Review'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <OnboardingProgress
          progress={status.progress}
          approvalStatus={status.adminApprovalStatus}
          rejectionReason={status.adminRejectionReason}
        />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Lock className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Timesheet Submissions Locked
              </h3>
              <p className="text-gray-600 mb-4">
                You will be able to submit hours once your onboarding is complete.
              </p>
              <button
                disabled
                className="px-6 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed font-medium"
              >
                Submit Hours
              </button>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5" />
            What happens next?
          </h3>
          <ul className="space-y-3 text-amber-800">
            <li className="flex items-start gap-3">
              <span className="text-amber-600 font-bold">•</span>
              <span>An administrator will review your personal and banking information</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-600 font-bold">•</span>
              <span>Your contract details will be set up</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-600 font-bold">•</span>
              <span>You will be assigned to a reporting manager</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-600 font-bold">•</span>
              <span>Once complete, you will receive a notification and can start submitting hours</span>
            </li>
          </ul>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/employee')}
            className="px-8 py-3 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 border-2 border-indigo-600"
          >
            View Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
