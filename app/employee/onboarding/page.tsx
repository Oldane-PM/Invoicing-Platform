'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, ArrowRight, Info } from 'lucide-react'
import { getOnboardingStatus, createOnboardingCase } from '@/lib/data/onboarding'

export default function OnboardingWelcome() {
  const router = useRouter()
  const [employeeName, setEmployeeName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    // Get userId (auth user) - this is what we need for onboarding
    const uid = localStorage.getItem('userId') || localStorage.getItem('employeeId')
    const name = localStorage.getItem('employeeName') || localStorage.getItem('name')
    setEmployeeName(name || 'Employee')
    setUserId(uid || '')

    // Only redirect to sign-in if NO auth user at all
    if (!uid) {
      console.log('[Onboarding Welcome] No userId found, redirecting to sign-in')
      router.push('/sign-in')
      return
    }

    console.log('[Onboarding Welcome] Checking onboarding status for userId:', uid)

    // Check onboarding status using userId (not employeeId!)
    getOnboardingStatus(uid).then((status) => {
      console.log('[Onboarding Welcome] Status:', status)
      
      if (status) {
        // If already submitted, redirect to status page
        if (status.submittedAt) {
          router.push('/employee/onboarding/status')
          return
        }
        // If personal info completed, go to banking
        if (status.personalInfoCompleted) {
          router.push('/employee/onboarding/banking')
          return
        }
      }
      setIsLoading(false)
    }).catch((error) => {
      console.error('[Onboarding Welcome] Error checking status:', error)
      // Don't redirect to login on error - stay on page
      setIsLoading(false)
    })
  }, [router])

  const handleStartOnboarding = async () => {
    if (!userId) {
      setError('Session expired. Please log in again.')
      return
    }

    setIsStarting(true)
    setError('')

    try {
      console.log('[Onboarding Welcome] Creating onboarding case for userId:', userId)
      
      // Create onboarding case (idempotent - checks if exists first)
      const result = await createOnboardingCase(userId)
      
      if (!result.success) {
        console.error('[Onboarding Welcome] Failed to create case:', result.error)
        setError(result.error || 'Failed to start onboarding. Please try again.')
        setIsStarting(false)
        return
      }

      console.log('[Onboarding Welcome] Case created/found, navigating to personal info')
      // Navigate to personal info form
      router.push('/employee/onboarding/personal')
    } catch (err: any) {
      console.error('[Onboarding Welcome] Error starting onboarding:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsStarting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center">
            <CheckCircle className="w-14 h-14 text-white" />
          </div>
        </div>

        {/* Welcome Message */}
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-2">
          Welcome, {employeeName}! 👋
        </h1>
        <p className="text-center text-gray-600 text-lg mb-8">
          Let's get you set up
        </p>

        {/* Steps Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Before you can submit hours, we need to complete a few setup steps:
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-semibold">
                1
              </div>
              <p className="text-gray-700 pt-1">Complete your personal information</p>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-semibold">
                2
              </div>
              <p className="text-gray-700 pt-1">Add banking details for payroll</p>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-semibold">
                3
              </div>
              <p className="text-gray-700 pt-1">Wait for administrator approval</p>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-semibold">
                4
              </div>
              <p className="text-gray-700 pt-1">Get assigned to a manager</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900">What to expect:</p>
              <p className="text-blue-800 text-sm mt-1">
                This process typically takes 5-10 minutes to complete. Your information
                will be reviewed by an administrator before you can begin submitting
                timesheets.
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStartOnboarding}
          disabled={isStarting}
          className="w-full bg-indigo-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStarting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Creating your onboarding...
            </>
          ) : (
            <>
              Start Onboarding
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Help Link */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Need help? Contact{' '}
          <a
            href="mailto:support@employeesystem.com"
            className="text-indigo-600 hover:underline"
          >
            support@employeesystem.com
          </a>
        </p>
      </div>
    </div>
  )
}

