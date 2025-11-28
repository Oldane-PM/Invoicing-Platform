'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { User, Clock, X, Trash2, Paperclip, ChevronUp, ChevronDown, Calendar } from 'lucide-react'
import { format, getDaysInMonth, lastDayOfMonth, startOfMonth } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import type { Invoice } from '@/types/domain'

interface Submission {
  id: string
  month: string
  date: string
  hoursSubmitted: number
  overtimeHours: number | null
  description: string
  overtimeDescription: string | null
  status: 'submitted' | 'approved' | 'payment done'
  invoiceUrl: string | null
  invoiceId: string | null
}

interface Employee {
  name: string
  lastLogin: string
}

export default function Dashboard() {
  const router = useRouter()
  const [employee, setEmployee] = useState<Employee>({
    name: 'Sarah Johnson',
    lastLogin: 'Nov 26, 2024, 9:30 AM',
  })
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const datePickerRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    date: '',
    hoursSubmitted: 0,
    overtimeHours: 0,
    description: '',
    overtimeDescription: '',
  })
  const [hoursFocused, setHoursFocused] = useState(false)
  const [overtimeFocused, setOvertimeFocused] = useState(false)

  useEffect(() => {
    // Load submissions from localStorage
    const stored = localStorage.getItem('submissions')
    if (stored) {
      setSubmissions(JSON.parse(stored))
    } else {
      // Initialize with sample data
      const sampleData: Submission[] = [
        {
          id: '1',
          month: 'Oct 2024',
          date: '2024-10-31',
          hoursSubmitted: 160,
          overtimeHours: 10,
          description: 'Project development work',
          overtimeDescription: 'Weekend work',
          status: 'approved',
          invoiceUrl: null,
          invoiceId: null,
        },
        {
          id: '2',
          month: 'Sep 2024',
          date: '2024-09-30',
          hoursSubmitted: 152,
          overtimeHours: null,
          description: 'Client project work',
          overtimeDescription: null,
          status: 'payment done',
          invoiceUrl: '/invoices/2',
          invoiceId: '2',
        },
        {
          id: '3',
          month: 'Aug 2024',
          date: '2024-08-31',
          hoursSubmitted: 168,
          overtimeHours: 8,
          description: 'Platform maintenance',
          overtimeDescription: 'Emergency fixes',
          status: 'payment done',
          invoiceUrl: '/invoices/3',
          invoiceId: '3',
        },
      ]
      setSubmissions(sampleData)
      localStorage.setItem('submissions', JSON.stringify(sampleData))
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return 'dd / mm / yyyy'
    return format(date, 'dd / MM / yyyy')
  }

  const getLastDayOfMonth = (date: Date) => {
    return lastDayOfMonth(date)
  }

  const handleDateSelect = (day: number) => {
    const lastDay = getLastDayOfMonth(currentMonth)
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    setSelectedDate(selected)
    setFormData({ ...formData, date: format(selected, 'yyyy-MM-dd') })
    setShowDatePicker(false)
  }

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const incrementHours = () => {
    setFormData({ ...formData, hoursSubmitted: formData.hoursSubmitted + 1 })
  }

  const decrementHours = () => {
    if (formData.hoursSubmitted > 0) {
      setFormData({ ...formData, hoursSubmitted: formData.hoursSubmitted - 1 })
    }
  }

  const incrementOvertime = () => {
    setFormData({ ...formData, overtimeHours: formData.overtimeHours + 1 })
  }

  const decrementOvertime = () => {
    if (formData.overtimeHours > 0) {
      setFormData({ ...formData, overtimeHours: formData.overtimeHours - 1 })
    }
  }

  const generateInvoice = (submission: Submission) => {
    // Get employee profile from localStorage
    const profileData = localStorage.getItem('employeeProfile')
    if (!profileData) {
      alert('Please complete your employee profile first')
      return null
    }

    const profile = JSON.parse(profileData)
    
    // Check if profile has required data (at least hourlyRate)
    if (!profile.project?.hourlyRate || profile.project.hourlyRate === '0' || profile.project.hourlyRate === '') {
      alert('Please complete your employee profile first')
      return null
    }
    const invoiceId = uuidv4()
    
    // Calculate total hours and amount
    const totalHours = submission.hoursSubmitted + (submission.overtimeHours || 0)
    const hourlyRate = parseFloat(profile.project?.hourlyRate || '0')
    const totalAmount = totalHours * hourlyRate

    const invoice: Invoice = {
      id: invoiceId,
      invoiceNumber: `INV-${String(submissions.length + 1).padStart(4, '0')}`,
      date: format(new Date(), 'MMMM dd, yyyy'),
      dueDate: '15 days from the Invoiced date.',
      from: {
        name: profile.personal?.fullName || 'Sarah Johnson',
        address: profile.personal?.address || '',
        state: profile.personal?.stateParish || '',
        country: profile.personal?.country || '',
        email: profile.personal?.email || '',
      },
      billTo: {
        company: 'Intelligent Business Platforms',
        address: '12020 Sunrise Valley Dr. Reston, VA, 20191, United States',
      },
      items: [
        {
          description: submission.description,
          hours: submission.hoursSubmitted,
          rate: hourlyRate,
          amount: submission.hoursSubmitted * hourlyRate,
        },
        ...(submission.overtimeHours && submission.overtimeHours > 0
          ? [
              {
                description: submission.overtimeDescription || 'Overtime hours',
                hours: submission.overtimeHours,
                rate: hourlyRate,
                amount: submission.overtimeHours * hourlyRate,
              },
            ]
          : []),
      ],
      total: totalAmount,
      banking: {
        bankName: profile.banking?.bankName || '',
        bankAddress: profile.banking?.bankAddress || '',
        swiftCode: profile.banking?.swiftCode || '',
        abaWireRouting: profile.banking?.abaWireRouting || '',
        accountType: profile.banking?.accountType || '',
        currency: profile.banking?.currency || '',
        accountNumber: profile.banking?.accountNumber || '',
      },
      submissionId: submission.id,
    }

    // Save invoice (PDF will be generated on-demand when opened)
    const invoices = JSON.parse(localStorage.getItem('invoices') || '[]')
    invoices.push(invoice)
    localStorage.setItem('invoices', JSON.stringify(invoices))

    return invoiceId
  }

  const handleOpenPDF = async (invoiceId: string | null) => {
    if (!invoiceId) return
    
    try {
      // Get invoice from localStorage
      const invoices = JSON.parse(localStorage.getItem('invoices') || '[]')
      const invoice = invoices.find((inv: Invoice) => inv.id === invoiceId)
      
      if (!invoice) {
        alert('Invoice not found')
        return
      }
      
      // Call API to generate PDF
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoice),
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }
      
      // Create blob from response
      const blob = await response.blob()
      const pdfUrl = URL.createObjectURL(blob)
      
      // Open PDF in new tab
      window.open(pdfUrl, '_blank')
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  const handleSubmitHours = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.date) {
      alert('Please select a date')
      return
    }

    if (formData.overtimeHours > 0 && !formData.overtimeDescription.trim()) {
      alert('Please provide overtime description when submitting overtime hours')
      return
    }

    const selectedDateObj = new Date(formData.date)
    const newSubmission: Submission = {
      id: uuidv4(),
      month: format(selectedDateObj, 'MMM yyyy'),
      date: formData.date,
      hoursSubmitted: formData.hoursSubmitted,
      overtimeHours: formData.overtimeHours > 0 ? formData.overtimeHours : null,
      description: formData.description,
      overtimeDescription: formData.overtimeHours > 0 ? formData.overtimeDescription : null,
      status: 'submitted',
      invoiceUrl: null,
      invoiceId: null,
    }

    // Generate invoice (PDF will be generated on-demand when opened)
    const invoiceId = generateInvoice(newSubmission)
    if (invoiceId) {
      newSubmission.invoiceId = invoiceId
      newSubmission.invoiceUrl = `#pdf-${invoiceId}` // Placeholder URL
    }

    const updated = [newSubmission, ...submissions]
    setSubmissions(updated)
    localStorage.setItem('submissions', JSON.stringify(updated))
    setShowSubmitModal(false)
    setFormData({
      date: '',
      hoursSubmitted: 0,
      overtimeHours: 0,
      description: '',
      overtimeDescription: '',
    })
    setSelectedDate(null)
    setHoursFocused(false)
    setOvertimeFocused(false)

    // Navigate to invoice if generated
    if (invoiceId) {
      router.push(`/invoices/${invoiceId}`)
    }
  }

  const handleDelete = (id: string) => {
    const submission = submissions.find((s) => s.id === id)
    if (submission && submission.status === 'submitted') {
      if (confirm('Are you sure you want to delete this submission?')) {
        const updated = submissions.filter((s) => s.id !== id)
        setSubmissions(updated)
        localStorage.setItem('submissions', JSON.stringify(updated))
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-gray-100 text-gray-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'payment done':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStatus = (status: string) => {
    return status
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const renderCalendar = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = new Date(year, month, 1).getDay()
    const lastDay = getLastDayOfMonth(currentMonth)
    const lastDayNumber = lastDay.getDate()

    const days = []
    const prevMonthDays = getDaysInMonth(new Date(year, month - 1, 1))

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, isLastDay: false })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        isLastDay: day === lastDayNumber,
      })
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ day, isCurrentMonth: false, isLastDay: false })
    }

    return days
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Welcome, {employee.name}
            </h1>
            <p className="text-gray-500 text-sm">Last login: {employee.lastLogin}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/profile')}
              className="flex items-center space-x-2 px-4 py-2 border-2 border-primary-500 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors font-medium"
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              <Clock className="w-5 h-5" />
              <span>Submit Hours</span>
            </button>
          </div>
        </div>

        {/* Recent Submissions Table */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Submissions</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Month / Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Hours Submitted</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Overtime Hours</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No submissions yet. Click "Submit Hours" to create your first submission.
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission) => (
                    <tr key={submission.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4 text-gray-900">{submission.month}</td>
                      <td className="py-4 px-4 text-gray-700">{submission.hoursSubmitted}</td>
                      <td className="py-4 px-4 text-gray-700">
                        {submission.overtimeHours !== null ? submission.overtimeHours : '—'}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                            submission.status
                          )}`}
                        >
                          {formatStatus(submission.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {submission.invoiceId ? (
                          <button
                            onClick={() => handleOpenPDF(submission.invoiceId)}
                            className="inline-flex items-center text-primary-600 hover:text-primary-700"
                          >
                            <Paperclip className="w-4 h-4 mr-1" />
                            <span className="text-sm">View PDF</span>
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {submission.status === 'submitted' ? (
                          <button
                            onClick={() => handleDelete(submission.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete submission"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Submit Hours Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Submit Hours</h2>
              <button
                onClick={() => {
                  setShowSubmitModal(false)
                  setFormData({
                    date: '',
                    hoursSubmitted: 0,
                    overtimeHours: 0,
                    description: '',
                    overtimeDescription: '',
                  })
                  setSelectedDate(null)
                  setShowDatePicker(false)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitHours} className="space-y-4">
              {/* Date of Work / Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Work / Month <span className="text-red-500">*</span>
                </label>
                <div className="relative" ref={datePickerRef}>
                  <input
                    type="text"
                    readOnly
                    required
                    value={formatDateDisplay(selectedDate)}
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
                    placeholder="dd / mm / yyyy"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  
                  {showDatePicker && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 p-4 w-80">
                      <div className="flex justify-between items-center mb-4">
                        <button
                          type="button"
                          onClick={() => handleMonthChange('prev')}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          ←
                        </button>
                        <div className="font-semibold">
                          {format(currentMonth, 'MMMM yyyy')}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleMonthChange('next')}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          →
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <div
                            key={day}
                            className={`text-center text-sm font-medium py-2 ${
                              day === 'Sun' || day === 'Sat' ? 'text-red-500' : 'text-gray-700'
                            }`}
                          >
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {renderCalendar().map((item, idx) => {
                          const isLastDay = item.isLastDay && item.isCurrentMonth
                          const isSelected = selectedDate && 
                            selectedDate.getDate() === item.day &&
                            selectedDate.getMonth() === currentMonth.getMonth() &&
                            selectedDate.getFullYear() === currentMonth.getFullYear()
                          
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => isLastDay && handleDateSelect(item.day)}
                              disabled={!isLastDay}
                              className={`p-2 text-sm rounded transition-colors ${
                                isSelected
                                  ? 'bg-primary-600 text-white font-semibold'
                                  : isLastDay
                                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200 font-semibold cursor-pointer'
                                  : item.isCurrentMonth
                                  ? 'text-gray-400 cursor-not-allowed opacity-50'
                                  : 'text-gray-300 cursor-not-allowed opacity-30'
                              }`}
                              title={isLastDay ? 'Select last day of month' : 'Only last day of month can be selected'}
                            >
                              {item.day}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDatePicker(false)
                          setSelectedDate(null)
                          setFormData({ ...formData, date: '' })
                        }}
                        className="mt-3 w-full px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Hours Submitted */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hours Submitted <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    value={hoursFocused && formData.hoursSubmitted === 0 ? '' : formData.hoursSubmitted}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                      setFormData({ ...formData, hoursSubmitted: value })
                    }}
                    onFocus={() => {
                      setHoursFocused(true)
                    }}
                    onBlur={(e) => {
                      setHoursFocused(false)
                      // If empty on blur, set to 0
                      if (e.target.value === '') {
                        setFormData({ ...formData, hoursSubmitted: 0 })
                      }
                    }}
                    className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g. 160"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                    <button
                      type="button"
                      onClick={incrementHours}
                      className="p-1 hover:bg-gray-100 rounded-t"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={decrementHours}
                      className="p-1 hover:bg-gray-100 rounded-b border-t"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                  placeholder="Enter description"
                />
              </div>

              {/* Overtime Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overtime Hours (optional)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={overtimeFocused && formData.overtimeHours === 0 ? '' : formData.overtimeHours}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                      setFormData({ ...formData, overtimeHours: value })
                    }}
                    onFocus={() => {
                      setOvertimeFocused(true)
                    }}
                    onBlur={(e) => {
                      setOvertimeFocused(false)
                      // If empty on blur, set to 0
                      if (e.target.value === '') {
                        setFormData({ ...formData, overtimeHours: 0 })
                      }
                    }}
                    className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g. 12"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                    <button
                      type="button"
                      onClick={incrementOvertime}
                      className="p-1 hover:bg-gray-100 rounded-t"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={decrementOvertime}
                      className="p-1 hover:bg-gray-100 rounded-b border-t"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Overtime Description - Only show if overtime hours > 0 */}
              {formData.overtimeHours > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overtime Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required={formData.overtimeHours > 0}
                    value={formData.overtimeDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, overtimeDescription: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                    placeholder="Enter overtime description"
                  />
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubmitModal(false)
                    setFormData({
                      date: '',
                      hoursSubmitted: 0,
                      overtimeHours: 0,
                      description: '',
                      overtimeDescription: '',
                    })
                    setSelectedDate(null)
                    setShowDatePicker(false)
                    setHoursFocused(false)
                    setOvertimeFocused(false)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Submit Hours
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
