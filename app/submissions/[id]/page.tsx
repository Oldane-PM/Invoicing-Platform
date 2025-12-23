'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Calendar, Clock, DollarSign, FileText, User } from 'lucide-react'
import { format } from 'date-fns'
import { getStatusDisplay, getEmployeeStatusLabel } from '@/lib/submission-status'
import type { SubmissionStatus } from '@/types/domain'

interface SubmissionDetail {
  id: string
  employee_id: string
  employee_name: string
  employee_email: string
  date: string
  hours_submitted: number
  overtime_hours: number
  description: string
  overtime_description: string
  status: SubmissionStatus
  created_at: string
  updated_at: string
  submission_date: string
  hourly_rate: number | null
}

export default function SubmissionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('No submission ID provided')
      setLoading(false)
      return
    }

    fetchSubmissionDetails()
  }, [id])

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // Try to fetch submission details from the API
      const response = await fetch(`/api/submissions/${id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Submission not found')
        } else {
          setError('Failed to load submission details')
        }
        return
      }

      const data = await response.json()
      setSubmission(data.submission)
    } catch (err) {
      console.error('Error fetching submission:', err)
      setError('An error occurred while loading the submission')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading submission...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Submission</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Submission not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-indigo-600 hover:text-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const statusDisplay = getStatusDisplay(submission.status)
  const statusLabel = getEmployeeStatusLabel(submission.status)
  const totalHours = submission.hours_submitted + submission.overtime_hours
  const totalAmount = totalHours * (submission.hourly_rate || 0)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Submission Details</h1>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Status Banner */}
          <div className={`px-6 py-4 ${statusDisplay.bgClass}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${statusDisplay.iconBg} flex items-center justify-center`}>
                  <statusDisplay.Icon className={`w-5 h-5 ${statusDisplay.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className={`font-semibold ${statusDisplay.textColor}`}>{statusLabel}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Submission ID</p>
                <p className="text-xs font-mono text-gray-700">{submission.id.slice(0, 8)}...</p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-6 space-y-6">
            {/* Employee Info */}
            <div className="pb-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                Employee Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{submission.employee_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{submission.employee_email}</p>
                </div>
              </div>
            </div>

            {/* Time Details */}
            <div className="pb-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600" />
                Time Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Regular Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{submission.hours_submitted}h</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Overtime Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{submission.overtime_hours}h</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm text-indigo-600 mb-1">Total Hours</p>
                  <p className="text-2xl font-bold text-indigo-900">{totalHours}h</p>
                </div>
              </div>
            </div>

            {/* Descriptions */}
            <div className="pb-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                Description
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Work Description</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {submission.description || 'No description provided'}
                    </p>
                  </div>
                </div>
                {submission.overtime_hours > 0 && submission.overtime_description && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Overtime Description</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {submission.overtime_description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Details */}
            {submission.hourly_rate && (
              <div className="pb-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gray-600" />
                  Financial Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Hourly Rate</p>
                    <p className="text-xl font-semibold text-gray-900">
                      ${submission.hourly_rate.toFixed(2)}/hr
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-xl font-semibold text-green-600">
                      ${totalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Dates */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                Timeline
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Submission Date</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(submission.date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created At</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(submission.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(submission.updated_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

