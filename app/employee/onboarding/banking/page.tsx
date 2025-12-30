'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, ChevronDown } from 'lucide-react'
import { saveBankingInfo, submitOnboarding, getOnboardingStatus } from '@/lib/data/onboarding'
import { getEmployeeById } from '@/lib/supabase/queries/employees'

export default function BankingInformationForm() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    bankName: '',
    bankAddress: '',
    swiftCode: '',
    abaRouting: '',
    accountType: '',
    currency: '',
    accountNumber: '',
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const accountTypes = ['Checking', 'Savings']
  const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF']

  useEffect(() => {
    // Get userId (auth user) - users in onboarding don't have employeeId yet
    const userId = localStorage.getItem('userId') || localStorage.getItem('employeeId')
    if (!userId) {
      console.log('[Banking] No userId found, redirecting to sign-in')
      router.push('/sign-in')
      return
    }
    setEmployeeId(userId)

    // Check if personal info was completed
    checkOnboardingProgress(userId)
  }, [router])

  const checkOnboardingProgress = async (empId: string) => {
    try {
      const status = await getOnboardingStatus(empId)
      
      if (!status?.personalInfoCompletedAt) {
        // Redirect back to personal info if not completed
        router.push('/employee/onboarding/personal')
        return
      }

      // Load existing banking data if available
      const employee = await getEmployeeById(empId)
      if (employee) {
        setFormData({
          bankName: employee.bank_name || '',
          bankAddress: employee.bank_address || '',
          swiftCode: employee.swift_code || '',
          abaRouting: employee.aba_wire_routing || '',
          accountType: employee.account_type || '',
          currency: employee.currency || '',
          accountNumber: employee.account_number || '',
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.bankName.trim()) {
      errors.bankName = 'Bank name is required'
    }
    if (!formData.bankAddress.trim()) {
      errors.bankAddress = 'Bank address is required'
    }
    if (!formData.swiftCode.trim()) {
      errors.swiftCode = 'SWIFT code is required'
    }
    if (!formData.abaRouting.trim()) {
      errors.abaRouting = 'ABA routing number is required'
    }
    if (!formData.accountType) {
      errors.accountType = 'Account type is required'
    }
    if (!formData.currency) {
      errors.currency = 'Currency is required'
    }
    if (!formData.accountNumber.trim()) {
      errors.accountNumber = 'Account number is required'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      setError('Please fix the errors above')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      // Step 1: Save banking info
      const bankingResult = await saveBankingInfo(employeeId, {
        bank_name: formData.bankName,
        bank_address: formData.bankAddress,
        swift_code: formData.swiftCode,
        aba_wire_routing: formData.abaRouting,
        account_type: formData.accountType,
        currency: formData.currency,
        account_number: formData.accountNumber,
      })

      if (!bankingResult.success) {
        setError(bankingResult.error || 'Failed to save banking information')
        setIsSaving(false)
        return
      }

      // Step 2: Submit onboarding for review
      const submitResult = await submitOnboarding(employeeId)

      if (submitResult.success) {
        // Navigate to status page
        router.push('/employee/onboarding/status')
      } else {
        setError(submitResult.error || 'Failed to submit onboarding')
        setIsSaving(false)
      }
    } catch (error) {
      console.error('Error submitting banking info:', error)
      setError('An unexpected error occurred')
      setIsSaving(false)
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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600">Step 2 of 2: Banking Details</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-white">
              <CheckCircle className="w-6 h-6" />
            </div>
            <span className="ml-3 font-medium text-gray-900">Personal Information</span>
          </div>
          <div className="w-24 h-1 bg-indigo-600 mx-4"></div>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white font-semibold">
              2
            </div>
            <span className="ml-3 font-medium text-gray-900">Banking Details</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Banking Details
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bank Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => {
                  setFormData({ ...formData, bankName: e.target.value })
                  setFieldErrors({ ...fieldErrors, bankName: '' })
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  fieldErrors.bankName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your bank name"
              />
              {fieldErrors.bankName && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.bankName}</p>
              )}
            </div>

            {/* Bank Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Address <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.bankAddress}
                onChange={(e) => {
                  setFormData({ ...formData, bankAddress: e.target.value })
                  setFieldErrors({ ...fieldErrors, bankAddress: '' })
                }}
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${
                  fieldErrors.bankAddress ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your bank address"
              />
              {fieldErrors.bankAddress && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.bankAddress}</p>
              )}
            </div>

            {/* SWIFT Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SWIFT Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.swiftCode}
                onChange={(e) => {
                  setFormData({ ...formData, swiftCode: e.target.value.toUpperCase() })
                  setFieldErrors({ ...fieldErrors, swiftCode: '' })
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  fieldErrors.swiftCode ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter SWIFT code"
              />
              {fieldErrors.swiftCode && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.swiftCode}</p>
              )}
            </div>

            {/* ABA Routing Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ABA Routing Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.abaRouting}
                onChange={(e) => {
                  setFormData({ ...formData, abaRouting: e.target.value })
                  setFieldErrors({ ...fieldErrors, abaRouting: '' })
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  fieldErrors.abaRouting ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter ABA routing number"
              />
              {fieldErrors.abaRouting && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.abaRouting}</p>
              )}
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.accountType}
                  onChange={(e) => {
                    setFormData({ ...formData, accountType: e.target.value })
                    setFieldErrors({ ...fieldErrors, accountType: '' })
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white ${
                    fieldErrors.accountType ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select account type</option>
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {fieldErrors.accountType && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.accountType}</p>
              )}
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.currency}
                  onChange={(e) => {
                    setFormData({ ...formData, currency: e.target.value })
                    setFieldErrors({ ...fieldErrors, currency: '' })
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white ${
                    fieldErrors.currency ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select currency</option>
                  {currencies.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {fieldErrors.currency && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.currency}</p>
              )}
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => {
                  setFormData({ ...formData, accountNumber: e.target.value })
                  setFieldErrors({ ...fieldErrors, accountNumber: '' })
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  fieldErrors.accountNumber ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter account number"
              />
              {fieldErrors.accountNumber && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.accountNumber}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => router.push('/employee/onboarding/personal')}
                disabled={isSaving}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit for Review
                    <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

