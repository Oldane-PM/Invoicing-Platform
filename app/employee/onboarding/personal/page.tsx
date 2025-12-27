'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { savePersonalInfo, getOnboardingStatus } from '@/lib/data/onboarding'
import { getEmployeeById } from '@/lib/supabase/queries/employees'

export default function PersonalInformationForm() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    state: '',
    country: '',
    zipCode: '',
    email: '',
    phone: '',
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const storedEmployeeId = localStorage.getItem('employeeId')
    if (!storedEmployeeId) {
      router.push('/sign-in')
      return
    }
    setEmployeeId(storedEmployeeId)

    // Load existing data if available
    loadExistingData(storedEmployeeId)
  }, [router])

  const loadExistingData = async (empId: string) => {
    try {
      const employee = await getEmployeeById(empId)
      if (employee) {
        setFormData({
          fullName: employee.name || '',
          address: employee.address || '',
          state: employee.state_parish || '',
          country: employee.country || '',
          zipCode: employee.zip_code || '',
          email: employee.email || '',
          phone: employee.phone || '',
        })
      }
    } catch (error) {
      console.error('Error loading employee data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required'
    }
    if (!formData.address.trim()) {
      errors.address = 'Address is required'
    }
    if (!formData.state.trim()) {
      errors.state = 'State is required'
    }
    if (!formData.country.trim()) {
      errors.country = 'Country is required'
    }
    if (!formData.zipCode.trim()) {
      errors.zipCode = 'Zip code is required'
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required'
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
      const result = await savePersonalInfo(employeeId, {
        name: formData.fullName,
        address: formData.address,
        state_parish: formData.state,
        country: formData.country,
        zip_code: formData.zipCode,
        email: formData.email,
        phone: formData.phone,
      })

      if (result.success) {
        // Navigate to banking form
        router.push('/employee/onboarding/banking')
      } else {
        setError(result.error || 'Failed to save personal information')
        setIsSaving(false)
      }
    } catch (error) {
      console.error('Error saving personal info:', error)
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
          <p className="text-gray-600">Step 1 of 2: Personal Information</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white font-semibold">
              1
            </div>
            <span className="ml-3 font-medium text-gray-900">Personal Information</span>
          </div>
          <div className="w-24 h-1 bg-gray-200 mx-4"></div>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-400 font-semibold">
              2
            </div>
            <span className="ml-3 font-medium text-gray-400">Banking Details</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Personal Information
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value })
                  setFieldErrors({ ...fieldErrors, fullName: '' })
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  fieldErrors.fullName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.fullName}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => {
                  setFormData({ ...formData, address: e.target.value })
                  setFieldErrors({ ...fieldErrors, address: '' })
                }}
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${
                  fieldErrors.address ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your address"
              />
              {fieldErrors.address && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.address}</p>
              )}
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => {
                  setFormData({ ...formData, state: e.target.value })
                  setFieldErrors({ ...fieldErrors, state: '' })
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  fieldErrors.state ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your state"
              />
              {fieldErrors.state && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.state}</p>
              )}
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => {
                  setFormData({ ...formData, country: e.target.value })
                  setFieldErrors({ ...fieldErrors, country: '' })
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  fieldErrors.country ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your country"
              />
              {fieldErrors.country && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.country}</p>
              )}
            </div>

            {/* Zip Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zip Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => {
                  setFormData({ ...formData, zipCode: e.target.value })
                  setFieldErrors({ ...fieldErrors, zipCode: '' })
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  fieldErrors.zipCode ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your zip code"
              />
              {fieldErrors.zipCode && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.zipCode}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  setFieldErrors({ ...fieldErrors, email: '' })
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  fieldErrors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="James@example.com"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value })
                  setFieldErrors({ ...fieldErrors, phone: '' })
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  fieldErrors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your phone number"
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save & Continue
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

