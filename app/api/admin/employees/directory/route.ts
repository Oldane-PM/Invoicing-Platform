import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

/**
 * GET /api/admin/employees/directory
 * Get all employees with full details for the Employee Directory page
 */
export async function GET() {
  try {

    // Fetch ALL employees from the database with all columns
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .order('name', { ascending: true })

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      )
    }

    // Get manager names for reporting_manager_id references
    const managerIds = (employees || [])
      .map(emp => emp.reporting_manager_id)
      .filter((id): id is string => id !== null && id !== undefined)
    
    let managerNameMap = new Map<string, string>()
    if (managerIds.length > 0) {
      const { data: managers } = await supabase
        .from('employees')
        .select('id, name')
        .in('id', managerIds)
      
      if (managers) {
        for (const m of managers) {
          managerNameMap.set(m.id, m.name)
        }
      }
    }

    // Map employees with their details directly from the employees table
    const employeesWithDetails = (employees || []).map((emp: any) => {
      // Normalize status - handle various formats
      let normalizedStatus = 'active'
      if (emp.status) {
        const statusLower = emp.status.toLowerCase()
        if (statusLower === 'inactive' || statusLower === 'suspended' || statusLower === 'pending') {
          normalizedStatus = statusLower
        }
      }

      // Determine rate type from database or infer from rates
      const rateType = emp.rate_type || (emp.hourly_rate ? 'hourly' : 'fixed')
      
      // Calculate monthly rate if not set (160 hours * hourly rate)
      const monthlyRate = emp.monthly_rate || (emp.hourly_rate ? emp.hourly_rate * 160 : null)

      // Get manager name from lookup
      const managerName = emp.reporting_manager_id 
        ? managerNameMap.get(emp.reporting_manager_id) || null 
        : null

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        contract_start_date: emp.contract_start_date || emp.created_at || null,
        contract_end_date: emp.contract_end_date || null,
        rate_type: rateType as 'hourly' | 'fixed',
        hourly_rate: emp.hourly_rate || null,
        monthly_rate: monthlyRate,
        overtime_rate: emp.overtime_rate || (emp.hourly_rate ? Math.round(emp.hourly_rate * 1.5) : null),
        position: emp.position || emp.active_project || null,
        contract_type: emp.contract_type || null,
        reporting_manager_id: emp.reporting_manager_id || null,
        reporting_manager_name: managerName,
        status: normalizedStatus,
        role: emp.role || 'employee',
        country: emp.country || null,
        region: emp.region || null,
        onboarding_status: emp.onboarding_status || null,
      }
    })

    return NextResponse.json({ employees: employeesWithDetails })
  } catch (error) {
    console.error('Error in admin employees directory API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
