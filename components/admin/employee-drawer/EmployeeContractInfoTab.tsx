'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  Briefcase, 
  Building2, 
  Pencil, 
  Save
} from 'lucide-react'
import { ContractInfo } from './types'
import { Combobox } from '@/components/ui/combobox'

interface EmployeeContractInfoTabProps {
  contractInfo: ContractInfo
  employeeId: string
  onUpdateContractInfo?: (info: ContractInfo) => void
  managers?: { id: string; name: string }[]
  onToast?: (options: { title: string; variant: 'success' | 'error' }) => void
  // Note: Reporting Manager is now managed exclusively in Access Control tab
}

const DEPARTMENTS = [
  'Engineering',
  'Design',
  'Marketing',
  'Sales',
  'Operations',
  'Human Resources',
  'Finance',
  'General',
]

export function EmployeeContractInfoTab({ 
  contractInfo, 
  employeeId,
  onUpdateContractInfo,
  managers = [],
  onToast,
}: EmployeeContractInfoTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formValues, setFormValues] = useState<ContractInfo>(contractInfo)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Sync form values when contractInfo changes
  useEffect(() => {
    setFormValues(contractInfo)
  }, [contractInfo])

  const handleInputChange = (field: keyof ContractInfo, value: string | number | undefined) => {
    setFormValues(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formValues.startDate) {
      newErrors.startDate = 'Start date is required'
    }
    
    // Validate based on rate type
    if (!formValues.rateType) {
      newErrors.rateType = 'Rate type is required'
    } else if (formValues.rateType === 'hourly') {
      if (!formValues.hourlyRate || formValues.hourlyRate <= 0) {
        newErrors.hourlyRate = 'Valid hourly rate is required'
      }
    } else if (formValues.rateType === 'fixed') {
      if (!formValues.fixedIncome || formValues.fixedIncome <= 0) {
        newErrors.fixedIncome = 'Valid fixed income is required'
      }
    }
    
    if (!formValues.positionTitle.trim()) {
      newErrors.positionTitle = 'Position title is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setIsSaving(true)

    try {
      // Prepare update payload based on rate type
      // ✅ Reporting manager is now managed in Access Control tab only
      const updatePayload: any = {
        rate_type: formValues.rateType,
      }

      // Add rate fields based on type
      if (formValues.rateType === 'hourly') {
        updatePayload.hourly_rate = formValues.hourlyRate
        updatePayload.overtime_rate = formValues.overtimeRate || null
        updatePayload.monthly_rate = null // Clear fixed income if switching to hourly
      } else if (formValues.rateType === 'fixed') {
        updatePayload.monthly_rate = formValues.fixedIncome
        updatePayload.hourly_rate = null // Clear hourly if switching to fixed
        updatePayload.overtime_rate = null // Clear overtime if switching to fixed
      }

      // Call the API to update employee contract info
      const response = await fetch(`/api/admin/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update contract info')
      }

      // Update parent state
      onUpdateContractInfo?.(formValues)
      
      // Exit edit mode
      setIsEditing(false)
      
      // Show success toast
      onToast?.({
        title: 'Contract information updated successfully',
        variant: 'success'
      })
    } catch (error) {
      console.error('Error saving contract info:', error)
      onToast?.({
        title: error instanceof Error ? error.message : 'Failed to update contract info',
        variant: 'error'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormValues(contractInfo)
    setErrors({})
    setIsEditing(false)
  }

  // View Mode - Read-only display
  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Contract Information</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
          {/* Rate Type */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Rate Type</span>
            </div>
            <span className="text-sm font-medium text-slate-900 mt-1 sm:mt-0 capitalize">
              {formValues.rateType}
            </span>
          </div>

          {/* Start Date */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Start Date</span>
            </div>
            <span className="text-sm font-medium text-slate-900 mt-1 sm:mt-0">
              {formValues.startDate}
            </span>
          </div>

          {/* End Date */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">End Date</span>
            </div>
            {formValues.endDate ? (
              <span className="text-sm font-medium text-slate-900 mt-1 sm:mt-0">
                {formValues.endDate}
              </span>
            ) : (
              <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full mt-1 sm:mt-0">
                Ongoing
              </span>
            )}
          </div>

          {/* Hourly Rate - Only show when rate type is hourly */}
          {formValues.rateType === 'hourly' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-500">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">Hourly Rate</span>
              </div>
              <span className="text-sm font-medium text-slate-900 mt-1 sm:mt-0">
                ${formValues.hourlyRate.toFixed(2)}/hour
              </span>
            </div>
          )}

          {/* Overtime Rate - Only show when rate type is hourly */}
          {formValues.rateType === 'hourly' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-500">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Overtime Rate</span>
              </div>
              <span className="text-sm font-medium text-slate-900 mt-1 sm:mt-0">
                {formValues.overtimeRate ? `$${formValues.overtimeRate.toFixed(2)}/hour` : 'N/A'}
              </span>
            </div>
          )}

          {/* Fixed Income - Only show when rate type is fixed */}
          {formValues.rateType === 'fixed' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-500">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">Fixed Income</span>
              </div>
              <span className="text-sm font-medium text-slate-900 mt-1 sm:mt-0">
                ${(formValues.fixedIncome || 0).toLocaleString()}/month
              </span>
            </div>
          )}

          {/* Position */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <Briefcase className="w-4 h-4" />
              <span className="text-xs">Position</span>
            </div>
            <span className="text-sm font-medium text-slate-900 mt-1 sm:mt-0">
              {formValues.positionTitle}
            </span>
          </div>

          {/* Department */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Building2 className="w-4 h-4" />
              <span className="text-xs">Department</span>
            </div>
            <span className="text-sm font-medium text-slate-900 mt-1 sm:mt-0">
              {formValues.department}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Edit Mode - Form inputs
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Contract Information</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-4">
        {/* Rate Type */}
        <Combobox
          label="Rate Type"
          required
          placeholder="Select rate type"
          value={formValues.rateType}
          onChange={(value) => handleInputChange('rateType', value as 'hourly' | 'fixed')}
          options={[
            { value: 'hourly', label: 'Hourly', sublabel: 'Pay by the hour with overtime' },
            { value: 'fixed', label: 'Fixed', sublabel: 'Monthly fixed payment' },
          ]}
          errorMessage={errors.rateType}
          clearable={false}
        />

        {/* Start Date / End Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Start Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={formValues.startDate ? new Date(formValues.startDate).toISOString().split('T')[0] : ''}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className={`w-full pl-10 pr-3 h-11 rounded-xl border ${errors.startDate ? 'border-red-300' : 'border-slate-200'} text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent`}
              />
            </div>
            {errors.startDate && (
              <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={formValues.endDate ? new Date(formValues.endDate).toISOString().split('T')[0] : ''}
                onChange={(e) => handleInputChange('endDate', e.target.value || undefined)}
                placeholder="dd / mm / yyyy"
                className="w-full pl-10 pr-3 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Leave empty for ongoing contracts</p>
          </div>
        </div>

        {/* Conditional Fields - Hourly Rate & Overtime Rate (Show when rate type is hourly) */}
        {formValues.rateType === 'hourly' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Hourly Rate <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formValues.hourlyRate}
                  onChange={(e) => handleInputChange('hourlyRate', parseFloat(e.target.value) || 0)}
                  className={`w-full pl-10 pr-3 h-11 rounded-xl border ${errors.hourlyRate ? 'border-red-300' : 'border-slate-200'} text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent`}
                />
              </div>
              {errors.hourlyRate && (
                <p className="text-xs text-red-500 mt-1">{errors.hourlyRate}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Overtime Rate
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formValues.overtimeRate || ''}
                  onChange={(e) => handleInputChange('overtimeRate', parseFloat(e.target.value) || undefined)}
                  placeholder="Optional"
                  className="w-full pl-10 pr-3 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Conditional Field - Fixed Income (Show when rate type is fixed) */}
        {formValues.rateType === 'fixed' && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Fixed Income <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={formValues.fixedIncome || ''}
                onChange={(e) => handleInputChange('fixedIncome', parseFloat(e.target.value) || undefined)}
                placeholder="Monthly fixed payment"
                className={`w-full pl-10 pr-3 h-11 rounded-xl border ${errors.fixedIncome ? 'border-red-300' : 'border-slate-200'} text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent`}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Monthly fixed payment</p>
            {errors.fixedIncome && (
              <p className="text-xs text-red-500 mt-1">{errors.fixedIncome}</p>
            )}
          </div>
        )}

        {/* Yellow Warning Note */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Rate changes apply to future invoices only
          </p>
        </div>

        {/* Position */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Position Title <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={formValues.positionTitle}
              onChange={(e) => handleInputChange('positionTitle', e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className={`w-full pl-10 pr-3 h-11 rounded-xl border ${errors.positionTitle ? 'border-red-300' : 'border-slate-200'} text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent`}
            />
          </div>
          {errors.positionTitle && (
            <p className="text-xs text-red-500 mt-1">{errors.positionTitle}</p>
          )}
        </div>

        {/* Department */}
        <Combobox
          label="Department"
          placeholder="Select department"
          value={formValues.department}
          onChange={(value) => handleInputChange('department', value)}
          options={DEPARTMENTS.map(dept => ({
            value: dept,
            label: dept,
          }))}
          clearable={false}
        />
      </div>
    </div>
  )
}
