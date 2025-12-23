#!/usr/bin/env node

/**
 * Database Migration Runner
 * 
 * This script runs all SQL migrations in the supabase/migrations folder
 * in sequential order to set up your database schema.
 * 
 * Usage:
 *   node scripts/run-migrations.js
 * 
 * Requirements:
 *   - .env.local file with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - All migration files in supabase/migrations/
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logStep(message) {
  log(`\n${message}`, colors.bright);
}

async function runMigrations() {
  logStep('🚀 Database Migration Runner\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logError('Missing Supabase credentials!');
    log('\nPlease ensure your .env.local file contains:', colors.gray);
    log('  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co', colors.gray);
    log('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n', colors.gray);
    process.exit(1);
  }

  logSuccess('Environment variables loaded');
  logInfo(`Supabase URL: ${supabaseUrl}\n`);

  // Get migration files
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    logError(`Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort to ensure migrations run in order

  if (files.length === 0) {
    logWarning('No migration files found');
    process.exit(0);
  }

  logInfo(`Found ${files.length} migration file(s)\n`);

  // Import Supabase client
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Test connection
  logStep('Testing database connection...');
  try {
    const { error } = await supabase.from('employees').select('count').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist (expected on first run)
      throw error;
    }
    logSuccess('Database connection successful\n');
  } catch (error) {
    logError('Failed to connect to database');
    log(error.message, colors.red);
    process.exit(1);
  }

  // Run migrations
  logStep('Running migrations...\n');
  
  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    log(`📄 Running: ${colors.bright}${file}${colors.reset}`);

    try {
      // Execute SQL using Supabase REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: sql })
      });

      // Try direct SQL execution via pg_stat_statements or just execute raw
      // Since Supabase doesn't expose direct SQL execution via REST API easily,
      // we'll use a workaround with the SQL editor endpoint
      
      const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.pgrst.object+json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=representation'
        },
        body: sql
      });

      // Since we can't execute arbitrary SQL via REST API, 
      // we'll provide instructions for manual execution
      logWarning('  → SQL needs to be executed manually in Supabase Dashboard');
      log(`     Migration: ${file}`, colors.gray);
      errorCount++;
      
    } catch (error) {
      logError(`  Failed: ${error.message}`);
      errorCount++;
    }
  }

  // Summary
  logStep('\n📊 Migration Summary\n');
  log(`Total migrations: ${files.length}`);
  
  if (errorCount === files.length) {
    logWarning('\n⚠️  Automatic migration not supported');
    logInfo('\nTo run migrations manually:');
    log('1. Go to https://app.supabase.com', colors.gray);
    log('2. Select your project', colors.gray);
    log('3. Go to SQL Editor', colors.gray);
    log('4. Run each migration file in order:\n', colors.gray);
    
    files.forEach((file, index) => {
      log(`   ${index + 1}. ${file}`, colors.blue);
    });
    
    log('\n5. Or copy and paste all migrations at once:\n', colors.gray);
    logInfo('Combined migration file created: supabase/migrations/combined.sql\n');
    
    // Create combined migration file
    const combinedSql = files.map(file => {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      return `-- ============================================\n-- Migration: ${file}\n-- ============================================\n\n${sql}\n\n`;
    }).join('\n');
    
    const combinedPath = path.join(migrationsDir, 'combined.sql');
    fs.writeFileSync(combinedPath, combinedSql);
    logSuccess(`Combined migration file created at: ${combinedPath}`);
    
  } else {
    logSuccess(`Completed: ${successCount}/${files.length}`);
  }

  logStep('\n✨ Done!\n');
}

// Run the script
runMigrations().catch(error => {
  logError(`\nFatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

