import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * GET /api/diag/supabase-db
 * 
 * Diagnostic endpoint to check Supabase Database health
 * Tests connectivity and basic query execution
 */
export async function GET() {
  const timestamp = new Date().toISOString()
  const diagnostics: any = {
    timestamp,
    service: 'supabase-db',
    checks: {},
    errors: [],
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      diagnostics.errors.push('Missing environment variables')
      return NextResponse.json(diagnostics, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    diagnostics.checks.clientCreated = true

    // Check 1: Simple query (check if we can reach PostgREST)
    try {
      const startTime = Date.now()
      
      // Try to query a known table (employees should exist)
      const { data, error, count } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .limit(0)
      
      const queryTime = Date.now() - startTime

      diagnostics.checks.simpleQuery = {
        success: !error,
        responseTime: `${queryTime}ms`,
        tableAccessible: !error,
        error: error ? {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        } : null,
      }

      if (error) {
        diagnostics.errors.push(`Query failed: ${error.message} (${error.code})`)
      }
    } catch (err: any) {
      diagnostics.checks.simpleQuery = {
        success: false,
        error: err.message,
      }
      diagnostics.errors.push(`Query exception: ${err.message}`)
    }

    // Check 2: RLS status (for common tables)
    try {
      const { data: rlsData, error: rlsError } = await supabase.rpc('get_rls_status', {}).limit(1)
      
      diagnostics.checks.rlsQueryable = {
        success: !rlsError,
        error: rlsError ? rlsError.message : null,
      }
    } catch (err: any) {
      // RPC might not exist, that's okay
      diagnostics.checks.rlsQueryable = {
        success: false,
        note: 'RPC function not available (this is okay)',
      }
    }

    // Check 3: PostgREST reachability
    try {
      const restResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      })

      diagnostics.checks.postgrestReachable = {
        reachable: restResponse.ok || restResponse.status === 404, // 404 is expected for root
        status: restResponse.status,
      }
    } catch (err: any) {
      diagnostics.checks.postgrestReachable = {
        reachable: false,
        error: err.message,
      }
      diagnostics.errors.push(`Cannot reach PostgREST: ${err.message}`)
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

