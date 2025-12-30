/**
 * Supabase Auth Smoke Test
 * 
 * Run: npx ts-node scripts/supabaseAuthSmokeTest.ts
 * Or: npm run test:auth-smoke
 * 
 * Tests:
 * 1. Environment variables are set
 * 2. Can create Supabase client
 * 3. Can sign in with test credentials
 * 4. Can get user session
 * 5. Can get user details
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof COLORS = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

function logCheck(passed: boolean, message: string) {
  if (passed) {
    log(`✅ ${message}`, 'green')
  } else {
    log(`❌ ${message}`, 'red')
  }
}

async function runSmokeTest() {
  log('\n╔═══════════════════════════════════════════════════╗', 'cyan')
  log('║  Supabase Auth Smoke Test                        ║', 'cyan')
  log('╚═══════════════════════════════════════════════════╝\n', 'cyan')

  let exitCode = 0

  try {
    // Test 1: Environment Variables
    log('📋 Test 1: Environment Variables', 'blue')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    logCheck(!!supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL is set')
    logCheck(!!supabaseAnonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is set')
    
    if (supabaseUrl) {
      log(`   URL: ${supabaseUrl.substring(0, 35)}...`, 'cyan')
    }
    if (supabaseAnonKey) {
      log(`   Key length: ${supabaseAnonKey.length} chars`, 'cyan')
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      log('\n❌ Missing required environment variables', 'red')
      log('   Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY', 'yellow')
      process.exit(1)
    }

    console.log('')

    // Test 2: Create Client
    log('📋 Test 2: Create Supabase Client', 'blue')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    logCheck(!!supabase, 'Supabase client created')
    console.log('')

    // Test 3: Check Auth Health
    log('📋 Test 3: Auth Service Health', 'blue')
    try {
      const healthResponse = await fetch(`${supabaseUrl}/auth/v1/health`)
      logCheck(healthResponse.ok, `Auth health endpoint reachable (${healthResponse.status})`)
    } catch (err: any) {
      logCheck(false, `Auth health endpoint: ${err.message}`)
      exitCode = 1
    }
    console.log('')

    // Test 4: Sign In
    log('📋 Test 4: Sign In with Test Credentials', 'blue')
    
    // Try multiple test accounts
    const testAccounts = [
      { email: 'admin@test.com', password: 'admin123456', role: 'Admin' },
      { email: 'employee@test.com', password: 'employee123456', role: 'Employee' },
      { email: 'new@test.com', password: 'new123456', role: 'New User' },
    ]

    let signInSuccess = false
    let sessionData: any = null

    for (const account of testAccounts) {
      log(`   Trying: ${account.email} (${account.role})`, 'cyan')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      })

      if (error) {
        if (error.status && error.status >= 500) {
          log(`   ❌ Server Error (${error.status}): ${error.message}`, 'red')
          log(`      This is a Supabase service issue, not credentials!`, 'yellow')
          exitCode = 1
          break
        } else {
          log(`   ⚠️  Login failed: ${error.message}`, 'yellow')
        }
      } else if (data.session) {
        log(`   ✅ Login successful!`, 'green')
        log(`      User ID: ${data.user.id}`, 'cyan')
        log(`      Email: ${data.user.email}`, 'cyan')
        signInSuccess = true
        sessionData = data
        break
      }
    }

    logCheck(signInSuccess, 'Successfully signed in with test account')
    console.log('')

    if (!signInSuccess) {
      log('❌ Could not sign in with any test account', 'red')
      log('   Possible causes:', 'yellow')
      log('   1. Test users not created (run SUPABASE_CLEAN_AND_SEED.sql)', 'yellow')
      log('   2. Supabase Auth service down (check dashboard)', 'yellow')
      log('   3. Database error (check Supabase logs)', 'yellow')
      process.exit(1)
    }

    // Test 5: Get Session
    log('📋 Test 5: Get Current Session', 'blue')
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    
    logCheck(!sessionError && !!session.session, 'Session retrieved')
    if (session.session) {
      log(`   Session valid until: ${new Date(session.session.expires_at! * 1000).toISOString()}`, 'cyan')
    }
    console.log('')

    // Test 6: Get User
    log('📋 Test 6: Get User Details', 'blue')
    const { data: user, error: userError } = await supabase.auth.getUser()
    
    logCheck(!userError && !!user.user, 'User details retrieved')
    if (user.user) {
      log(`   User ID: ${user.user.id}`, 'cyan')
      log(`   Email: ${user.user.email}`, 'cyan')
      log(`   Created: ${new Date(user.user.created_at).toISOString()}`, 'cyan')
    }
    console.log('')

    // Test 7: Query Database
    log('📋 Test 7: Query Database (RLS Check)', 'blue')
    const { data: employees, error: dbError } = await supabase
      .from('employees')
      .select('id, name, role')
      .limit(3)
    
    logCheck(!dbError, 'Database query succeeded')
    if (employees) {
      log(`   Found ${employees.length} employees`, 'cyan')
      employees.forEach((emp) => {
        log(`   - ${emp.name} (${emp.role})`, 'cyan')
      })
    } else if (dbError) {
      log(`   Error: ${dbError.message} (${dbError.code})`, 'red')
      exitCode = 1
    }
    console.log('')

    // Summary
    if (exitCode === 0) {
      log('╔═══════════════════════════════════════════════════╗', 'green')
      log('║  ✅ ALL TESTS PASSED!                            ║', 'green')
      log('║  Supabase Auth is healthy and working            ║', 'green')
      log('╚═══════════════════════════════════════════════════╝\n', 'green')
    } else {
      log('╔═══════════════════════════════════════════════════╗', 'red')
      log('║  ❌ TESTS FAILED                                 ║', 'red')
      log('║  Check errors above for details                   ║', 'red')
      log('╚═══════════════════════════════════════════════════╝\n', 'red')
    }

  } catch (error: any) {
    log('\n❌ Unexpected error during smoke test:', 'red')
    console.error(error)
    exitCode = 1
  }

  process.exit(exitCode)
}

// Run the test
runSmokeTest()

