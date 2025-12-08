'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  Briefcase, 
  Building2, 
  User, 
  Pencil, 
  Save,
  ChevronDown
} from 'lucide-react'
import { ContractInfo } from './types'

interface EmployeeContractInfoTabProps {
  contractInfo: ContractInfo
  employeeId: string
  onUpdateContractInfo?: (info: ContractInfo) => void
  managers?: { id: string; name: string }[]
  onToast?: (options: { title: string; variant: 'success' | 'error' }) => void
  onManagerUpdate?: (managerId: string | null, managerName: string | null) => void
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
  onManagerUpdate
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
    if (!formValues.hourlyRate || formValues.hourlyRate <= 0) {
      newErrors.hourlyRate = 'Valid hourly rate is required'
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
      // Find the selected manager's ID from the name
      const selectedManager = managers.find(m => m.name === formValues.reportingManager)
      const managerId = selectedManager?.id || formValues.reportingManagerId || null

      // Call the API to update employee info (including manager assignment)
      const response = await fetch(`/api/admin/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporting_manager_id: managerId,
          hourly_rate: formValues.hourlyRate,
          // Note: other contract fields would be updated via team_members table in a full implementation
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update contract info')
      }

      // Update the form values with the manager ID
      const updatedFormValues = {
        ...formValues,
        reportingManagerId: managerId || undefined
      }

      // Update parent state
      onUpdateContractInfo?.(updatedFormValues)
      
      // Notify parent about manager change (for Employee Directory sync)
      if (managerId !== contractInfo.reportingManagerId) {
        onManagerUpdate?.(managerId, formValues.reportingManager || null)
      }
      
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

          {/* Hourly Rate */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Hourly Rate</span>
            </div>
            <span className="text-sm font-medium text-slate-900 mt-1 sm:mt-0">
              ${formValues.hourlyRate.toFixed(2)}/hour
            </span>
          </div>

          {/* Overtime Rate */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Overtime Rate</span>
            </div>
            <span className="text-sm font-medium text-slate-900 mt-1 sm:mt-0">
              {formValues.overtimeRate ? `$${formValues.overtimeRate.toFixed(2)}/hour` : 'N/A'}
            </span>
          </div>

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <Building2 className="w-4 h-4" />
              <span className="text-xs">Department</span>
            </div>
            <span className="text-sm font-medium text-slate-900 mt-1 sm:mt-0">
              {formValues.department}
            </span>
          </div>

          {/* Reporting Manager */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-slate-500">
              <User className="w-4 h-4" />
              <span className="text-xs">Reporting Manager</span>
            </div>
            <span className="text-sm font-medium text-slate-900 mt-1 sm:mt-0">
              {formValues.reportingManager}
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

        {/* Hourly Rate / Overtime Rate */}
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
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Department
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={formValues.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent appearance-none bg-white"
            >
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Reporting Manager */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Reporting Manager
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            {managers.length > 0 ? (
              <>
                <select
                  value={formValues.reportingManagerId || ''}
                  onChange={(e) => {
                    const selectedManager = managers.find(m => m.id === e.target.value)
                    setFormValues(prev => ({
                      ...prev,
                      reportingManagerId: e.target.value || undefined,
                      reportingManager: selectedManager?.name || ''
                    }))
                  }}
                  className="w-full pl-10 pr-10 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">Select manager</option>
                  {managers.map(manager => (
                    <option key={manager.id} value={manager.id}>{manager.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </>
            ) : (
              <input
                type="text"
                value={formValues.reportingManager}
                onChange={(e) => handleInputChange('reportingManager', e.target.value)}
                placeholder="Manager name"
                className="w-full pl-10 pr-3 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
