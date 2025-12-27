import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

// Force dynamic to prevent static generation error
export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/signup
 * Create a new user account
 * 
 * Note: This is a demo/mock signup endpoint.
 * In production, this would integrate with a proper auth provider (Supabase Auth, Auth0, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()
    const { name, email, password } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('employees')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing user:', checkError)
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Create new employee record
    // Note: In production, password would be hashed and stored securely
    // This demo stores users without password authentication
    const { data: newEmployee, error: insertError } = await supabase
      .from('employees')
      .insert({
        id: uuidv4(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: 'employee', // Default role (lowercase) - admin will assign proper role later
        status: 'ACTIVE', // Use ACTIVE status (constraint doesn't allow PENDING)
        onboarding_status: 'INCOMPLETE', // New employees must complete onboarding
        admin_approval_status: 'NOT_SUBMITTED', // Initial onboarding status
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating employee:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      })
      
      // Return more specific error messages for known issues
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }
      
      if (insertError.code === '42703') {
        // Column does not exist
        return NextResponse.json(
          { error: 'Database schema error. Please contact administrator.', details: insertError.message },
          { status: 500 }
        )
      }
      
      if (insertError.code === '23514') {
        // Check constraint violation
        return NextResponse.json(
          { error: 'Database constraint error. Please contact administrator.', details: insertError.message },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.', details: insertError.message },
        { status: 500 }
      )
    }

    console.log(`New user created: ${newEmployee.id} (${email})`)

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please wait for admin approval.',
      employeeId: newEmployee.id,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

