import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
  try {
    // Get total employees count
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, role')
      .eq('role', 'employee')

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
    }

    const totalEmployees = employees?.length || 0

    // Get all submissions for stats
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select(`
        id,
        status,
        hours_submitted,
        overtime_hours,
        submission_date,
        employee:employees!submissions_employee_id_fkey (
          hourly_rate
        )
      `)

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError)
    }

    const allSubmissions = submissions || []

    // Calculate pending reviews (status = 'SUBMITTED' or 'MANAGER_APPROVED' awaiting admin action)
    const pendingReviews = allSubmissions.filter(s => 
      s.status === 'SUBMITTED' || s.status === 'MANAGER_APPROVED'
    ).length

    // Calculate total payout this month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const thisMonthPaid = allSubmissions.filter(s => {
      const submissionDate = new Date(s.submission_date)
      return s.status === 'ADMIN_PAID' &&
        submissionDate >= startOfMonth &&
        submissionDate <= endOfMonth
    })

    let totalPayout = 0
    thisMonthPaid.forEach(s => {
      const hourlyRate = (s.employee as any)?.hourly_rate || 0
      const totalHours = (s.hours_submitted || 0) + (s.overtime_hours || 0)
      totalPayout += totalHours * hourlyRate
    })

    // Calculate growth (compare this month vs last month paid submissions)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const lastMonthPaid = allSubmissions.filter(s => {
      const submissionDate = new Date(s.submission_date)
      return s.status === 'ADMIN_PAID' &&
        submissionDate >= startOfLastMonth &&
        submissionDate <= endOfLastMonth
    })

    let lastMonthPayout = 0
    lastMonthPaid.forEach(s => {
      const hourlyRate = (s.employee as any)?.hourly_rate || 0
      const totalHours = (s.hours_submitted || 0) + (s.overtime_hours || 0)
      lastMonthPayout += totalHours * hourlyRate
    })

    // Calculate growth percentage
    let growthPercentage = 0
    if (lastMonthPayout > 0) {
      growthPercentage = Math.round(((totalPayout - lastMonthPayout) / lastMonthPayout) * 100)
    } else if (totalPayout > 0) {
      growthPercentage = 100 // If last month was 0 but this month has value
    }

    // Active employees (those with submissions in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const activeEmployeeIds = new Set(
      allSubmissions
        .filter(s => new Date(s.submission_date) >= thirtyDaysAgo)
        .map(s => (s as any).employee_id)
    )
    const activeEmployees = activeEmployeeIds.size

    return NextResponse.json({
      stats: {
        totalEmployees,
        activeEmployees: activeEmployees || totalEmployees,
        pendingReviews,
        totalPayout,
        growthPercentage,
      }
    })
  } catch (error) {
    console.error('Error in admin stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

