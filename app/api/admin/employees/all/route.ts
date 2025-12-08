import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/admin/employees/all
 * Get all employees in the database (for search/add functionality)
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, name, email, hourly_rate, status')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching all employees:', error)
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      )
    }

    return NextResponse.json({ employees: employees || [] })
  } catch (error) {
    console.error('Error in admin all employees API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}










