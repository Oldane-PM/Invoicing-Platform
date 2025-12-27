'use client'

import { CheckCircle, Clock, Lock, AlertCircle } from 'lucide-react'
import type { OnboardingProgress as OnboardingProgressType, OnboardingApprovalStatus } from '@/lib/data/onboarding'

interface OnboardingProgressProps {
  progress: OnboardingProgressType
  approvalStatus: OnboardingApprovalStatus
  rejectionReason?: string | null
}

export function OnboardingProgress({ progress, approvalStatus, rejectionReason }: OnboardingProgressProps) {
  const steps = [
    {
      id: 1,
      title: 'Submit Request',
      description: 'Account created successfully',
      completed: progress.step1_submit_request,
      isWaiting: false,
    },
    {
      id: 2,
      title: 'Update Personal Information',
      description: 'Complete your profile details',
      completed: progress.step2_personal_info,
      isWaiting: false,
    },
    {
      id: 3,
      title: 'Update Banking Information',
      description: 'Add payment details for payroll',
      completed: progress.step3_banking_info,
      isWaiting: false,
    },
    {
      id: 4,
      title: 'Admin Approval',
      description: 'Waiting for administrator review',
      completed: progress.step4_admin_approval,
      isWaiting: approvalStatus === 'WAITING',
      isRejected: approvalStatus === 'REJECTED',
      rejectionMessage: rejectionReason,
    },
    {
      id: 5,
      title: 'Contract Information Updated',
      description: 'Contract details and terms assigned',
      completed: progress.step5_contract_complete,
      isWaiting: false,
    },
    {
      id: 6,
      title: 'Manager Assigned',
      description: 'Your reporting manager has been set',
      completed: progress.step6_manager_assigned,
      isWaiting: false,
    },
  ]

  const getStepStatus = (step: typeof steps[0]) => {
    if (step.completed) {
      return { label: 'Completed', color: 'text-emerald-600', bgColor: 'bg-emerald-50' }
    }
    if (step.isRejected) {
      return { label: 'Action Required', color: 'text-red-600', bgColor: 'bg-red-50' }
    }
    if (step.isWaiting) {
      return { label: 'Waiting', color: 'text-amber-600', bgColor: 'bg-amber-50' }
    }
    return { label: 'Not Started', color: 'text-gray-400', bgColor: 'bg-gray-50' }
  }

  const getStepIcon = (step: typeof steps[0]) => {
    if (step.completed) {
      return <CheckCircle className="w-10 h-10 text-emerald-500" />
    }
    if (step.isRejected) {
      return (
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
      )
    }
    if (step.isWaiting) {
      return (
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <Clock className="w-6 h-6 text-amber-600" />
        </div>
      )
    }
    return (
      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
        <Lock className="w-5 h-5 text-gray-400" />
      </div>
    )
  }

  const progressPercentage = (progress.completed_steps / progress.total_steps) * 100

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Onboarding Progress</h2>
        <span className="text-2xl font-bold text-indigo-600">
          {progress.completed_steps}/{progress.total_steps}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Complete all steps to unlock timesheet submissions.
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step)
          const isLastStep = index === steps.length - 1

          return (
            <div key={step.id} className="relative">
              {/* Connector Line */}
              {!isLastStep && (
                <div
                  className={`absolute left-5 top-12 w-0.5 h-8 ${
                    step.completed ? 'bg-emerald-200' : 'bg-gray-200'
                  }`}
                />
              )}

              {/* Step Card */}
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">{getStepIcon(step)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-slate-900">
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {step.description}
                      </p>

                      {/* Rejection Message */}
                      {step.isRejected && step.rejectionMessage && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-red-800">
                                Rejected by Administrator
                              </p>
                              <p className="text-sm text-red-700 mt-1">
                                {step.rejectionMessage}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Waiting Message */}
                      {step.isWaiting && !step.isRejected && (
                        <div className="mt-2 flex items-center gap-2 text-amber-600">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">Waiting on Administrator action</span>
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${status.color} ${status.bgColor}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

