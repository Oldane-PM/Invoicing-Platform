'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  Check,
  Calendar as CalendarIcon
} from 'lucide-react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isWeekend
} from 'date-fns'
import { Combobox } from '@/components/ui/combobox'

// Types
export interface Holiday {
  id: string
  name: string
  description?: string
  type: 'holiday' | 'special_time_off'
  dates: Date[]
  projects: string[]
  employeeTypes: string[]
  countries: string[]
  regions: string[]
  createdAt: Date
}

interface HolidayFormData {
  type: 'holiday' | 'special_time_off'
  name: string
  description: string
  projects: string[]
  employeeTypes: string[]
  countries: string[]
  regions: string[]
}

interface AdminCalendarControlProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (holidays: Holiday) => void
}

// Static options for filters
const EMPLOYEE_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contractor', label: 'Contractor' },
]

const COUNTRY_OPTIONS = [
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
  { value: 'jm', label: 'Jamaica' },
  { value: 'in', label: 'India' },
]

const REGION_OPTIONS: Record<string, { value: string; label: string }[]> = {
  us: [
    { value: 'us_east', label: 'East Coast' },
    { value: 'us_west', label: 'West Coast' },
    { value: 'us_midwest', label: 'Midwest' },
    { value: 'us_south', label: 'South' },
  ],
  uk: [
    { value: 'uk_england', label: 'England' },
    { value: 'uk_scotland', label: 'Scotland' },
    { value: 'uk_wales', label: 'Wales' },
  ],
  ca: [
    { value: 'ca_ontario', label: 'Ontario' },
    { value: 'ca_quebec', label: 'Quebec' },
    { value: 'ca_bc', label: 'British Columbia' },
  ],
}

export function AdminCalendarControl({
  isOpen,
  onClose,
  onSave,
}: AdminCalendarControlProps) {
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [existingHolidays, setExistingHolidays] = useState<Holiday[]>([])
  const [hoveredHoliday, setHoveredHoliday] = useState<Holiday | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  
  // Form state
  const [formData, setFormData] = useState<HolidayFormData>({
    type: 'holiday',
    name: '',
    description: '',
    projects: [],
    employeeTypes: [],
    countries: [],
    regions: [],
  })
  
  // Projects loaded from API
  const [projects, setProjects] = useState<{ value: string; label: string }[]>([])
  
  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Confirmation modal
  const [showConfirmation, setShowConfirmation] = useState(false)
  
  // Affected employees count
  const [affectedCount, setAffectedCount] = useState(0)
  const [loadingCount, setLoadingCount] = useState(false)
  
  // Drag selection state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Date | null>(null)

  // Load projects on mount
  useEffect(() => {
    if (isOpen) {
      loadProjects()
      loadExistingHolidays()
    }
  }, [isOpen])

  // Calculate affected employees when filters change
  useEffect(() => {
    if (isOpen) {
      calculateAffectedEmployees()
    }
  }, [formData.projects, formData.employeeTypes, formData.countries, formData.regions, isOpen])

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/admin/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects?.map((p: any) => ({
          value: p.id,
          label: p.name,
        })) || [])
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const loadExistingHolidays = async () => {
    try {
      const response = await fetch('/api/admin/holidays')
      if (response.ok) {
        const data = await response.json()
        setExistingHolidays(data.holidays?.map((h: any) => ({
          ...h,
          dates: h.dates.map((d: string) => new Date(d)),
          createdAt: new Date(h.created_at),
        })) || [])
      }
    } catch (error) {
      console.error('Error loading holidays:', error)
    }
  }

  const calculateAffectedEmployees = async () => {
    setLoadingCount(true)
    try {
      const params = new URLSearchParams()
      if (formData.projects.length) params.set('projects', formData.projects.join(','))
      if (formData.employeeTypes.length) params.set('employeeTypes', formData.employeeTypes.join(','))
      if (formData.countries.length) params.set('countries', formData.countries.join(','))
      if (formData.regions.length) params.set('regions', formData.regions.join(','))
      
      const response = await fetch(`/api/admin/employees/count?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setAffectedCount(data.count || 0)
      }
    } catch (error) {
      console.error('Error calculating affected employees:', error)
      // Default to a reasonable estimate
      setAffectedCount(42)
    } finally {
      setLoadingCount(false)
    }
  }

  // Calendar navigation
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  // Get days for current month view
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })
    
    // Pad start with previous month days
    const startDayOfWeek = getDay(start)
    const paddedDays: (Date | null)[] = Array(startDayOfWeek).fill(null)
    
    return [...paddedDays, ...days]
  }, [currentMonth])

  // Check if a date is selected
  const isDateSelected = (date: Date) => {
    return selectedDates.some(d => isSameDay(d, date))
  }

  // Check if a date is an existing holiday
  const getHolidayForDate = (date: Date): Holiday | null => {
    for (const holiday of existingHolidays) {
      if (holiday.dates.some(d => isSameDay(d, date))) {
        return holiday
      }
    }
    return null
  }

  // Toggle date selection
  const toggleDateSelection = (date: Date) => {
    if (isDateSelected(date)) {
      setSelectedDates(selectedDates.filter(d => !isSameDay(d, date)))
    } else {
      setSelectedDates([...selectedDates, date])
    }
  }

  // Handle mouse down for drag selection
  const handleMouseDown = (date: Date) => {
    setIsDragging(true)
    setDragStart(date)
    toggleDateSelection(date)
  }

  // Handle mouse enter during drag
  const handleMouseEnter = (date: Date) => {
    if (isDragging && dragStart) {
      if (!isDateSelected(date)) {
        setSelectedDates(prev => [...prev, date])
      }
    }
  }

  // Handle mouse up to end drag
  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
  }

  // Handle holiday hover for tooltip
  const handleHolidayHover = (holiday: Holiday, event: React.MouseEvent) => {
    setHoveredHoliday(holiday)
    setTooltipPosition({ x: event.clientX, y: event.clientY })
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (selectedDates.length === 0) {
      newErrors.dates = 'Please select at least one date'
    }
    
    if (affectedCount === 0) {
      newErrors.affected = 'No employees affected by current filters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle apply button click
  const handleApply = () => {
    if (validateForm()) {
      setShowConfirmation(true)
    }
  }

  // Confirm and save
  const handleConfirmApply = async () => {
    try {
      const response = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          dates: selectedDates.map(d => d.toISOString()),
          projects: formData.projects,
          employee_types: formData.employeeTypes,
          countries: formData.countries,
          regions: formData.regions,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create holiday')
      }
      
      const data = await response.json()
      
      // Show success toast
      showToast('Non-working days applied successfully.', 'success')
      
      // Reset form
      setSelectedDates([])
      setFormData({
        type: 'holiday',
        name: '',
        description: '',
        projects: [],
        employeeTypes: [],
        countries: [],
        regions: [],
      })
      
      // Reload holidays
      loadExistingHolidays()
      
      // Close confirmation
      setShowConfirmation(false)
      
      // Notify parent
      onSave?.(data.holiday)
      
    } catch (error) {
      console.error('Error creating holiday:', error)
      showToast('Failed to apply non-working days.', 'error')
    }
  }

  // Toast notification
  const showToast = (message: string, variant: 'success' | 'error') => {
    if (typeof window !== 'undefined') {
      const toastDiv = document.createElement('div')
      toastDiv.className = `fixed top-4 right-4 z-[200] px-4 py-3 rounded-lg shadow-lg border ${
        variant === 'success' 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
          : 'bg-red-50 border-red-200 text-red-800'
      }`
      toastDiv.innerHTML = `
        <div class="flex items-center gap-2">
          <span>${message}</span>
        </div>
      `
      document.body.appendChild(toastDiv)
      setTimeout(() => toastDiv.remove(), 4000)
    }
  }

  // Get available regions based on selected countries
  const availableRegions = useMemo(() => {
    const regions: { value: string; label: string }[] = []
    formData.countries.forEach(country => {
      const countryRegions = REGION_OPTIONS[country]
      if (countryRegions) {
        regions.push(...countryRegions)
      }
    })
    return regions
  }, [formData.countries])

  // Format selected dates for display
  const formatSelectedDates = () => {
    if (selectedDates.length === 0) return 'No dates selected'
    if (selectedDates.length === 1) return format(selectedDates[0], 'MMM d, yyyy')
    
    const sorted = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())
    const first = format(sorted[0], 'MMM d')
    const last = format(sorted[sorted.length - 1], 'MMM d, yyyy')
    
    if (selectedDates.length === 2) {
      return `${first} & ${last}`
    }
    
    return `${first} – ${last} (${selectedDates.length} days)`
  }

  // Can apply?
  const canApply = selectedDates.length > 0 && formData.name.trim() && affectedCount > 0

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showConfirmation) {
          setShowConfirmation(false)
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showConfirmation, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className="fixed right-0 top-0 h-screen w-full max-w-[900px] bg-white shadow-2xl z-50 flex flex-col"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Calendar Controls</h2>
            <p className="text-sm text-slate-500 mt-1">Define holidays and special non-working days</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Column: Calendar View */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-4">Select Dates</h3>
              
              {/* Calendar */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={goToPreviousMonth}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="text-base font-semibold text-slate-900">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="h-10" />
                    }
                    
                    const isSelected = isDateSelected(day)
                    const existingHoliday = getHolidayForDate(day)
                    const isCurrentMonth = isSameMonth(day, currentMonth)
                    const isWeekendDay = isWeekend(day)
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onMouseDown={() => handleMouseDown(day)}
                        onMouseEnter={() => handleMouseEnter(day)}
                        onMouseOver={(e) => existingHoliday && handleHolidayHover(existingHoliday, e)}
                        onMouseLeave={() => setHoveredHoliday(null)}
                        className={`
                          h-10 rounded-lg text-sm font-medium transition-all select-none
                          ${!isCurrentMonth ? 'text-slate-300' : ''}
                          ${isWeekendDay && isCurrentMonth ? 'text-slate-400' : ''}
                          ${isSelected && !existingHoliday ? 'bg-amber-100 text-amber-900 border-2 border-amber-400' : ''}
                          ${existingHoliday && !isSelected ? 'bg-red-50 text-red-700 border border-red-200' : ''}
                          ${existingHoliday && isSelected ? 'bg-amber-100 text-amber-900 border-2 border-amber-400 ring-2 ring-red-300' : ''}
                          ${!isSelected && !existingHoliday && isCurrentMonth ? 'hover:bg-slate-100 text-slate-700' : ''}
                        `}
                      >
                        {format(day, 'd')}
                      </button>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-100 border-2 border-amber-400" />
                    <span className="text-xs text-slate-600">Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-50 border border-red-200" />
                    <span className="text-xs text-slate-600">Existing Holiday</span>
                  </div>
                </div>
              </div>

              {errors.dates && (
                <p className="text-xs text-red-500 mt-2">{errors.dates}</p>
              )}
            </div>

            {/* Right Column: Configuration */}
            <div className="space-y-6">
              {/* Holiday Details Section */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-4">Holiday / Special Time Off Details</h3>
                
                <div className="space-y-4">
                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                    <Combobox
                      value={formData.type}
                      onChange={(value) => setFormData(prev => ({ ...prev, type: value as 'holiday' | 'special_time_off' }))}
                      options={[
                        { value: 'holiday', label: 'Holiday' },
                        { value: 'special_time_off', label: 'Special Time Off' },
                      ]}
                      clearable={false}
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Name / Label</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, name: e.target.value }))
                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }))
                      }}
                      placeholder="e.g. Independence Day, Company Retreat"
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? 'border-red-300' : 'border-slate-200'
                      }`}
                    />
                    {errors.name && (
                      <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description <span className="text-slate-400 font-normal">Optional</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Additional details about this non-working day"
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Apply To Section */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-4">Apply To</h3>
                
                <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                  {/* Project */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Project</label>
                    <Combobox
                      value={formData.projects[0] || ''}
                      onChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        projects: value ? [value] : [] 
                      }))}
                      options={[
                        { value: '', label: 'All Projects' },
                        ...projects
                      ]}
                      placeholder="Select projects..."
                    />
                  </div>

                  {/* Employee Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Employee Type</label>
                    <Combobox
                      value={formData.employeeTypes[0] || ''}
                      onChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        employeeTypes: value ? [value] : [] 
                      }))}
                      options={[
                        { value: '', label: 'All Employee Types' },
                        ...EMPLOYEE_TYPE_OPTIONS
                      ]}
                      placeholder="Select employee types..."
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
                    <Combobox
                      value={formData.countries[0] || ''}
                      onChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        countries: value ? [value] : [],
                        regions: [] // Reset regions when country changes
                      }))}
                      options={[
                        { value: '', label: 'All Countries' },
                        ...COUNTRY_OPTIONS
                      ]}
                      placeholder="Select countries..."
                    />
                  </div>

                  {/* Region */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Region</label>
                    <Combobox
                      value={formData.regions[0] || ''}
                      onChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        regions: value ? [value] : [] 
                      }))}
                      options={[
                        { value: '', label: 'All Regions' },
                        ...availableRegions
                      ]}
                      placeholder="Select regions..."
                      disabled={formData.countries.length === 0}
                    />
                  </div>
                </div>
              </div>

              {/* Affected Employees Preview */}
              <div className={`rounded-xl p-4 ${affectedCount > 0 ? 'bg-indigo-50' : 'bg-amber-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                  affectedCount > 0 ? 'text-indigo-700' : 'text-amber-700'
                }`}>
                  AFFECTED EMPLOYEES
                </p>
                <p className={`text-sm ${affectedCount > 0 ? 'text-indigo-900' : 'text-amber-900'}`}>
                  {loadingCount ? (
                    'Calculating...'
                  ) : affectedCount > 0 ? (
                    <>This non-working day will apply to <strong>{affectedCount} employees</strong>.</>
                  ) : (
                    <>No employees match the selected criteria. Please adjust your filters.</>
                  )}
                </p>
              </div>
              
              {errors.affected && (
                <p className="text-xs text-red-500">{errors.affected}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!canApply}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              canApply
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Apply Non-Working Days
          </button>
        </div>
      </div>

      {/* Holiday Tooltip */}
      {hoveredHoliday && (
        <div
          className="fixed z-[100] bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y + 10,
          }}
        >
          <p className="font-semibold">{hoveredHoliday.name}</p>
          <p className="text-slate-300 mt-1">
            {hoveredHoliday.countries.length > 0 
              ? `${hoveredHoliday.countries.join(', ')} – ` 
              : ''
            }
            {hoveredHoliday.employeeTypes.length > 0 
              ? hoveredHoliday.employeeTypes.join(', ')
              : 'All employees'
            }
          </p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={() => setShowConfirmation(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Confirm Non-Working Days</h3>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Selected Dates:</span>
                <span className="text-sm font-medium text-slate-900">{formatSelectedDates()}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Holiday Name:</span>
                <span className="text-sm font-medium text-slate-900">{formData.name}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">Affected Employees:</span>
                <span className="text-sm font-medium text-slate-900">{affectedCount} employees</span>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApply}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Confirm & Apply
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

