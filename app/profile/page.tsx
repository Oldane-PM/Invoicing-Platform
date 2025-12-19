'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, X } from 'lucide-react'
import { getEmployeeById, updateEmployeeProfile } from '@/lib/supabase/queries/employees'
import { Combobox } from '@/components/ui/combobox'

type TabType = 'personal' | 'banking' | 'project'

interface PersonalInfo {
  fullName: string
  address: string
  stateParish: string
  country: string
  zipPostalCode: string
  email: string
  phone: string
}

interface BankingDetails {
  bankName: string
  bankAddress: string
  swiftCode: string
  abaWireRouting: string
  accountType: string
  currency: string
  accountNumber: string
}

interface ProjectDetails {
  activeProject: string
  hourlyRate: string
  projectTypes: string[]
}

interface EmployeeProfile {
  personal: PersonalInfo
  banking: BankingDetails
  project: ProjectDetails
}

export default function Profile() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('personal')
  const [profile, setProfile] = useState<EmployeeProfile>({
    personal: {
      fullName: '',
      address: '',
      stateParish: '',
      country: '',
      zipPostalCode: '',
      email: '',
      phone: '',
    },
    banking: {
      bankName: '',
      bankAddress: '',
      swiftCode: '',
      abaWireRouting: '',
      accountType: '',
      currency: '',
      accountNumber: '',
    },
    project: {
      activeProject: '',
      hourlyRate: '',
      projectTypes: [],
    },
  })
  const [formData, setFormData] = useState<EmployeeProfile>(profile)
  const [isEditing, setIsEditing] = useState(false)
  const [employeeId, setEmployeeId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get employee ID from localStorage (should come from auth session in production)
    const storedEmployeeId = localStorage.getItem('employeeId')
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (storedEmployeeId && uuidRegex.test(storedEmployeeId)) {
      setEmployeeId(storedEmployeeId)
    } else {
      // No valid employee ID - redirect to login
        setLoading(false)
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    if (employeeId) {
      loadProfile()
    }
  }, [employeeId])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const employee = await getEmployeeById(employeeId)
      
      // Transform database employee to profile format
      const profileData: EmployeeProfile = {
        personal: {
          fullName: employee.name || '',
          address: employee.address || '',
          stateParish: employee.state_parish || '',
          country: employee.country || '',
          zipPostalCode: employee.zip_postal_code || '',
          email: employee.email || '',
          phone: employee.phone || '',
        },
        banking: {
          bankName: employee.bank_name || '',
          bankAddress: employee.bank_address || '',
          swiftCode: employee.swift_code || '',
          abaWireRouting: employee.aba_wire_routing || '',
          accountType: employee.account_type || '',
          currency: employee.currency || '',
          accountNumber: employee.account_number || '',
        },
        project: {
          activeProject: employee.active_project || '',
          hourlyRate: employee.hourly_rate?.toString() || '',
          projectTypes: employee.project_types || [],
        },
      }
      
      setProfile(profileData)
      setFormData(profileData)
    } catch (error) {
      console.error('Error loading profile:', error)
      // Keep empty profile state - user will see empty fields
      // They can fill them in and save to database
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!employeeId) {
      // Fallback to localStorage if no employee ID
      setProfile(formData)
      localStorage.setItem('employeeProfile', JSON.stringify(formData))
      setIsEditing(false)
      return
    }

    try {
      // Transform profile to database format
      await updateEmployeeProfile(employeeId, {
        name: formData.personal.fullName,
        email: formData.personal.email,
        address: formData.personal.address,
        state_parish: formData.personal.stateParish,
        country: formData.personal.country,
        zip_postal_code: formData.personal.zipPostalCode,
        phone: formData.personal.phone,
        bank_name: formData.banking.bankName,
        bank_address: formData.banking.bankAddress,
        swift_code: formData.banking.swiftCode,
        aba_wire_routing: formData.banking.abaWireRouting,
        account_type: formData.banking.accountType,
        currency: formData.banking.currency,
        account_number: formData.banking.accountNumber,
        active_project: formData.project.activeProject,
        hourly_rate: parseFloat(formData.project.hourlyRate) || null,
        project_types: formData.project.projectTypes,
      })
      
      setProfile(formData)
      // Also save to localStorage as backup
      localStorage.setItem('employeeProfile', JSON.stringify(formData))
      setIsEditing(false)
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    }
  }

  const handleCancel = () => {
    setFormData(profile)
    setIsEditing(false)
  }

  const updatePersonalField = (field: keyof PersonalInfo, value: string) => {
    setFormData({
      ...formData,
      personal: { ...formData.personal, [field]: value },
    })
  }

  const updateBankingField = (field: keyof BankingDetails, value: string) => {
    setFormData({
      ...formData,
      banking: { ...formData.banking, [field]: value },
    })
  }

  const updateProjectField = (field: keyof ProjectDetails, value: string | string[]) => {
    setFormData({
      ...formData,
      project: { ...formData.project, [field]: value },
    })
  }

  const addProjectType = (type: string) => {
    if (type.trim() && !formData.project.projectTypes.includes(type.trim())) {
      updateProjectField('projectTypes', [...formData.project.projectTypes, type.trim()])
    }
  }

  const removeProjectType = (type: string) => {
    updateProjectField(
      'projectTypes',
      formData.project.projectTypes.filter((t) => t !== type)
    )
  }

  const availableProjectTypes = ['WDG', 'Client Project', 'Internal', 'Consulting', 'Support']

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Profile</h1>
            <p className="text-gray-600">Update your personal and banking details for invoicing.</p>
          </div>

          {/* Tabs */}
          <div className="flex space-x-6 border-b mb-6">
            <button
              onClick={() => setActiveTab('personal')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'personal'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Personal Information
            </button>
            <button
              onClick={() => setActiveTab('banking')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'banking'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Banking Details
            </button>
            <button
              onClick={() => setActiveTab('project')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'project'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Project Details
            </button>
          </div>

          {/* Tab Content */}
          <div className="mb-6">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Edit
              </button>
            )}

            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        required
                        value={formData.personal.fullName}
                        onChange={(e) => updatePersonalField('fullName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="text-gray-900">{profile.personal.fullName}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.personal.address}
                        onChange={(e) => updatePersonalField('address', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                      />
                    ) : (
                      <div className="text-gray-900 whitespace-pre-line">{profile.personal.address}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State / Parish <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        required
                        value={formData.personal.stateParish}
                        onChange={(e) => updatePersonalField('stateParish', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="text-gray-900">{profile.personal.stateParish}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        required
                        value={formData.personal.country}
                        onChange={(e) => updatePersonalField('country', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="text-gray-900">{profile.personal.country}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zip / Postal Code <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        required
                        value={formData.personal.zipPostalCode}
                        onChange={(e) => updatePersonalField('zipPostalCode', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="text-gray-900">{profile.personal.zipPostalCode}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        required
                        value={formData.personal.email}
                        onChange={(e) => updatePersonalField('email', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="text-gray-900">{profile.personal.email}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        required
                        value={formData.personal.phone}
                        onChange={(e) => updatePersonalField('phone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="text-gray-900">{profile.personal.phone}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Banking Details Tab */}
            {activeTab === 'banking' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Banking Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name of Bank <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        required
                        value={formData.banking.bankName}
                        onChange={(e) => updateBankingField('bankName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="text-gray-900">{profile.banking.bankName}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Address <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <textarea
                        required
                        value={formData.banking.bankAddress}
                        onChange={(e) => updateBankingField('bankAddress', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                      />
                    ) : (
                      <div className="text-gray-900 whitespace-pre-line">{profile.banking.bankAddress}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SWIFT Code <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        required
                        value={formData.banking.swiftCode}
                        onChange={(e) => updateBankingField('swiftCode', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="text-gray-900">{profile.banking.swiftCode}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ABA / Wire Routing <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        required
                        value={formData.banking.abaWireRouting}
                        onChange={(e) => updateBankingField('abaWireRouting', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="text-gray-900">{profile.banking.abaWireRouting}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Type <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <Combobox
                        required
                        placeholder="Select account type"
                        value={formData.banking.accountType}
                        onChange={(value) => updateBankingField('accountType', value)}
                        options={[
                          { value: 'Checking', label: 'Checking' },
                          { value: 'Savings', label: 'Savings' },
                          { value: 'Money Market', label: 'Money Market' },
                        ]}
                        clearable={false}
                      />
                    ) : (
                      <div className="text-gray-900">{profile.banking.accountType}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <Combobox
                        required
                        placeholder="Select currency"
                        value={formData.banking.currency}
                        onChange={(value) => updateBankingField('currency', value)}
                        options={[
                          { value: 'USD', label: 'USD', sublabel: 'US Dollar' },
                          { value: 'EUR', label: 'EUR', sublabel: 'Euro' },
                          { value: 'GBP', label: 'GBP', sublabel: 'British Pound' },
                          { value: 'CAD', label: 'CAD', sublabel: 'Canadian Dollar' },
                          { value: 'AUD', label: 'AUD', sublabel: 'Australian Dollar' },
                        ]}
                        clearable={false}
                      />
                    ) : (
                      <div className="text-gray-900">{profile.banking.currency}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        required
                        value={formData.banking.accountNumber}
                        onChange={(e) => updateBankingField('accountNumber', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="text-gray-900">{profile.banking.accountNumber}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Project Details Tab */}
            {activeTab === 'project' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Project Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Active Project <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        required
                        value={formData.project.activeProject}
                        onChange={(e) => updateProjectField('activeProject', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="text-gray-900">{profile.project.activeProject}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Rate <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.project.hourlyRate}
                        onChange={(e) => updateProjectField('hourlyRate', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="text-gray-900">${profile.project.hourlyRate}</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Types <span className="text-red-500">*</span>
                    </label>
                    {isEditing ? (
                      <div>
                        <div className="flex flex-wrap gap-2 mb-2 p-3 border border-gray-300 rounded-lg min-h-[48px]">
                          {formData.project.projectTypes.map((type) => (
                            <span
                              key={type}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                            >
                              {type}
                              <button
                                type="button"
                                onClick={() => removeProjectType(type)}
                                className="ml-2 text-primary-600 hover:text-primary-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <Combobox
                          placeholder="Select a project type to add"
                          value=""
                          onChange={(value) => {
                            if (value) {
                              addProjectType(value)
                            }
                          }}
                          options={availableProjectTypes
                            .filter((type) => !formData.project.projectTypes.includes(type))
                            .map((type) => ({
                              value: type,
                              label: type,
                            }))}
                          emptyMessage="No project types available"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profile.project.projectTypes.map((type) => (
                          <span
                            key={type}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                {activeTab === 'personal' ? 'Save & Continue' : 'Save Profile'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
