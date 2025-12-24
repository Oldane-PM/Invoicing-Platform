import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

// Force dynamic to prevent static generation error
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/holidays
 * Fetch all holidays/non-working days
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { data: holidays, error } = await supabase
      .from('holidays')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching holidays:', error)
      return NextResponse.json({ holidays: [] })
    }

    // Parse the dates JSON field
    const formattedHolidays = (holidays || []).map(h => ({
      ...h,
      dates: Array.isArray(h.dates) ? h.dates : JSON.parse(h.dates || '[]'),
      projects: Array.isArray(h.projects) ? h.projects : JSON.parse(h.projects || '[]'),
      employeeTypes: Array.isArray(h.employee_types) ? h.employee_types : JSON.parse(h.employee_types || '[]'),
      countries: Array.isArray(h.countries) ? h.countries : JSON.parse(h.countries || '[]'),
      regions: Array.isArray(h.regions) ? h.regions : JSON.parse(h.regions || '[]'),
    }))

    return NextResponse.json({ holidays: formattedHolidays })
  } catch (error) {
    console.error('Unexpected error fetching holidays:', error)
    return NextResponse.json({ holidays: [] })
  }
}

/**
 * POST /api/admin/holidays
 * Create a new holiday/non-working day
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()
    const {
      name,
      description,
      type,
      dates,
      projects,
      employee_types,
      countries,
      regions,
    } = body

    if (!name || !dates || dates.length === 0) {
      return NextResponse.json(
        { error: 'Name and at least one date are required' },
        { status: 400 }
      )
    }

    // Normalize all dates to YYYY-MM-DD format (no time component)
    // This prevents timezone-related date shifts
    const normalizedDates = dates.map((dateStr: string) => {
      // If already in YYYY-MM-DD format, use as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr
      }
      // Extract date portion from ISO string
      const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
      if (match) {
        return match[1]
      }
      // Fallback: try to parse and extract date
      try {
        const date = new Date(dateStr)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } catch {
        return dateStr // Return as-is if parsing fails
      }
    })

    console.log('[Admin Holidays] Creating holiday with normalized dates:', {
      name,
      type,
      originalDates: dates.slice(0, 3),
      normalizedDates: normalizedDates.slice(0, 3),
    })

    // Insert the holiday with explicit UUID generation
    const { data: holiday, error } = await supabase
      .from('holidays')
      .insert({
        id: uuidv4(), // Explicitly generate UUID
        name,
        description: description || null,
        type: type || 'holiday',
        dates: JSON.stringify(normalizedDates),
        projects: JSON.stringify(projects || []),
        employee_types: JSON.stringify(employee_types || []),
        countries: JSON.stringify(countries || []),
        regions: JSON.stringify(regions || []),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating holiday:', error)
      
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Holidays table does not exist. Please run the database migration first.',
            hint: 'Run the SQL migration in Supabase SQL Editor to create the holidays table.'
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create holiday', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      holiday: {
        ...holiday,
        dates: JSON.parse(holiday.dates),
        projects: JSON.parse(holiday.projects || '[]'),
        employeeTypes: JSON.parse(holiday.employee_types || '[]'),
        countries: JSON.parse(holiday.countries || '[]'),
        regions: JSON.parse(holiday.regions || '[]'),
      },
    })
  } catch (error) {
    console.error('Unexpected error creating holiday:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/holidays
 * Delete a holiday by ID (passed in query params)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Holiday ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting holiday:', error)
      return NextResponse.json(
        { error: 'Failed to delete holiday' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error deleting holiday:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

