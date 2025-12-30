import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * GET /api/diag/supabase-auth
 * 
 * Diagnostic endpoint to check Supabase Auth health
 * Returns connectivity, session status, and config validation
 */
export async function GET() {
  const timestamp = new Date().toISOString()
  const diagnostics: any = {
    timestamp,
    service: 'supabase-auth',
    checks: {},
    errors: [],
  }

  try {
    // Check 1: Environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    diagnostics.checks.envVars = {
      SUPABASE_URL_present: !!supabaseUrl,
      SUPABASE_URL_format: supabaseUrl ? supabaseUrl.startsWith('https://') : false,
      SUPABASE_ANON_KEY_present: !!supabaseAnonKey,
      SUPABASE_ANON_KEY_length: supabaseAnonKey ? supabaseAnonKey.length : 0,
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      diagnostics.errors.push('Missing required environment variables')
      return NextResponse.json(diagnostics, { status: 500 })
    }

    // Check 2: Create client
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    diagnostics.checks.clientCreated = true

    // Check 3: Try to get session (should return empty session, not error)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      diagnostics.checks.getSession = {
        success: !sessionError,
        hasSession: !!sessionData?.session,
        error: sessionError ? {
          message: sessionError.message,
          status: sessionError.status,
          name: sessionError.name,
        } : null,
      }

      if (sessionError) {
        diagnostics.errors.push(`getSession failed: ${sessionError.message}`)
      }
    } catch (err: any) {
      diagnostics.checks.getSession = {
        success: false,
        error: err.message,
      }
      diagnostics.errors.push(`getSession exception: ${err.message}`)
    }

    // Check 4: Try to reach auth endpoint (health check)
    try {
      const healthResponse = await fetch(`${supabaseUrl}/auth/v1/health`, {
        method: 'GET',
      })
      
      diagnostics.checks.authHealthEndpoint = {
        reachable: healthResponse.ok,
        status: healthResponse.status,
        statusText: healthResponse.statusText,
      }

      if (!healthResponse.ok) {
        diagnostics.errors.push(`Auth health endpoint returned ${healthResponse.status}`)
      }
    } catch (err: any) {
      diagnostics.checks.authHealthEndpoint = {
        reachable: false,
        error: err.message,
      }
      diagnostics.errors.push(`Cannot reach auth health endpoint: ${err.message}`)
    }

    // Overall health
    diagnostics.healthy = diagnostics.errors.length === 0

    const statusCode = diagnostics.healthy ? 200 : 503
    return NextResponse.json(diagnostics, { status: statusCode })

  } catch (error: any) {
    diagnostics.checks.exception = error.message
    diagnostics.errors.push(`Unexpected error: ${error.message}`)
    diagnostics.healthy = false

    return NextResponse.json(diagnostics, { status: 500 })
  }
}

