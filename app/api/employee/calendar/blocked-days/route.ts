import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface BlockedDay {
  date: string // Always YYYY-MM-DD format
  type: 'HOLIDAY' | 'SPECIAL_DAY_OFF'
  name: string
  reason: string
  isPaid?: boolean
}

/**
 * Normalize a date to YYYY-MM-DD format (date-only, no timezone issues)
 * 
 * IMPORTANT: We parse dates as strings and extract only the date portion
 * to avoid any timezone-related shifts.
 */
function normalizeDateToYYYYMMDD(dateInput: string | Date): string {
  if (!dateInput) return ''
  
  const dateStr = typeof dateInput === 'string' ? dateInput : dateInput.toISOString()
  
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // Extract YYYY-MM-DD from ISO string or other formats
  // Handle formats like: "2025-12-25T00:00:00.000Z", "2025-12-25T05:00:00.000Z"
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) {
    return match[1]
  }
  
  // Fallback: try to parse and extract date portion
  // Use substring to avoid timezone shifting
  try {
    // Parse without timezone interpretation
    const parts = dateStr.split(/[T\s]/)
    if (parts[0] && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
      return parts[0]
    }
  } catch {
    // ignore
  }
  
  return ''
}

/**
 * Check if dateA is within the range [startDate, endDate] using string comparison
 * All dates must be in YYYY-MM-DD format
 */
function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  if (!date || !startDate || !endDate) return false
  return date >= startDate && date <= endDate
}

/**
 * GET /api/employee/calendar/blocked-days
 * 
 * Fetches blocked (non-working) days for an employee based on their context.
 * 
 * IMPORTANT: This endpoint ALWAYS includes company-wide holidays.
 * Scoped holidays are only filtered if they have explicit scope settings.
 * 
 * Query params:
 * - employeeId (required)
 * - projectId (optional)
 * - employeeType (optional) - defaults to 'employee'
 * - country (optional)
 * - region (optional)
 * - startDate (required) - YYYY-MM-DD
 * - endDate (required) - YYYY-MM-DD
 * 
 * Response headers include cache-control: no-store to prevent stale data.
 */
export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7) // For logging
  
  try {
    const { searchParams } = new URL(request.url)
    
    const employeeId = searchParams.get('employeeId')
    const projectId = searchParams.get('projectId')
    const employeeType = searchParams.get('employeeType')?.toLowerCase() || 'employee'
    const country = searchParams.get('country')
    const region = searchParams.get('region')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Validate required params
    if (!employeeId) {
      return NextResponse.json(
        { error: 'employeeId is required', blockedDays: [] },
        { status: 400 }
      )
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required (YYYY-MM-DD format)', blockedDays: [] },
        { status: 400 }
      )
    }

    // Normalize input dates
    const normalizedStartDate = normalizeDateToYYYYMMDD(startDate)
    const normalizedEndDate = normalizeDateToYYYYMMDD(endDate)

    if (!normalizedStartDate || !normalizedEndDate) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.', blockedDays: [] },
        { status: 400 }
      )
    }

    // Log the request for debugging
    console.log(`[blocked-days:${requestId}] Fetching blocked days:`, {
      employeeId,
      projectId,
      employeeType,
      country,
      region,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
    })

    // Fetch ALL holidays (we filter in code, not in query)
    // This ensures we never accidentally exclude company-wide dates
    const { data: holidays, error } = await supabase
      .from('holidays')
      .select('*')

    if (error) {
      console.error(`[blocked-days:${requestId}] Database error:`, error)
      
      // Return error response, not empty - so UI can show error state
      return NextResponse.json(
        { 
          error: 'Failed to fetch non-working days from database',
          details: error.message,
          blockedDays: [],
          success: false,
        },
        { 
          status: 500,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
        }
      )
    }

    console.log(`[blocked-days:${requestId}] Found ${holidays?.length || 0} holiday records in database`)

    const blockedDays: BlockedDay[] = []
    const context = { projectId, employeeType, country, region }

    // Process each holiday
    for (const holiday of holidays || []) {
      // Skip inactive holidays
      if (holiday.is_active === false) {
        continue
      }

      // Check if holiday applies to this employee context
      // IMPORTANT: Company-wide holidays (applies_to_all_* = true or null) are ALWAYS included
      if (!doesHolidayApply(holiday, context)) {
        console.log(`[blocked-days:${requestId}] Holiday "${holiday.name}" filtered out for context:`, context)
        continue
      }

      // Parse the dates from the holiday record
      const holidayDates = parseHolidayDates(holiday.dates)

      // Filter dates within the requested range
      for (const rawDateStr of holidayDates) {
        const dateOnly = normalizeDateToYYYYMMDD(rawDateStr)
        
        if (!dateOnly) {
          console.warn(`[blocked-days:${requestId}] Could not normalize date:`, rawDateStr)
          continue
        }
        
        // Check if date is within range using string comparison (no timezone issues)
        if (isDateInRange(dateOnly, normalizedStartDate, normalizedEndDate)) {
          blockedDays.push({
            date: dateOnly, // Always YYYY-MM-DD
            type: holiday.type === 'special_time_off' ? 'SPECIAL_DAY_OFF' : 'HOLIDAY',
            name: holiday.name,
            reason: holiday.type === 'special_time_off' ? 'Admin Special Day Off' : 'Admin Holiday',
            isPaid: holiday.is_paid ?? true,
          })
        }
      }
    }

    // Sort by date (string comparison works for YYYY-MM-DD)
    blockedDays.sort((a, b) => a.date.localeCompare(b.date))

    // Remove duplicates (same date might be in multiple holidays)
    const uniqueBlockedDays = blockedDays.filter((day, index, self) =>
      index === self.findIndex(d => d.date === day.date)
    )

    // Log the results for debugging
    console.log(`[blocked-days:${requestId}] Returning ${uniqueBlockedDays.length} blocked days:`, 
      uniqueBlockedDays.slice(0, 3).map(d => `${d.date} (${d.name})`)
    )

    const response = NextResponse.json({
      success: true,
      blockedDays: uniqueBlockedDays,
      meta: {
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        employeeId,
        projectId,
        employeeType,
        country,
        region,
        totalBlocked: uniqueBlockedDays.length,
        fetchedAt: new Date().toISOString(),
      }
    })

    // CRITICAL: Prevent caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error(`[blocked-days] Unexpected error:`, error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        blockedDays: [],
        success: false,
      },
      { 
        status: 500,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      }
    )
  }
}

/**
 * Parse holiday dates from various formats to string array
 */
function parseHolidayDates(datesField: any): string[] {
  if (!datesField) return []
  
  if (Array.isArray(datesField)) {
    return datesField.map(d => String(d))
  }
  
  if (typeof datesField === 'string') {
    try {
      const parsed = JSON.parse(datesField)
      return Array.isArray(parsed) ? parsed.map(d => String(d)) : []
    } catch {
      return []
    }
  }
  
  return []
}

/**
 * Check if a holiday applies to the given employee context.
 * 
 * CRITICAL: Company-wide holidays (where applies_to_all_* is true, null, or undefined)
 * are ALWAYS included. We only filter out a holiday if it has explicit scope
 * restrictions AND the employee doesn't match.
 */
function doesHolidayApply(
  holiday: any,
  context: {
    projectId: string | null
    employeeType: string | null | undefined
    country: string | null
    region: string | null
  }
): boolean {
  // Helper to check if a scope is explicitly restricted (not global)
  const isScopeRestricted = (appliesTo: any, scopeArray: any): boolean => {
    // If applies_to_all is true, null, or undefined, the scope is NOT restricted
    if (appliesTo === true || appliesTo === null || appliesTo === undefined) {
      return false
    }
    // If applies_to_all is false AND there are items in the scope array, it's restricted
    const items = parseJsonArray(scopeArray)
    return appliesTo === false && items.length > 0
  }

  // Check project scope - only filter if explicitly restricted
  if (isScopeRestricted(holiday.applies_to_all_projects, holiday.projects)) {
    const projectIds = parseJsonArray(holiday.projects)
    // If employee has a project and it's not in the list, exclude
    if (context.projectId && !projectIds.includes(context.projectId)) {
      return false
    }
    // If employee has no project but holiday is project-specific, still include
    // (safer to show than hide)
  }

  // Check employee type scope - only filter if explicitly restricted
  if (isScopeRestricted(holiday.applies_to_all_employee_types, holiday.employee_types)) {
    const employeeTypes = parseJsonArray(holiday.employee_types).map(t => t.toLowerCase())
    if (context.employeeType) {
      const normalizedType = normalizeEmployeeType(context.employeeType)
      const matches = employeeTypes.some(t => normalizeEmployeeType(t) === normalizedType)
      if (!matches) {
        return false
      }
    }
    // If employee has no type specified, still include (safer to show)
  }

  // Check location scope - only filter if explicitly restricted
  if (isScopeRestricted(holiday.applies_to_all_locations, holiday.countries)) {
    const countries = parseJsonArray(holiday.countries).map(c => c.toLowerCase())
    
    if (context.country) {
      if (!countries.includes(context.country.toLowerCase())) {
        return false
      }
      
      // Check region only if holiday has region restrictions
      const regions = parseJsonArray(holiday.regions).map(r => r.toLowerCase())
      if (regions.length > 0 && context.region) {
        if (!regions.includes(context.region.toLowerCase())) {
          return false
        }
      }
    }
    // If employee has no country, still include (safer to show)
  }

  // Holiday applies to this employee
  return true
}

/**
 * Parse a JSON array field that might be string or already parsed
 */
function parseJsonArray(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Normalize employee type for comparison
 */
function normalizeEmployeeType(type: string): string {
  const normalized = type.toLowerCase().trim()
  
  // Map variations to standard types
  const typeMap: Record<string, string> = {
    'employee': 'employee',
    'full-time': 'employee',
    'full_time': 'employee',
    'fulltime': 'employee',
    'contractor': 'contractor',
    'freelancer': 'contractor',
    'part-time': 'part_time',
    'part_time': 'part_time',
    'parttime': 'part_time',
    'intern': 'intern',
  }

  return typeMap[normalized] || normalized
}
