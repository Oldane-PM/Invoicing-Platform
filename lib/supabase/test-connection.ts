/**
 * Test function to verify Supabase connection
 * This can be called from an API route or server action to test connectivity
 */
import { supabase, isSupabaseConfigured } from './client'

export async function testSupabaseConnection() {
  try {
    // First check if environment variables are set
    const configured = isSupabaseConfigured()
    const envStatus = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Missing',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configured' : 'Missing',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
    }

    if (!configured) {
      return {
        connected: false,
        error: 'Supabase environment variables not configured',
        ...envStatus,
        solution: 'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart the dev server',
      }
    }

    // Try a simple query that should work even if tables don't exist yet
    // We'll query a non-existent table to test if Supabase responds
    try {
      const { error } = await supabase.from('_test_connection_table_does_not_exist').select('*').limit(0)
      
      if (error) {
        // Check error code to determine if it's a connection issue or just missing table
        // PGRST116 = relation does not exist (Supabase responded, table missing - OK)
        // 42P01 = relation does not exist (Postgres error - Supabase responded)
        if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
          // Table doesn't exist - this is fine, it means Supabase is responding correctly
          return {
            connected: true,
            message: 'Successfully connected to Supabase',
            note: 'Table does not exist (expected for test query) - Supabase is responding correctly',
            errorCode: error.code,
            ...envStatus,
          }
        } else if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
          return {
            connected: false,
            error: 'Invalid Supabase credentials',
            errorDetails: error.message,
            ...envStatus,
          }
        } else         if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
          return {
            connected: false,
            error: 'Failed to reach Supabase server - DNS lookup failed',
            errorDetails: error.message,
            ...envStatus,
            solution: 'Please verify your Supabase URL in .env.local. Get the correct URL from Supabase Dashboard > Settings > API > Project URL',
            urlFormat: 'Expected format: https://[your-project-ref].supabase.co',
          }
        } else {
          return {
            connected: false,
            error: error.message,
            errorCode: error.code,
            ...envStatus,
          }
        }
      }

      // If no error, connection is successful
      return {
        connected: true,
        message: 'Successfully connected to Supabase',
        ...envStatus,
      }
    } catch (queryError) {
      // If we catch an exception, it's likely a network/connection issue
      const errorMessage = queryError instanceof Error ? queryError.message : 'Unknown error'
      
      // Check for common error patterns
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        return {
          connected: false,
          error: 'Network error - unable to reach Supabase',
          errorDetails: errorMessage,
          ...envStatus,
        }
      }

      return {
        connected: false,
        error: errorMessage,
        details: 'Exception during connection test',
        ...envStatus,
      }
    }
  } catch (error) {
    console.error('Failed to test Supabase connection:', error)
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Error during connection test initialization',
    }
  }
}

