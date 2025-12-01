import { NextResponse } from 'next/server'
import { testSupabaseConnection } from '@/lib/supabase/test-connection'

/**
 * API route to test Supabase connection
 * GET /api/test-connection
 */
export async function GET() {
  try {
    const result = await testSupabaseConnection()

    return NextResponse.json(result, {
      status: result.connected ? 200 : 500,
    })
  } catch (error) {
    console.error('Error in test-connection route:', error)
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Error in test-connection route handler',
      },
      { status: 500 }
    )
  }
}

