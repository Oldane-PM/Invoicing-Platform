/**
 * Data Access Layer: Holidays / Blocked Days
 * 
 * All holiday-related database operations go through this module.
 */

import { supabase } from '@/lib/supabase/client'

export interface Holiday {
  id: string
  name: string
  description?: string | null
  type: 'holiday' | 'special_time_off'
  dates: string[] // Array of YYYY-MM-DD strings
  projects?: string[]
  employee_types?: string[]
  countries?: string[]
  regions?: string[]
  is_active: boolean
  is_paid: boolean
  applies_to_all_projects: boolean
  applies_to_all_employee_types: boolean
  applies_to_all_locations: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface BlockedDay {
  date: string // YYYY-MM-DD
  type: 'HOLIDAY' | 'SPECIAL_DAY_OFF'
  name: string
  reason: string
  isPaid?: boolean
}

export interface HolidayPayload {
  name: string
  description?: string
  type: 'holiday' | 'special_time_off'
  dates: string[]
  projects?: string[]
  employee_types?: string[]
  countries?: string[]
  regions?: string[]
  is_active?: boolean
  is_paid?: boolean
  applies_to_all_projects?: boolean
  applies_to_all_employee_types?: boolean
  applies_to_all_locations?: boolean
  created_by?: string
}

// ============================================
// LIST HOLIDAYS
// ============================================
export async function listHolidays(filters?: { isActive?: boolean }): Promise<Holiday[]> {
  let query = supabase
    .from('holidays')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive)
  }

  const { data, error } = await query

  if (error) {
    console.error('[DAL] Error fetching holidays:', error)
    throw new Error(`Failed to fetch holidays: ${error.message}`)
  }

  // Parse JSON fields
  return (data || []).map(h => ({
    ...h,
    dates: parseJsonArray(h.dates),
    projects: parseJsonArray(h.projects),
    employee_types: parseJsonArray(h.employee_types),
    countries: parseJsonArray(h.countries),
    regions: parseJsonArray(h.regions),
  }))
}

// ============================================
// GET BLOCKED DAYS FOR EMPLOYEE
// ============================================
export async function getBlockedDaysForEmployee(scope: {
  employeeId: string
  startDate: string
  endDate: string
  employeeType?: string
  projectId?: string
  country?: string
  region?: string
}): Promise<BlockedDay[]> {
  // Fetch all active holidays
  const { data: holidays, error } = await supabase
    .from('holidays')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('[DAL] Error fetching holidays for blocked days:', error)
    throw new Error(`Failed to fetch blocked days: ${error.message}`)
  }

  const blockedDays: BlockedDay[] = []

  for (const holiday of holidays || []) {
    // Check if holiday applies to this employee context
    if (!doesHolidayApply(holiday, scope)) {
      continue
    }

    // Parse dates
    const holidayDates = parseJsonArray(holiday.dates)

    // Filter dates within range
    for (const dateStr of holidayDates) {
      const dateOnly = dateStr.split('T')[0]
      if (dateOnly >= scope.startDate && dateOnly <= scope.endDate) {
        blockedDays.push({
          date: dateOnly,
          type: holiday.type === 'special_time_off' ? 'SPECIAL_DAY_OFF' : 'HOLIDAY',
          name: holiday.name,
          reason: holiday.description || (holiday.type === 'special_time_off' ? 'Special Day Off' : 'Holiday'),
          isPaid: holiday.is_paid ?? true,
        })
      }
    }
  }

  // Sort and deduplicate
  blockedDays.sort((a, b) => a.date.localeCompare(b.date))
  return blockedDays.filter((day, index, self) =>
    index === self.findIndex(d => d.date === day.date)
  )
}

// ============================================
// CREATE HOLIDAY
// ============================================
export async function createHoliday(payload: HolidayPayload): Promise<Holiday> {
  const { data, error } = await supabase
    .from('holidays')
    .insert({
      name: payload.name,
      description: payload.description || null,
      type: payload.type || 'holiday',
      dates: JSON.stringify(payload.dates),
      projects: JSON.stringify(payload.projects || []),
      employee_types: JSON.stringify(payload.employee_types || []),
      countries: JSON.stringify(payload.countries || []),
      regions: JSON.stringify(payload.regions || []),
      is_active: payload.is_active ?? true,
      is_paid: payload.is_paid ?? true,
      applies_to_all_projects: payload.applies_to_all_projects ?? true,
      applies_to_all_employee_types: payload.applies_to_all_employee_types ?? true,
      applies_to_all_locations: payload.applies_to_all_locations ?? true,
      created_by: payload.created_by || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[DAL] Error creating holiday:', error)
    throw new Error(`Failed to create holiday: ${error.message}`)
  }

  return {
    ...data,
    dates: parseJsonArray(data.dates),
    projects: parseJsonArray(data.projects),
    employee_types: parseJsonArray(data.employee_types),
    countries: parseJsonArray(data.countries),
    regions: parseJsonArray(data.regions),
  }
}

// ============================================
// DELETE HOLIDAY
// ============================================
export async function deleteHoliday(holidayId: string): Promise<void> {
  const { error } = await supabase
    .from('holidays')
    .delete()
    .eq('id', holidayId)

  if (error) {
    console.error('[DAL] Error deleting holiday:', error)
    throw new Error(`Failed to delete holiday: ${error.message}`)
  }
}

// ============================================
// HELPERS
// ============================================
function parseJsonArray(value: any): string[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return []
    }
  }
  return []
}

function doesHolidayApply(
  holiday: any,
  context: {
    projectId?: string
    employeeType?: string
    country?: string
    region?: string
  }
): boolean {
  // Project scope
  if (holiday.applies_to_all_projects === false) {
    const projectIds = parseJsonArray(holiday.projects)
    if (projectIds.length > 0 && context.projectId && !projectIds.includes(context.projectId)) {
      return false
    }
  }

  // Employee type scope
  if (holiday.applies_to_all_employee_types === false) {
    const types = parseJsonArray(holiday.employee_types).map((t: string) => t.toLowerCase())
    if (types.length > 0 && context.employeeType) {
      const contextType = context.employeeType.toLowerCase()
      if (!types.includes(contextType)) {
        return false
      }
    }
  }

  // Location scope
  if (holiday.applies_to_all_locations === false) {
    const countries = parseJsonArray(holiday.countries).map((c: string) => c.toLowerCase())
    const regions = parseJsonArray(holiday.regions).map((r: string) => r.toLowerCase())
    
    if (countries.length > 0 && context.country) {
      if (!countries.includes(context.country.toLowerCase())) {
        return false
      }
    }
    
    if (regions.length > 0 && context.region) {
      if (!regions.includes(context.region.toLowerCase())) {
        return false
      }
    }
  }

  return true
}

