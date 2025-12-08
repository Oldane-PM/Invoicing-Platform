InstallTrigger is deprecated and will be removed in the future. commons.js:2:589527
Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools react-dom.development.js:38560:1
[Fast Refresh] rebuilding hot-reloader-client.tsx:297:15
[Fast Refresh] done in 2613ms hot-reloader-client.tsx:74:11
[Fast Refresh] done in 3254ms hot-reloader-client.tsx:74:11
The resource at “http://localhost:3001/_next/static/media/e4af272ccee01ff0-s.p.woff2” preloaded with link preload was not used within a few seconds. Make sure all attributes of the preload tag are set correctly. login
[Fast Refresh] rebuilding hot-reloader-client.tsx:297:15
[Fast Refresh] done in 2096ms hot-reloader-client.tsx:74:11
Error submitting hours: Error: Failed to create submission
    handleSubmitHours webpack-internal:///(app-pages-browser)/./app/page.tsx:665
app-index.tsx:25:20
Error submitting hours: Error: Failed to create submission
    handleSubmitHours webpack-internal:///(app-pages-browser)/./app/page.tsx:665
app-index.tsx:25:20
Error submitting hours: Error: Failed to create submission
    handleSubmitHours webpack-internal:///(app-pages-browser)/./app/page.tsx:665
app-index.tsx:25:20

​

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const manager = searchParams.get('manager')
    const month = searchParams.get('month')
    const search = searchParams.get('search')
    const contractorType = searchParams.get('contractorType')
    const project = searchParams.get('project')

    // Build query to get all submissions with employee and manager data
    // Order by most recent status change first, then by submission month
    let query = supabase
      .from('submissions')
      .select(
        `
        *,
        employee:employees!submissions_employee_id_fkey (
          id,
          name,
          email,
          role,
          hourly_rate,
          active_project
        ),
        manager:employees!submissions_manager_id_fkey (
          id,
          name,
          email
        )
      `)
      .order('updated_at', { ascending: false })
      .order('submission_date', { ascending: false })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (manager && manager !== 'all') {
      query = query.eq('manager_id', manager)
    }

    if (month && month !== 'all') {
      // Month format: "2024-12"
      const [year, monthNum] = month.split('-')
      const startDate = `${year}-${monthNum}-01`
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0]
      query = query.gte('submission_date', startDate).lte('submission_date', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching submissions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      )
    }

    let submissions = data || []

    // Apply search filter (client-side for flexibility)
    if (search) {
      const searchLower = search.toLowerCase()
      submissions = submissions.filter((s: any) =>
        s.employee?.name?.toLowerCase().includes(searchLower) ||
        s.employee?.email?.toLowerCase().includes(searchLower) ||
        s.employee?.role?.toLowerCase().includes(searchLower) ||
        s.employee?.active_project?.toLowerCase().includes(searchLower)
      )
    }

    // Apply contractor type filter (based on role)
    if (contractorType && contractorType !== 'all') {
      submissions = submissions.filter((s: any) =>
        s.employee?.role?.toLowerCase() === contractorType.toLowerCase()
      )
    }

    // Apply project filter
    if (project && project !== 'all') {
      submissions = submissions.filter((s: any) =>
        s.employee?.active_project === project
      )
    }

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('Error in admin submissions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
