'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  User,
  Clock,
  X,
  Trash2,
  Paperclip,
  ChevronUp,
  ChevronDown,
  Calendar,
  LogOut,
  MoreHorizontal,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { format, getDaysInMonth, lastDayOfMonth, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameMonth, isWithinInterval, startOfDay, endOfDay, isSameDay } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import type { Invoice, SubmissionStatus } from '@/types/domain'
import { getEmployeeSubmissions } from '@/lib/supabase/queries/submissions'
import { transformSubmissionToFrontend, transformSubmissionToDB, SubmissionFrontend } from '@/lib/utils/dataTransform'
import { getEmployeeById } from '@/lib/supabase/queries/employees'
import { employeeCanEdit, employeeCanDelete, getStatusDisplay, getEmployeeStatusLabel } from '@/lib/submission-status'
import Swal from 'sweetalert2'
import { AppHeader } from '@/components/layout/AppHeader'
import { SubmissionEditDrawer } from '@/components/employee/SubmissionEditDrawer'

type Submission = SubmissionFrontend

interface Employee {
  name: string
  lastLogin: string
  hourlyRate: number | null
  onboarding_status?: 'not_started' | 'in_progress' | 'completed' | null
}

interface HolidayDate {
  date: Date
  name: string
  type: 'holiday' | 'special_time_off'
}

interface BlockedDay {
  date: string
  type: 'HOLIDAY' | 'SPECIAL_DAY_OFF'
  name: string
  reason: string
  isPaid?: boolean
}

export default function Dashboard() {
  const router = useRouter()
  const [employee, setEmployee] = useState<Employee>({
    name: '',
    lastLogin: '',
    hourlyRate: null,
    onboarding_status: null,
  })
  const [loadingEmployee, setLoadingEmployee] = useState(true)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [excludedDates, setExcludedDates] = useState<Date[]>([])
  const [holidays, setHolidays] = useState<HolidayDate[]>([])
  const [blockedDays, setBlockedDays] = useState<BlockedDay[]>([])
  const [blockedDaysLoading, setBlockedDaysLoading] = useState(false)
  const [blockedDaysError, setBlockedDaysError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const datePickerRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    hoursSubmitted: 0,
    overtimeHours: 0,
    description: '',
    overtimeDescription: '',
  })
  const [hoursFocused, setHoursFocused] = useState(false)
  const [overtimeFocused, setOvertimeFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [employeeId, setEmployeeId] = useState<string>('')
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  
  // PDF generation state
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null)
  
  // Edit drawer state
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)

  const handleRowClick = (submission: Submission) => {
    setSelectedSubmission(submission)
    setIsEditDrawerOpen(true)
  }

  const handleEditDrawerClose = () => {
    setIsEditDrawerOpen(false)
    setSelectedSubmission(null)
  }

  const handleSubmissionSave = async (updatedSubmission: Submission): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/submissions/${updatedSubmission.id}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          submissionDate: updatedSubmission.date,
          hoursSubmitted: updatedSubmission.hoursSubmitted,
          overtimeHours: updatedSubmission.overtimeHours,
          description: updatedSubmission.description,
          overtimeDescription: updatedSubmission.overtimeDescription,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to update submission' }
      }

      // Show success toast
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: data.message || 'Submission updated successfully',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
      })

      // Refresh submissions and close drawer
      await loadSubmissions()
      handleEditDrawerClose()
      
      return { success: true }
    } catch (error) {
      console.error('Error saving submission:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const handleMenuToggle = (submissionId: string, buttonEl: HTMLButtonElement | null) => {
    if (openMenuId === submissionId) {
      setOpenMenuId(null)
      setMenuPosition(null)
    } else if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 144, // 144px is menu width (w-36)
      })
      setOpenMenuId(submissionId)
    }
  }

  useEffect(() => {
    // Check if user is authenticated
    const userRole = localStorage.getItem('userRole')
    
    // No role means not logged in
    if (!userRole) {
      router.push('/sign-in')
      return
    }
    
    // Support both uppercase and lowercase role checks
    const isEmployee = userRole === 'EMPLOYEE' || userRole === 'employee'
    const isManager = userRole === 'MANAGER' || userRole === 'manager'
    const isAdmin = userRole === 'ADMIN' || userRole === 'admin'
    
    // Redirect managers and admins to their dashboards
    if (isManager) {
      router.push('/manager/dashboard')
      return
    }
    if (isAdmin) {
      router.push('/admin/dashboard')
      return
    }
    
    // Only employees should stay on this page
    if (!isEmployee) {
      router.push('/sign-in')
      return
    }

    // Get employee ID from localStorage
    const storedEmployeeId = localStorage.getItem('employeeId')
    
    // Validate that employeeId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (storedEmployeeId && uuidRegex.test(storedEmployeeId)) {
      setEmployeeId(storedEmployeeId)
    } else {
      // Clear invalid data and redirect to login
      console.error('Invalid or missing employee ID. Please log in again.')
      localStorage.removeItem('employeeId')
      localStorage.removeItem('userRole')
      localStorage.removeItem('employeeName')
      localStorage.removeItem('employeeEmail')
      router.push('/sign-in')
    }
  }, [router])

  useEffect(() => {
    if (employeeId) {
      loadEmployee()
      loadSubmissions()
      loadHolidays()
    } else {
      // If no employee ID, stop loading states
      setLoadingEmployee(false)
      setLoadingSubmissions(false)
    }
  }, [employeeId])

  /**
   * Load blocked days from admin calendar controls API
   * 
   * IMPORTANT: Uses cache-busting to ensure fresh data from server.
   * All date comparisons use YYYY-MM-DD strings to avoid timezone issues.
   */
  const loadBlockedDays = async (monthStart?: Date, monthEnd?: Date) => {
    if (!employeeId) {
      console.log('[Employee Calendar] No employeeId, skipping blocked days fetch')
      return
    }
    
    try {
      setBlockedDaysLoading(true)
      setBlockedDaysError(null)
      
      // Determine date range - default to current month
      const now = new Date()
      const start = monthStart || startOfMonth(now)
      const end = monthEnd || endOfMonth(now)
      
      // Extend range to cover 3 months for better coverage
      const extendedStart = new Date(start)
      extendedStart.setMonth(extendedStart.getMonth() - 1)
      const extendedEnd = new Date(end)
      extendedEnd.setMonth(extendedEnd.getMonth() + 2)
      
      // Format as YYYY-MM-DD (date-only, no timezone conversion)
      const formatDateOnly = (d: Date) => {
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      const startDateStr = formatDateOnly(extendedStart)
      const endDateStr = formatDateOnly(extendedEnd)
      
      // Build query params
      const params = new URLSearchParams({
        employeeId,
        startDate: startDateStr,
        endDate: endDateStr,
        employeeType: 'employee', // TODO: Get from employee profile
      })
      
      // Add cache-busting parameter
      params.append('_t', Date.now().toString())
      
      console.log('[Employee Calendar] Fetching blocked days:', {
        employeeId,
        startDate: startDateStr,
        endDate: endDateStr,
      })
      
      const response = await fetch(`/api/employee/calendar/blocked-days?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      
      const data = await response.json()
      
      if (!response.ok || data.success === false) {
        console.error('[Employee Calendar] API error:', data.error)
        setBlockedDaysError(data.error || 'Failed to load non-working days')
        setBlockedDays([])
        setHolidays([])
        return
      }
      
      const blocked = data.blockedDays || []
      
      // Log results for debugging
      console.log('[Employee Calendar] Received blocked days:', {
        count: blocked.length,
        first3: blocked.slice(0, 3).map((d: BlockedDay) => `${d.date} (${d.name})`),
        meta: data.meta,
      })
      
      setBlockedDays(blocked)
      
      // Also update the holidays state for backward compatibility
      // IMPORTANT: Parse dates as YYYY-MM-DD strings, then create Date objects
      // using the date parts to avoid timezone shifts
      const holidayDates: HolidayDate[] = blocked.map((blockedDay: BlockedDay) => {
        // Parse YYYY-MM-DD without timezone conversion
        const [year, month, day] = blockedDay.date.split('-').map(Number)
        return {
          date: new Date(year, month - 1, day), // month is 0-indexed
          name: blockedDay.name,
          type: blockedDay.type === 'SPECIAL_DAY_OFF' ? 'special_time_off' as const : 'holiday' as const,
        }
      })
      setHolidays(holidayDates)
      
      // Clear any previous error
      setBlockedDaysError(null)
      
    } catch (error) {
      console.error('[Employee Calendar] Error loading blocked days:', error)
      setBlockedDaysError('Failed to load non-working days. Please try again.')
      setBlockedDays([])
      setHolidays([])
    } finally {
      setBlockedDaysLoading(false)
    }
  }
  
  // Alias for backward compatibility
  const loadHolidays = loadBlockedDays

  const loadEmployee = async () => {
    if (!employeeId) return
    
    try {
      setLoadingEmployee(true)
      const employeeData = await getEmployeeById(employeeId)
      
      // Format last login from updated_at timestamp
      const lastLoginDate = employeeData.updated_at 
        ? format(new Date(employeeData.updated_at), 'MMM dd, yyyy, h:mm a')
        : employeeData.created_at
        ? format(new Date(employeeData.created_at), 'MMM dd, yyyy, h:mm a')
        : 'Never'
      
      const onboardingStatus = (employeeData as any).onboarding_status ?? null
      
      setEmployee({
        name: employeeData.name || 'Employee',
        lastLogin: lastLoginDate,
        hourlyRate: employeeData.hourly_rate ?? null,
        onboarding_status: onboardingStatus,
      })

      // Only redirect to onboarding if status is null (never started) or 'in_progress'
      // Allow 'completed' and 'not_started' (skipped) to access dashboard
      if (onboardingStatus === null || onboardingStatus === 'in_progress') {
        router.push('/onboarding')
        return
      }
    } catch (error) {
      console.error('Error loading employee data:', error)
      // Fallback to default values if Supabase fails
      setEmployee({
        name: 'Employee',
        lastLogin: 'Unable to load',
        hourlyRate: null,
        onboarding_status: null,
      })
    } finally {
      setLoadingEmployee(false)
    }
  }

  const loadSubmissions = async () => {
    if (!employeeId) {
      setSubmissions([])
      setLoadingSubmissions(false)
      return
    }

    try {
      setLoadingSubmissions(true)
      const dbSubmissions = await getEmployeeSubmissions(employeeId)
      // Handle empty results gracefully - empty array is valid
      const transformedSubmissions = (dbSubmissions || []).map(transformSubmissionToFrontend)
      setSubmissions(transformedSubmissions)
      // Clear any old localStorage data
      localStorage.removeItem('submissions')
    } catch (error) {
      console.error('Error loading submissions:', error)
      // Clear any old localStorage data
      localStorage.removeItem('submissions')
      // Only show error if it's a real error (not just empty results)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      // Check if it's a connection/authentication error vs empty results
      if (errorMessage.includes('JWT') || errorMessage.includes('auth') || errorMessage.includes('network')) {
        console.warn('Connection error - submissions will be empty until connection is restored')
      }
      setSubmissions([])
    } finally {
      setLoadingSubmissions(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowCalendar(false)
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

  /**
   * Format a date as YYYY-MM-DD using local date parts (no timezone conversion)
   * This prevents timezone-related date shifts.
   */
  const formatDateAsYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Check if a date is blocked (holiday or special day off)
  const isBlockedDay = (date: Date): boolean => {
    const dateStr = formatDateAsYYYYMMDD(date)
    return blockedDays.some(b => b.date === dateStr)
  }

  // Get blocked day info
  const getBlockedDayInfo = (date: Date): BlockedDay | null => {
    const dateStr = formatDateAsYYYYMMDD(date)
    return blockedDays.find(b => b.date === dateStr) || null
  }

  // Check if a date is a holiday (alias for backward compatibility)
  const isHoliday = (date: Date) => {
    return isBlockedDay(date) || holidays.some(h => isSameDay(h.date, date))
  }

  // Get holiday info for a date
  const getHolidayInfo = (date: Date): HolidayDate | null => {
    return holidays.find(h => isSameDay(h.date, date)) || null
  }

  // Get holiday name for a date
  const getHolidayName = (date: Date) => {
    const blocked = getBlockedDayInfo(date)
    if (blocked) return blocked.name
    const holiday = holidays.find(h => isSameDay(h.date, date))
    return holiday?.name || ''
  }

  // Get holidays/blocked days in the selected date range
  const getHolidaysInRange = (): HolidayDate[] => {
    if (!startDate || !endDate) return []
    return holidays.filter(h => 
      isWithinInterval(h.date, { start: startOfDay(startDate), end: endOfDay(endDate) })
    )
  }

  // Get blocked days in the selected date range
  const getBlockedDaysInRange = (): BlockedDay[] => {
    if (!startDate || !endDate) return []
    return blockedDays.filter(b => {
      const date = new Date(b.date)
      return isWithinInterval(date, { start: startOfDay(startDate), end: endOfDay(endDate) })
    })
  }

  // Format holiday type for display
  const formatHolidayType = (type: string) => {
    if (type === 'SPECIAL_DAY_OFF' || type === 'special_time_off') {
      return 'Special Time Off'
    }
    return 'Holiday'
  }

  // Show toast for blocked day click
  const showBlockedDayToast = (dayName: string) => {
    if (typeof window !== 'undefined') {
      const toastDiv = document.createElement('div')
      toastDiv.className = 'fixed top-4 right-4 z-[200] bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg shadow-lg'
      toastDiv.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V4a2 2 0 00-2-2H8a2 2 0 00-2 2v7"/>
          </svg>
          <span>This date is a non-working day: <strong>${dayName}</strong></span>
        </div>
      `
      document.body.appendChild(toastDiv)
      setTimeout(() => toastDiv.remove(), 4000)
    }
  }

  // Calculate working days (Mon-Fri) between start and end date, excluding specified dates and holidays
  const calculateWorkingDays = (start: Date | null, end: Date | null, excluded: Date[]) => {
    if (!start || !end) return 0
    
    const days = eachDayOfInterval({ start, end })
    return days.filter(day => {
      // Skip weekends
      if (isWeekend(day)) return false
      // Skip excluded dates
      if (excluded.some(excl => isSameDay(excl, day))) return false
      // Skip holidays
      if (isHoliday(day)) return false
      return true
    }).length
  }

  // Update hours when dates or exclusions change
  const updateHoursFromWorkingDays = (start: Date | null, end: Date | null, excluded: Date[]) => {
    const workingDays = calculateWorkingDays(start, end, excluded)
    const hours = workingDays * 8
    setFormData(prev => ({ ...prev, hoursSubmitted: hours }))
  }

  // Handle start date selection
  const handleStartDateChange = (date: Date) => {
    setStartDate(date)
    setFormData(prev => ({ ...prev, startDate: format(date, 'yyyy-MM-dd') }))
    
    // If end date is set and in different month, reset it
    if (endDate && !isSameMonth(date, endDate)) {
      setEndDate(null)
      setFormData(prev => ({ ...prev, endDate: '' }))
      setExcludedDates([])
    } else if (endDate) {
      // Recalculate if end date exists and is valid
      if (date <= endDate) {
        updateHoursFromWorkingDays(date, endDate, excludedDates)
      }
    }
    
    // Set current month to match selected date
    setCurrentMonth(date)
  }

  // Handle end date selection  
  const handleEndDateChange = (date: Date) => {
    if (!startDate) return
    
    // Validate same month
    if (!isSameMonth(startDate, date)) {
      alert('End date must be in the same month as start date')
      return
    }
    
    // Validate end >= start
    if (date < startDate) {
      alert('End date must be after or equal to start date')
      return
    }
    
    setEndDate(date)
    setFormData(prev => ({ ...prev, endDate: format(date, 'yyyy-MM-dd') }))
    setExcludedDates([]) // Reset exclusions when range changes
    updateHoursFromWorkingDays(startDate, date, [])
  }

  // Toggle a date's exclusion status (for holidays, etc.)
  const toggleDateExclusion = (date: Date) => {
    if (!startDate || !endDate) return
    if (isWeekend(date)) return // Can't toggle weekends
    if (!isWithinInterval(date, { start: startDate, end: endDate })) return
    
    setExcludedDates(prev => {
      const isExcluded = prev.some(d => isSameDay(d, date))
      let newExcluded: Date[]
      if (isExcluded) {
        newExcluded = prev.filter(d => !isSameDay(d, date))
      } else {
        newExcluded = [...prev, date]
      }
      // Update hours after state change
      setTimeout(() => updateHoursFromWorkingDays(startDate, endDate, newExcluded), 0)
      return newExcluded
    })
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

  const generateInvoice = async (submission: Submission) => {
    if (!employeeId) {
      alert('Employee ID not found. Please log in again.')
      return null
    }

    try {
      // Get employee profile from Supabase
      const employee = await getEmployeeById(employeeId)
      
      // Check if profile has required data (at least hourlyRate)
      if (!employee.hourly_rate || employee.hourly_rate === 0) {
        alert('Please complete your employee profile first (hourly rate is required)')
        return null
      }
      
      const invoiceId = uuidv4()
      
      // Calculate total hours and amount
      const totalHours = submission.hoursSubmitted + (submission.overtimeHours || 0)
      const hourlyRate = employee.hourly_rate
      const totalAmount = totalHours * hourlyRate

      // Generate unique invoice number using timestamp + random suffix
      const timestamp = Date.now()
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const invoiceNumber = `INV-${timestamp}-${randomSuffix}`

      const invoice: Invoice = {
        id: invoiceId,
        invoiceNumber: invoiceNumber,
        date: format(new Date(), 'MMMM dd, yyyy'),
        dueDate: '15 days from the Invoiced date.',
        from: {
          name: employee.name || 'Employee',
          address: employee.address || '',
          state: employee.state_parish || '',
          country: employee.country || '',
          email: employee.email || '',
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
          bankName: employee.bank_name || '',
          bankAddress: employee.bank_address || '',
          swiftCode: employee.swift_code || '',
          abaWireRouting: employee.aba_wire_routing || '',
          accountType: employee.account_type || '',
          currency: employee.currency || '',
          accountNumber: employee.account_number || '',
        },
        submissionId: submission.id,
      }

      // Save invoice to Supabase
      try {
        const saveResponse = await fetch('/api/invoices/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invoice),
        })

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json().catch(() => ({}))
          console.error('Failed to save invoice to database:', errorData)
          // Don't return invoiceId if save failed - it won't be found later
          return null
        }
        
        return invoiceId
      } catch (saveError) {
        console.error('Error saving invoice:', saveError)
        return null
      }
    } catch (error) {
      console.error('Error generating invoice:', error)
      alert('Failed to load employee profile. Please complete your profile and try again.')
      return null
    }
  }

  const handleOpenPDF = async (invoiceId: string | null) => {
    if (!invoiceId) return
    
    // Prevent double-click
    if (generatingPdfId === invoiceId) {
      console.log('[PDF] Already generating PDF for this invoice')
      return
    }
    
    setGeneratingPdfId(invoiceId)
    
    try {
      console.log(`[PDF] Fetching invoice: ${invoiceId}`)
      
      // Step 1: Get invoice from Supabase
      const invoiceResponse = await fetch(`/api/invoices/${invoiceId}`)
      
      if (!invoiceResponse.ok) {
        const errorData = await invoiceResponse.json().catch(() => ({}))
        if (invoiceResponse.status === 404) {
          throw new Error('Invoice not found. It may have been deleted.')
        }
        throw new Error(errorData.error || 'Failed to fetch invoice')
      }
      
      const invoice = await invoiceResponse.json()
      
      if (!invoice || !invoice.invoiceNumber) {
        throw new Error('Invalid invoice data received')
      }
      
      console.log(`[PDF] Invoice fetched: ${invoice.invoiceNumber}`)
      
      // Step 2: Call API to generate PDF
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoice),
      })
      
      // Get request ID from response headers for debugging
      const requestId = response.headers.get('X-Request-Id') || 'unknown'
      console.log(`[PDF] Generation response: status=${response.status}, requestId=${requestId}`)
      
      // Handle error responses
      if (!response.ok) {
        let errorMessage = 'Failed to generate PDF'
        let errorDetails = ''
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          errorDetails = errorData.details || ''
          
          // Log full error for debugging
          console.error('[PDF] Generation error:', errorData)
        } catch {
          // Response wasn't JSON
          const text = await response.text()
          console.error('[PDF] Non-JSON error response:', text)
        }
        
        throw new Error(`${errorMessage}${errorDetails ? `: ${errorDetails}` : ''} (Request: ${requestId})`)
      }
      
      // Step 3: Create blob from response
      const blob = await response.blob()
      
      // Validate blob
      if (!blob || blob.size === 0) {
        throw new Error('Received empty PDF from server')
      }
      
      // Check if blob is actually a PDF
      if (blob.type && !blob.type.includes('pdf')) {
        // Try to parse as JSON error
        const text = await blob.text()
        try {
          const errorData = JSON.parse(text)
          throw new Error(errorData.error || errorData.details || 'Invalid PDF response')
        } catch (e) {
          if (e instanceof Error && e.message.includes('Invalid PDF')) {
            throw e
          }
          throw new Error('Received invalid response from server')
        }
      }
      
      console.log(`[PDF] PDF received: ${blob.size} bytes`)
      
      // Step 4: Open PDF in new tab
      const pdfUrl = URL.createObjectURL(blob)
      window.open(pdfUrl, '_blank')
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 30000)
      
      // Show success toast
      Swal.fire({
        icon: 'success',
        title: 'PDF Generated',
        text: 'Invoice PDF opened in new tab',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
      })
      
    } catch (error) {
      console.error('[PDF] Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF'
      
      // Show error with retry option
      Swal.fire({
        icon: 'error',
        title: 'PDF Generation Failed',
        text: errorMessage,
        confirmButtonText: 'Retry',
        showCancelButton: true,
        cancelButtonText: 'Close',
      }).then((result) => {
        if (result.isConfirmed) {
          handleOpenPDF(invoiceId)
        }
      })
    } finally {
      setGeneratingPdfId(null)
    }
  }

  const handleSubmitHours = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent double submission
    if (isSubmitting) {
      return
    }
    
    if (!formData.startDate || !formData.endDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Dates',
        text: 'Please select a work period (start and end date)',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
      })
      return
    }

    if (formData.hoursSubmitted <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Hours',
        text: 'Hours submitted must be greater than 0',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
      })
      return
    }

    if (formData.overtimeHours > 0 && !formData.overtimeDescription.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Description',
        text: 'Please provide overtime description when submitting overtime hours',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
      })
      return
    }

    if (!employeeId) {
      Swal.fire({
        icon: 'error',
        title: 'Session Error',
        text: 'Employee ID not found. Please log in again.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
      })
      return
    }

    // Note: Blocked dates are automatically excluded from the working days calculation
    // No need to block submission - the system skips holidays/special days just like weekends

    // Check for duplicate submission (same month and year) - client-side check
    const submissionDate = new Date(formData.endDate)
    const submissionMonth = submissionDate.getMonth()
    const submissionYear = submissionDate.getFullYear()
    
    const duplicateSubmission = submissions.find(sub => {
      const existingDate = new Date(sub.date)
      return existingDate.getMonth() === submissionMonth && 
             existingDate.getFullYear() === submissionYear
    })

    if (duplicateSubmission) {
      const monthName = format(submissionDate, 'MMMM yyyy')
      await Swal.fire({
        icon: 'error',
        title: 'Duplicate Submission',
        html: `<p>You have already submitted hours for <strong>${monthName}</strong>.</p>
               <p class="text-sm text-gray-500 mt-2">Each month can only have one submission. Please edit or delete the existing submission if you need to make changes.</p>`,
        confirmButtonText: 'OK',
        confirmButtonColor: '#7C3AED',
        customClass: {
          popup: 'rounded-lg',
          title: 'text-xl font-bold',
          htmlContainer: 'text-left',
        }
      })
      return
    }

    // Set submitting state to prevent double-clicks
    setIsSubmitting(true)

    // Generate idempotency key for this submission attempt
    const idempotencyKey = uuidv4()

    try {
      // Create submission in Supabase - use end date as the submission date
      const response = await fetch('/api/submissions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId,
          managerId: null, // Will be set based on team_members relationship
          submissionDate: formData.endDate, // Use end date for submission
          hoursSubmitted: formData.hoursSubmitted,
          overtimeHours: formData.overtimeHours > 0 ? formData.overtimeHours : null,
          description: formData.description,
          overtimeDescription: formData.overtimeHours > 0 ? formData.overtimeDescription : null,
          idempotencyKey, // Include idempotency key
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Handle duplicate month-year error specifically
        if (errorData.code === 'DUPLICATE_MONTH_YEAR') {
          await Swal.fire({
            icon: 'error',
            title: 'Duplicate Submission',
            html: `<p>${errorData.error}</p>`,
            confirmButtonText: 'OK',
            confirmButtonColor: '#7C3AED',
            customClass: {
              popup: 'rounded-lg',
              title: 'text-xl font-bold',
              htmlContainer: 'text-left',
            }
          })
          setIsSubmitting(false)
          return
        }
        
        throw new Error(errorData.error || 'Failed to create submission')
      }

      const result = await response.json()
      
      // Transform and add to local state
      const newSubmission = transformSubmissionToFrontend(result.data)

      // Generate invoice (PDF will be generated on-demand when opened)
      const invoiceId = await generateInvoice(newSubmission)
      if (invoiceId) {
        // Update local submission with invoice ID
        newSubmission.invoiceId = invoiceId
      }
      
      setSubmissions([newSubmission, ...submissions])

      setShowSubmitModal(false)
      setFormData({
        startDate: '',
        endDate: '',
        hoursSubmitted: 0,
        overtimeHours: 0,
        description: '',
        overtimeDescription: '',
      })
      setStartDate(null)
      setEndDate(null)
      setExcludedDates([])
      setShowCalendar(false)
      setHoursFocused(false)
      setOvertimeFocused(false)
      setIsSubmitting(false)

      // Show success toast
      Swal.fire({
        icon: 'success',
        title: 'Submission Saved',
        text: 'Your hours have been successfully submitted.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
      })
    } catch (error) {
      console.error('Error submitting hours:', error)
      setIsSubmitting(false) // Re-enable submit button on error
      
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: error instanceof Error ? error.message : 'Failed to submit hours. Please try again.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
      })
    }
  }

  const handleDelete = async (id: string) => {
    const submission = submissions.find((s) => s.id === id)
    if (submission && employeeCanDelete(submission.status)) {
      if (confirm('Are you sure you want to delete this submission?')) {
        try {
          const response = await fetch(`/api/submissions/${id}/delete`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ employeeId }),
          })

          if (!response.ok) {
            throw new Error('Failed to delete submission')
          }

          // Remove from local state
          const updated = submissions.filter((s) => s.id !== id)
          setSubmissions(updated)
        } catch (error) {
          console.error('Error deleting submission:', error)
          alert('Failed to delete submission. Please try again.')
        }
      }
    }
  }

  const getStatusBadgeClass = (status: SubmissionStatus) => {
    const display = getStatusDisplay(status)
    return `${display.bgClass} ${display.textClass}`
  }

  const formatStatus = (status: SubmissionStatus) => {
    return getEmployeeStatusLabel(status)
  }

  const getRejectionMessage = (submission: Submission): string | null => {
    if (submission.status === 'MANAGER_REJECTED' && submission.managerComment) {
      return submission.managerComment
    }
    if (submission.status === 'ADMIN_REJECTED' && submission.adminComment) {
      return submission.adminComment
    }
    return null
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
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        portal="employee"
        title={loadingEmployee ? 'Welcome...' : `Welcome, ${employee.name || 'Employee'}`}
        subtitle={loadingEmployee ? '' : employee.lastLogin}
        primaryActionLabel="Submit Hours"
        primaryActionIcon={<Clock className="w-4 h-4" />}
        onPrimaryAction={() => setShowSubmitModal(true)}
        onProfileClick={() => router.push('/profile')}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Recent Submissions Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-xl font-semibold text-slate-900">Recent Submissions</h2>
          </div>
          <div className="overflow-x-auto overflow-y-visible w-full">
            <table className="w-full min-w-full table-fixed text-sm">
{/* Column widths: Month/Date 15%, Hours 12%, Overtime 12%, Amount 14%, Status 22%, Invoice 12%, Actions 13% */}
              <colgroup><col className="w-[15%]" /><col className="w-[12%]" /><col className="w-[12%]" /><col className="w-[14%]" /><col className="w-[22%]" /><col className="w-[12%]" /><col className="w-[13%]" /></colgroup>
              <thead>
                <tr className="bg-slate-100 border-y border-slate-200">
                  <th className="text-left py-3 px-4 text-[14px] font-semibold text-slate-700">
                    Month / Date
                  </th>
                  <th className="text-left py-3 px-4 text-[14px] font-semibold text-slate-700">
                    Hours Submitted
                  </th>
                  <th className="text-left py-3 px-4 text-[14px] font-semibold text-slate-700">
                    Overtime Hours
                  </th>
                  <th className="text-right py-3 px-4 text-[14px] font-semibold text-slate-700">
                    Invoice Amount ($)
                  </th>
                  <th className="text-left py-3 px-4 text-[14px] font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-[14px] font-semibold text-slate-700">
                    Invoice
                  </th>
                  <th className="text-left py-3 px-4 text-[14px] font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingSubmissions ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                      <p className="mt-2 text-slate-500">Loading submissions...</p>
                    </td>
                  </tr>
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      No submissions yet. Click &quot;Submit Hours&quot; to create your first submission.
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission) => (
                    <tr 
                      key={submission.id} 
                      className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedSubmission?.id === submission.id ? 'bg-teal-50' : ''
                      }`}
                      onClick={() => handleRowClick(submission)}
                    >
                      <td className="py-4 px-4 text-slate-900">{submission.month}</td>
                      <td className="py-4 px-4 text-slate-700">{submission.hoursSubmitted}</td>
                      <td className="py-4 px-4 text-slate-700">
                        {submission.overtimeHours !== null ? submission.overtimeHours : '—'}
                      </td>
                      {/* Invoice Amount ($) */}
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm font-semibold text-emerald-600">
                          {(() => {
                            const hourlyRate = employee.hourlyRate || 0
                            if (!hourlyRate) return '—'

                            const totalHours =
                              (submission.hoursSubmitted || 0) +
                              (submission.overtimeHours || 0)

                            const total = totalHours * hourlyRate
                            return total > 0
                              ? `$${total.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : '—'
                          })()}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium inline-block whitespace-nowrap truncate max-w-full ${getStatusBadgeClass(
                              submission.status
                            )}`}
                            title={formatStatus(submission.status)}
                          >
                            {formatStatus(submission.status)}
                          </span>
                          {getRejectionMessage(submission) && (
                            <div className="flex items-start gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-red-600 line-clamp-2">
                                {getRejectionMessage(submission)}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {submission.invoiceId ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenPDF(submission.invoiceId)
                            }}
                            disabled={generatingPdfId === submission.invoiceId}
                            className={`inline-flex items-center transition-colors ${
                              generatingPdfId === submission.invoiceId
                                ? 'text-slate-400 cursor-wait'
                                : 'text-primary-600 hover:text-primary-700'
                            }`}
                          >
                            {generatingPdfId === submission.invoiceId ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                <span className="text-sm">Generating...</span>
                              </>
                            ) : (
                              <>
                                <Paperclip className="w-4 h-4 mr-1" />
                                <span className="text-sm">View PDF</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        {employeeCanEdit(submission.status) ? (
                          <div className="relative inline-block text-left">
                          <button
                              type="button"
                              onClick={(e) => handleMenuToggle(submission.id, e.currentTarget)}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              aria-label="Open actions menu"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                          </button>

                            {openMenuId === submission.id && menuPosition && typeof document !== 'undefined' && createPortal(
                              <>
                                <div
                                  className="fixed inset-0 z-[9998]"
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    setMenuPosition(null)
                                  }}
                                />
                                <div 
                                  className="fixed w-36 bg-white rounded-xl shadow-xl border border-slate-200 z-[9999] py-1"
                                  style={{ top: menuPosition.top, left: menuPosition.left }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      setMenuPosition(null)
                                      // Placeholder for future edit flow
                                      alert('Edit submission coming soon.')
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    {submission.status === 'MANAGER_REJECTED' || submission.status === 'ADMIN_REJECTED' ? 'Edit & Resubmit' : 'Edit'}
                                  </button>
                                  {employeeCanDelete(submission.status) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null)
                                        setMenuPosition(null)
                                        handleDelete(submission.id)
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </>,
                              document.body
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 relative my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Submit Hours</h2>
              <button
                onClick={() => {
                  setShowSubmitModal(false)
                  setFormData({
                    startDate: '',
                    endDate: '',
                    hoursSubmitted: 0,
                    overtimeHours: 0,
                    description: '',
                    overtimeDescription: '',
                  })
                  setStartDate(null)
                  setEndDate(null)
                  setExcludedDates([])
                  setShowCalendar(false)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitHours} className="space-y-4">
              {/* Work Period - Start and End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Period <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Start Date */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          const date = new Date(e.target.value + 'T00:00:00')
                          handleStartDateChange(date)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    />
                  </div>
                  {/* End Date */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      min={formData.startDate}
                      onChange={(e) => {
                        if (e.target.value && startDate) {
                          const date = new Date(e.target.value + 'T00:00:00')
                          handleEndDateChange(date)
                        }
                      }}
                      disabled={!startDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                
                {/* Toggle Calendar Button */}
                {startDate && endDate && (
                  <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="mt-3 flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                  >
                    <Calendar className="w-4 h-4" />
                    {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                  </button>
                )}

                {/* Working Days Info */}
                {startDate && endDate && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="text-blue-600 mt-0.5">ℹ</div>
                      <div>
                        <p className="text-sm text-blue-800">
                          <strong>{calculateWorkingDays(startDate, endDate, excludedDates)} working days</strong> selected (Mon-Fri only, excluding holidays)
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Click on blue dates to exclude specific days. Holidays are auto-excluded.
                        </p>
                      </div>
                    </div>
                    
                    {/* Blocked Days List in Range */}
                    {getBlockedDaysInRange().length > 0 && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
                          🔒 Admin-Blocked Days in Selected Period
                        </p>
                        <div className="space-y-1.5">
                          {getBlockedDaysInRange().map((blocked, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  blocked.type === 'HOLIDAY' 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {formatHolidayType(blocked.type)}
                                </span>
                                <span className="font-medium text-amber-900">{blocked.name}</span>
                              </div>
                              <span className="text-amber-700 text-xs">
                                {format(new Date(blocked.date), 'EEE, MMM d')}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-amber-600 mt-2 italic">
                          These days cannot be selected as work days.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Calendar for excluding dates */}
                {showCalendar && startDate && endDate && (
                  <div className="mt-4 border border-gray-200 rounded-lg p-4">
                    {/* Blocked Days Loading State */}
                    {blockedDaysLoading && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                        <span className="text-sm text-blue-700">Loading non-working days...</span>
                      </div>
                    )}
                    
                    {/* Blocked Days Error State */}
                    {blockedDaysError && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">{blockedDaysError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => loadBlockedDays()}
                          className="mt-2 text-xs text-red-600 underline hover:text-red-800"
                        >
                          Retry loading non-working days
                        </button>
                      </div>
                    )}
                    
                    {/* Blocked Days Empty State (when loaded but empty) */}
                    {!blockedDaysLoading && !blockedDaysError && blockedDays.length === 0 && (
                      <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500 text-center">
                        No non-working days in this period
                      </div>
                    )}
                    
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
                          className={`text-center text-xs font-medium py-1 ${
                            day === 'Sun' || day === 'Sat' ? 'text-red-500' : 'text-gray-700'
                          }`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {renderCalendar().map((item, idx) => {
                        const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), item.day)
                        const isInRange = item.isCurrentMonth && startDate && endDate && 
                          isWithinInterval(currentDate, { start: startOfDay(startDate), end: endOfDay(endDate) })
                        const isWeekendDay = isWeekend(currentDate)
                        const isExcluded = excludedDates.some(d => isSameDay(d, currentDate))
                        const isHolidayDay = isHoliday(currentDate)
                        const holidayInfo = getHolidayInfo(currentDate)
                        const holidayName = holidayInfo?.name || ''
                        const holidayType = holidayInfo?.type || 'holiday'
                        const isWorkingDay = isInRange && !isWeekendDay && !isExcluded && !isHolidayDay
                        
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (isHolidayDay) {
                                // Show toast when clicking blocked day
                                showBlockedDayToast(holidayName)
                                return
                              }
                              if (isInRange && !isWeekendDay) {
                                toggleDateExclusion(currentDate)
                              }
                            }}
                            disabled={!item.isCurrentMonth || !isInRange || isWeekendDay}
                            className={`p-2 text-xs rounded transition-colors border relative ${
                              isHolidayDay && isInRange
                                ? 'bg-amber-100 text-amber-800 border-amber-400 cursor-not-allowed'
                                : isExcluded
                                ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 cursor-pointer'
                                : isWorkingDay
                                ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600 cursor-pointer'
                                : isInRange && isWeekendDay
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : item.isCurrentMonth
                                ? 'bg-white text-gray-400 border-gray-100'
                                : 'bg-gray-50 text-gray-300 border-transparent'
                            }`}
                            title={
                              isHolidayDay ? `🔒 Off-limits: ${holidayName} (${formatHolidayType(holidayType)})` :
                              isExcluded ? 'Click to include this day' :
                              isWorkingDay ? 'Click to exclude this day' :
                              isWeekendDay ? 'Weekend - not counted' : ''
                            }
                          >
                            <span className="relative">
                              {item.day}
                              {isHolidayDay && isInRange && (
                                <span className="absolute -top-1 -right-2 text-[8px]">🔒</span>
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span>Working Day</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                        <span>Excluded Day</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-amber-100 border border-amber-400 rounded flex items-center justify-center text-[6px]">🔒</div>
                        <span>Blocked (Admin)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-gray-100 rounded"></div>
                        <span>Weekend</span>
                      </div>
                    </div>
                  </div>
                )}
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
                    min="1"
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
                {startDate && endDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-calculated: {calculateWorkingDays(startDate, endDate, excludedDates)} days × 8 hours = {calculateWorkingDays(startDate, endDate, excludedDates) * 8} hours (editable)
                  </p>
                )}
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
                  disabled={isSubmitting}
                  onClick={() => {
                    setShowSubmitModal(false)
                    setFormData({
                      startDate: '',
                      endDate: '',
                      hoursSubmitted: 0,
                      overtimeHours: 0,
                      description: '',
                      overtimeDescription: '',
                    })
                    setStartDate(null)
                    setEndDate(null)
                    setExcludedDates([])
                    setShowCalendar(false)
                    setHoursFocused(false)
                    setOvertimeFocused(false)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit Hours'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submission Edit Drawer */}
      <SubmissionEditDrawer
        submission={selectedSubmission}
        isOpen={isEditDrawerOpen}
        onClose={handleEditDrawerClose}
        onSave={handleSubmissionSave}
        employeeId={employeeId}
        hourlyRate={employee.hourlyRate}
      />
    </div>
  )
}
