import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') as 'employee' | 'manager' | 'admin' | null
    const email = searchParams.get('email')

    // If email is provided, lookup by email (for login form)
    if (email) {
      const { data: emailUser, error: emailError } = await supabase
        .from('employees')
        .select('id, name, email, role, status')
        .eq('email', email.toLowerCase())
        .maybeSingle()

      if (emailError) {
        console.error('Email lookup error:', emailError)
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      if (!emailUser) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Check if user is pending approval
      if (emailUser.status === 'PENDING') {
        return NextResponse.json(
          { error: 'Your account is pending admin approval' },
          { status: 403 }
        )
      }

      return NextResponse.json({
        employeeId: emailUser.id,
        name: emailUser.name,
        email: emailUser.email,
        role: emailUser.role
      })
    }

    // Role-based lookup (for demo/testing)
    if (!role) {
      return NextResponse.json(
        { error: 'Role or email parameter is required' },
        { status: 400 }
      )
    }

    // Fetch an employee based on role
    // Note: Not filtering by status since it may not exist in all schemas
    let query = supabase
      .from('employees')
      .select('id, name, email, role, status')
      .limit(1)

    // Filter by role
    if (role === 'admin') {
      query = query.eq('role', 'admin')
    } else if (role === 'manager') {
      query = query.eq('role', 'manager')
    } else {
      // For employee role, get anyone who's not admin/manager
      query = query.in('role', ['employee', 'contractor'])
    }

    const { data, error } = await query.single()

    if (error) {
      console.error('Supabase error:', error)
      
      // If no employee found for that role, return a helpful message
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { 
            error: `No ${role} found in database. Please create test employees first.`,
            hint: 'Run database migrations and seed data'
          },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch employee data' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { 
          error: `No ${role} found in database. Please create test employees first.`,
          hint: 'You need to add employees to your database'
        },
        { status: 404 }
      )
    }

    // Return employee ID
    return NextResponse.json({
      employeeId: data.id,
      name: data.name,
      email: data.email,
      role: data.role
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

