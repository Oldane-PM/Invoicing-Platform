import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

// Force dynamic to prevent static generation error
export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/signup
 * Create a new user account with Supabase Auth + Onboarding
 * 
 * Flow:
 * 1. Create auth.users entry via Supabase Auth
 * 2. Create onboarding_cases entry
 * 3. Return user details for login
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

    // Check if email already exists in auth
    const { data: existingAuthUser } = await supabase.auth.admin.listUsers()
    const emailExists = existingAuthUser?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (emailExists) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // Auto-confirm email for demo
      user_metadata: {
        name: name.trim(),
      },
    })

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // Create onboarding case
    const { data: onboardingCase, error: caseError } = await supabase
      .from('onboarding_cases')
      .insert({
        user_id: userId,
        current_state: 'draft',
      })
      .select('id')
      .single()

    if (caseError) {
      console.error('Error creating onboarding case:', caseError)
      // Clean up auth user if onboarding creation fails
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to initialize onboarding. Please try again.' },
        { status: 500 }
      )
    }

    // Create initial onboarding event
    await supabase.from('onboarding_events').insert({
      case_id: onboardingCase.id,
      event_type: 'case_created',
      actor_user_id: userId,
      payload: {},
    })

    console.log(`New user created: ${userId} (${email}) - Onboarding case: ${onboardingCase.id}`)

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Complete your onboarding to get started!',
      userId: userId,
      caseId: onboardingCase.id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

