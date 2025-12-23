'use client'

import { useState, useEffect } from 'react'
import { Pencil, Save, X, CheckCircle2, Shield, Users, User } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'

// Role types
export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE'

// Role display names
const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Contractor / Employee',
}

// Role permissions
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  EMPLOYEE: [
    'Submit hours and view own invoices',
    'Update personal profile information',
    'View own submission history',
    'No access to team or admin features',
  ],
  MANAGER: [
    'View team submissions',
    'Approve / reject submissions (with reason)',
    'View team invoices (read-only)',
    'No admin controls',
  ],
  ADMIN: [
    'Full Admin Portal access',
    'Manage users and access',
    'Process payments',
    'Override statuses',
    'View all submissions and invoices',
  ],
}

interface Manager {
  id: string
  name: string
  email?: string
}

interface AccessControlData {
  role: UserRole
  reportingManagerId: string | null
  reportingManagerName: string | null
}

interface EmployeeAccessControlTabProps {
  employeeId: string
  currentRole: UserRole
  currentManagerId: string | null
  currentManagerName: string | null
  managers: Manager[]
  onToast?: (options: { title: string; variant: 'success' | 'error' }) => void
  onRoleUpdate?: (role: UserRole, managerId: string | null, managerName: string | null) => void
}

export function EmployeeAccessControlTab({
  employeeId,
  currentRole,
  currentManagerId,
  currentManagerName,
  managers,
  onToast,
  onRoleUpdate,
}: EmployeeAccessControlTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form state
  const [formValues, setFormValues] = useState<AccessControlData>({
    role: currentRole,
    reportingManagerId: currentManagerId,
    reportingManagerName: currentManagerName,
  })
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Sync form values when props change
  useEffect(() => {
    setFormValues({
      role: currentRole,
      reportingManagerId: currentManagerId,
      reportingManagerName: currentManagerName,
    })
  }, [currentRole, currentManagerId, currentManagerName])

  // Check if reporting manager is required
  const isManagerRequired = formValues.role === 'EMPLOYEE'

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (isManagerRequired && !formValues.reportingManagerId) {
      newErrors.reportingManager = 'Reporting manager is required for Contractor / Employee role'
    }
    
    // Prevent assigning self as manager
    if (formValues.reportingManagerId === employeeId) {
      newErrors.reportingManager = 'Cannot assign self as reporting manager'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle role change
  const handleRoleChange = (newRole: string) => {
    const role = newRole as UserRole
    setFormValues(prev => ({
      ...prev,
      role,
      // Clear manager if not required
      reportingManagerId: role === 'EMPLOYEE' ? prev.reportingManagerId : null,
      reportingManagerName: role === 'EMPLOYEE' ? prev.reportingManagerName : null,
    }))
    
    // Clear error when role changes
    if (errors.reportingManager) {
      setErrors(prev => ({ ...prev, reportingManager: '' }))
    }
  }

  // Handle manager change
  const handleManagerChange = (managerId: string) => {
    const manager = managers.find(m => m.id === managerId)
    setFormValues(prev => ({
      ...prev,
      reportingManagerId: managerId || null,
      reportingManagerName: manager?.name || null,
    }))
    
    // Clear error
    if (errors.reportingManager) {
      setErrors(prev => ({ ...prev, reportingManager: '' }))
    }
  }

  // Cancel edit
  const handleCancel = () => {
    setFormValues({
      role: currentRole,
      reportingManagerId: currentManagerId,
      reportingManagerName: currentManagerName,
    })
    setErrors({})
    setIsEditing(false)
  }

  // Save changes
  const handleSave = async () => {
    if (!validateForm()) return
    
    setIsSaving(true)
    
    try {
      const response = await fetch(`/api/admin/employees/${employeeId}/access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: formValues.role,
          reporting_manager_id: formValues.reportingManagerId,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update access')
      }
      
      // Notify parent of changes
      onRoleUpdate?.(formValues.role, formValues.reportingManagerId, formValues.reportingManagerName)
      
      onToast?.({
        title: 'Access updated.',
        variant: 'success',
      })
      
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating access:', error)
      onToast?.({
        title: error instanceof Error ? error.message : 'Unable to update access.',
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Filter out current employee from managers list
  const availableManagers = managers.filter(m => m.id !== employeeId)

  // Role options for combobox
  const roleOptions = [
    { value: 'ADMIN', label: 'Admin', sublabel: 'Full system access' },
    { value: 'MANAGER', label: 'Manager', sublabel: 'Team management access' },
    { value: 'EMPLOYEE', label: 'Contractor / Employee', sublabel: 'Standard access' },
  ]

  // Manager options for combobox
  const managerOptions = [
    { value: '', label: 'Select a manager' },
    ...availableManagers.map(m => ({
      value: m.id,
      label: m.name,
      sublabel: m.email,
    })),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Access Control</h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Main Card */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-6">
        {/* User Role Section */}
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            User Role
          </label>
          {isEditing ? (
            <Combobox
              placeholder="Select role"
              value={formValues.role}
              onChange={handleRoleChange}
              options={roleOptions}
              clearable={false}
            />
          ) : (
            <p className="text-base font-semibold text-slate-900">
              {ROLE_DISPLAY_NAMES[formValues.role]}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Reporting Manager Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
              Reporting Manager
            </label>
            {isManagerRequired && (
              <span className="text-xs font-medium text-red-500">Required</span>
            )}
          </div>
          
          {isEditing ? (
            isManagerRequired ? (
              <div>
                <Combobox
                  placeholder="Select manager"
                  value={formValues.reportingManagerId || ''}
                  onChange={handleManagerChange}
                  options={managerOptions}
                  errorMessage={errors.reportingManager}
                  emptyMessage="No managers available"
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">
                Not applicable for {ROLE_DISPLAY_NAMES[formValues.role]} role
              </p>
            )
          ) : (
            <p className="text-base font-semibold text-slate-900">
              {formValues.reportingManagerName || (
                isManagerRequired ? (
                  <span className="text-red-500 font-normal">Not assigned</span>
                ) : (
                  <span className="text-slate-400 font-normal">—</span>
                )
              )}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Role Permissions Section */}
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-4">Role Permissions</h4>
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            {ROLE_PERMISSIONS[formValues.role].map((permission, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700">{permission}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Helper text */}
      {isEditing && (
        <p className="text-xs text-slate-500 text-center">
          Changes will take effect on the user's next refresh or login.
        </p>
      )}
    </div>
  )
}

