'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { getEmployeeById, updateEmployeeProfile } from '@/lib/supabase/queries/employees'
import type { Employee } from '@/types/domain'

type Step = 1 | 2

interface PersonalFormValues {
  fullName: string
  address: string
  state: string
  country: string
  zipCode: string
  email: string
  phoneNumber: string
}

interface BankingFormValues {
  bankName: string
  bankAddress: string
  swiftCode: string
  abaRoutingNumber: string
  accountType: string
  currency: string
  accountNumber: string
}

type PersonalErrors = Partial<Record<keyof PersonalFormValues, string>>
type BankingErrors = Partial<Record<keyof BankingFormValues, string>>

export default function OnboardingPage() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<Step>(1)

  const [personal, setPersonal] = useState<PersonalFormValues>({
    fullName: '',
    address: '',
    state: '',
    country: '',
    zipCode: '',
    email: '',
    phoneNumber: '',
  })
  const [banking, setBanking] = useState<BankingFormValues>({
    bankName: '',
    bankAddress: '',
    swiftCode: '',
    abaRoutingNumber: '',
    accountType: '',
    currency: '',
    accountNumber: '',
  })

  const [personalErrors, setPersonalErrors] = useState<PersonalErrors>({})
  const [bankingErrors, setBankingErrors] = useState<BankingErrors>({})

  // Load employee and existing profile
  useEffect(() => {
    const storedEmployeeId = typeof window !== 'undefined' ? localStorage.getItem('employeeId') : null
    if (!storedEmployeeId) {
      setLoading(false)
      router.push('/login')
      return
    }
    setEmployeeId(storedEmployeeId)

    const load = async () => {
      try {
        const data = await getEmployeeById(storedEmployeeId)
        setEmployee(data)

        setPersonal({
          fullName: data.name || '',
          address: data.address || '',
          state: data.state_parish || '',
          country: data.country || '',
          zipCode: data.zip_postal_code || '',
          email: data.email || '',
          phoneNumber: data.phone || '',
        })

        setBanking({
          bankName: data.bank_name || '',
          bankAddress: data.bank_address || '',
          swiftCode: data.swift_code || '',
          abaRoutingNumber: data.aba_wire_routing || '',
          accountType: data.account_type || '',
          currency: data.currency || '',
          accountNumber: data.account_number || '',
        })
      } catch (error) {
        console.error('Error loading onboarding profile:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  const validatePersonal = (): boolean => {
    const errors: PersonalErrors = {}

    if (!personal.fullName.trim()) errors.fullName = 'Full name is required.'
    if (!personal.address.trim()) errors.address = 'Address is required.'
    if (!personal.state.trim()) errors.state = 'State is required.'
    if (!personal.country.trim()) errors.country = 'Country is required.'
    if (!personal.zipCode.trim()) errors.zipCode = 'Zip code is required.'

    if (!personal.email.trim()) {
      errors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email)) {
      errors.email = 'Please enter a valid email address.'
    }

    if (!personal.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required.'
    } else if (!/^[+\d][\d\s\-]{6,}$/.test(personal.phoneNumber.trim())) {
      errors.phoneNumber = 'Please enter a valid phone number.'
    }

    setPersonalErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateBanking = (): boolean => {
    const errors: BankingErrors = {}

    if (!banking.bankName.trim()) errors.bankName = 'Bank name is required.'
    if (!banking.bankAddress.trim()) errors.bankAddress = 'Bank address is required.'

    if (!banking.swiftCode.trim()) {
      errors.swiftCode = 'SWIFT code is required.'
    } else if (
      banking.swiftCode.trim().length !== 8 &&
      banking.swiftCode.trim().length !== 11
    ) {
      errors.swiftCode = 'SWIFT code should be 8 or 11 characters.'
    }

    if (!banking.abaRoutingNumber.trim()) {
      errors.abaRoutingNumber = 'ABA routing number is required.'
    } else if (!/^\d{9}$/.test(banking.abaRoutingNumber.trim())) {
      errors.abaRoutingNumber = 'ABA routing number must be 9 digits.'
    }

    if (!banking.accountType.trim()) errors.accountType = 'Account type is required.'
    if (!banking.currency.trim()) errors.currency = 'Currency is required.'

    if (!banking.accountNumber.trim()) {
      errors.accountNumber = 'Account number is required.'
    } else if (banking.accountNumber.trim().length < 6) {
      errors.accountNumber = 'Account number should be at least 6 characters.'
    }

    setBankingErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handlePersonalSubmit = async () => {
    if (!employeeId) return
    if (!validatePersonal()) return

    try {
      setSaving(true)
      await updateEmployeeProfile(employeeId, {
        name: personal.fullName.trim(),
        email: personal.email.trim(),
        address: personal.address.trim(),
        state_parish: personal.state.trim(),
        country: personal.country.trim(),
        zip_postal_code: personal.zipCode.trim(),
        phone: personal.phoneNumber.trim(),
        onboarding_status: 'in_progress',
      })
      setStep(2)
    } catch (error) {
      console.error('Error saving personal info:', error)
      alert('Something went wrong saving your information. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleBankingSubmit = async () => {
    if (!employeeId) return
    if (!validateBanking()) return

    try {
      setSaving(true)

      // NOTE: Currently storing banking details in plain text columns.
      // To add AES-256 encryption at rest, move this logic into a server-only
      // API route and encrypt the sensitive fields before persisting.
      await updateEmployeeProfile(employeeId, {
        bank_name: banking.bankName.trim(),
        bank_address: banking.bankAddress.trim(),
        swift_code: banking.swiftCode.trim(),
        aba_wire_routing: banking.abaRoutingNumber.trim(),
        account_type: banking.accountType.trim(),
        currency: banking.currency.trim(),
        account_number: banking.accountNumber.trim(),
        onboarding_status: 'completed',
      })

      alert('Profile setup complete!')
      router.push('/')
    } catch (error) {
      console.error('Error saving banking details:', error)
      alert('Something went wrong saving your information. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    if (!employeeId) {
      router.push('/')
      return
    }

    try {
      await updateEmployeeProfile(employeeId, {
        onboarding_status: 'not_started',
      })
    } catch (error) {
      console.error('Error updating onboarding status on skip:', error)
    } finally {
      router.push('/')
    }
  }

  const isStepCompleted = (stepNumber: Step) => {
    const status = employee?.onboarding_status
    if (status === 'completed') return true
    if (status === 'in_progress' && stepNumber === 1) return true
    return false
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Loading your profile...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">
            Welcome! Let&apos;s Get You Set Up
          </h1>
          <p className="text-sm text-slate-500">
            Please complete your profile to get started
          </p>
          <button
            type="button"
            onClick={handleSkip}
            className="mt-3 text-sm text-slate-500 underline-offset-2 hover:underline"
          >
            Skip for now
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          {/* Stepper */}
          <div className="flex items-center justify-center gap-6 mb-8">
            {/* Step 1 */}
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-semibold ${
                  step === 1
                    ? 'bg-primary-blue text-white border-primary-blue'
                    : isStepCompleted(1)
                    ? 'bg-primary-blue text-white border-primary-blue'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {isStepCompleted(1) && step !== 1 ? (
                  <Check className="w-4 h-4" />
                ) : (
                  1
                )}
              </div>
              <div className="flex flex-col">
                <span
                  className={`text-sm font-medium ${
                    step === 1 ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Personal Information
                </span>
              </div>
            </div>

            <div className="h-px flex-1 max-w-[120px] bg-slate-200" />

            {/* Step 2 */}
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-semibold ${
                  step === 2
                    ? 'bg-primary-blue text-white border-primary-blue'
                    : isStepCompleted(2)
                    ? 'bg-primary-blue text-white border-primary-blue'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {isStepCompleted(2) && step !== 2 ? (
                  <Check className="w-4 h-4" />
                ) : (
                  2
                )}
              </div>
              <div className="flex flex-col">
                <span
                  className={`text-sm font-medium ${
                    step === 2 ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Banking Details
                </span>
              </div>
            </div>
          </div>

          {/* Step content */}
          {step === 1 ? (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Personal Information
              </h2>
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={personal.fullName}
                    onChange={(e) =>
                      setPersonal((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm"
                    placeholder="Enter your full name"
                  />
                  {personalErrors.fullName && (
                    <p className="mt-1 text-xs text-red-600">{personalErrors.fullName}</p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={personal.address}
                    onChange={(e) =>
                      setPersonal((prev) => ({ ...prev, address: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm resize-y"
                    placeholder="Enter your address"
                  />
                  {personalErrors.address && (
                    <p className="mt-1 text-xs text-red-600">{personalErrors.address}</p>
                  )}
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={personal.state}
                    onChange={(e) =>
                      setPersonal((prev) => ({ ...prev, state: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm"
                    placeholder="Enter your state"
                  />
                  {personalErrors.state && (
                    <p className="mt-1 text-xs text-red-600">{personalErrors.state}</p>
                  )}
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={personal.country}
                    onChange={(e) =>
                      setPersonal((prev) => ({ ...prev, country: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm"
                    placeholder="Enter your country"
                  />
                  {personalErrors.country && (
                    <p className="mt-1 text-xs text-red-600">{personalErrors.country}</p>
                  )}
                </div>

                {/* Zip Code */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Zip Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={personal.zipCode}
                    onChange={(e) =>
                      setPersonal((prev) => ({ ...prev, zipCode: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm"
                    placeholder="Enter your zip code"
                  />
                  {personalErrors.zipCode && (
                    <p className="mt-1 text-xs text-red-600">{personalErrors.zipCode}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={personal.email}
                    onChange={(e) =>
                      setPersonal((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm"
                    placeholder="Enter your email address"
                  />
                  {personalErrors.email && (
                    <p className="mt-1 text-xs text-red-600">{personalErrors.email}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={personal.phoneNumber}
                    onChange={(e) =>
                      setPersonal((prev) => ({ ...prev, phoneNumber: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm"
                    placeholder="Enter your phone number"
                  />
                  {personalErrors.phoneNumber && (
                    <p className="mt-1 text-xs text-red-600">
                      {personalErrors.phoneNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={handlePersonalSubmit}
                  disabled={saving}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-primary-blue hover:bg-primary-blue-hover disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-blue"
                >
                  {saving ? 'Saving...' : 'Next: Banking Details'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Banking Details</h2>
              <div className="space-y-4">
                {/* Bank Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={banking.bankName}
                    onChange={(e) =>
                      setBanking((prev) => ({ ...prev, bankName: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm"
                    placeholder="Enter your bank name"
                  />
                  {bankingErrors.bankName && (
                    <p className="mt-1 text-xs text-red-600">{bankingErrors.bankName}</p>
                  )}
                </div>

                {/* Bank Address */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bank Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={banking.bankAddress}
                    onChange={(e) =>
                      setBanking((prev) => ({ ...prev, bankAddress: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm resize-y"
                    placeholder="Enter your bank address"
                  />
                  {bankingErrors.bankAddress && (
                    <p className="mt-1 text-xs text-red-600">{bankingErrors.bankAddress}</p>
                  )}
                </div>

                {/* SWIFT Code */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    SWIFT Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={banking.swiftCode}
                    onChange={(e) =>
                      setBanking((prev) => ({ ...prev, swiftCode: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm"
                    placeholder="Enter SWIFT code"
                  />
                  {bankingErrors.swiftCode && (
                    <p className="mt-1 text-xs text-red-600">{bankingErrors.swiftCode}</p>
                  )}
                </div>

                {/* ABA Routing Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    ABA Routing Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={banking.abaRoutingNumber}
                    onChange={(e) =>
                      setBanking((prev) => ({ ...prev, abaRoutingNumber: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm"
                    placeholder="Enter ABA routing number"
                  />
                  {bankingErrors.abaRoutingNumber && (
                    <p className="mt-1 text-xs text-red-600">
                      {bankingErrors.abaRoutingNumber}
                    </p>
                  )}
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Account Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={banking.accountType}
                    onChange={(e) =>
                      setBanking((prev) => ({ ...prev, accountType: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm bg-white"
                  >
                    <option value="">Select account type</option>
                    <option value="Checking">Checking</option>
                    <option value="Savings">Savings</option>
                    <option value="Business Checking">Business Checking</option>
                  </select>
                  {bankingErrors.accountType && (
                    <p className="mt-1 text-xs text-red-600">{bankingErrors.accountType}</p>
                  )}
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Currency <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={banking.currency}
                    onChange={(e) =>
                      setBanking((prev) => ({ ...prev, currency: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm bg-white"
                  >
                    <option value="">Select currency</option>
                    <option value="USD">USD</option>
                    <option value="CAD">CAD</option>
                    <option value="JMD">JMD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  {bankingErrors.currency && (
                    <p className="mt-1 text-xs text-red-600">{bankingErrors.currency}</p>
                  )}
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={banking.accountNumber}
                    onChange={(e) =>
                      setBanking((prev) => ({ ...prev, accountNumber: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent text-sm"
                    placeholder="Enter account number"
                  />
                  {bankingErrors.accountNumber && (
                    <p className="mt-1 text-xs text-red-600">
                      {bankingErrors.accountNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleBankingSubmit}
                  disabled={saving}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-primary-blue hover:bg-primary-blue-hover disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-blue"
                >
                  {saving ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


