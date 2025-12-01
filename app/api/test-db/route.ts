import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * API route to test database connectivity and table access
 * GET /api/test-db
 */
export async function GET() {
  try {
    const results: any = {
      connected: true,
      tables: {},
    }

    // Test each table
    const tables = ['employees', 'projects', 'submissions', 'team_members', 'notifications', 'invoices']

    for (const table of tables) {
      try {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          results.tables[table] = {
            accessible: false,
            error: error.message,
          }
        } else {
          results.tables[table] = {
            accessible: true,
            count: count || 0,
          }
        }
      } catch (err) {
        results.tables[table] = {
          accessible: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

