#!/usr/bin/env node

/**
 * Migration Combiner
 * 
 * Combines all SQL migration files into a single file
 * that can be easily copied and pasted into Supabase SQL Editor
 * 
 * Usage:
 *   node scripts/combine-migrations.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔧 Combining Migration Files...\n');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const outputFile = path.join(migrationsDir, 'combined.sql');

// Get all SQL files and sort them
const files = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql') && file !== 'combined.sql')
  .sort();

if (files.length === 0) {
  console.log('❌ No migration files found');
  process.exit(1);
}

console.log(`📁 Found ${files.length} migration files:\n`);
files.forEach((file, index) => {
  console.log(`   ${index + 1}. ${file}`);
});

// Combine all migrations
let combinedSql = `-- ============================================
-- COMBINED MIGRATIONS
-- Generated: ${new Date().toISOString()}
-- Total Migrations: ${files.length}
-- ============================================
-- 
-- Instructions:
-- 1. Go to https://app.supabase.com
-- 2. Select your project
-- 3. Navigate to: SQL Editor
-- 4. Create a new query
-- 5. Copy and paste this entire file
-- 6. Click "Run" to execute all migrations
--
-- ============================================

`;

files.forEach((file, index) => {
  const filePath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  combinedSql += `
-- ============================================
-- Migration ${index + 1}/${files.length}: ${file}
-- ============================================

${sql}

`;
});

// Add final notification refresh
combinedSql += `
-- ============================================
-- Refresh Schema Cache
-- ============================================

NOTIFY pgrst, 'reload schema';

-- ============================================
-- Migrations Complete! 
-- ============================================
`;

// Write combined file
fs.writeFileSync(outputFile, combinedSql);

console.log(`\n✅ Combined migration file created!\n`);
console.log(`📄 Location: ${outputFile}\n`);
console.log('📋 Next Steps:\n');
console.log('   1. Open: https://app.supabase.com');
console.log('   2. Select your project');
console.log('   3. Go to: SQL Editor → New Query');
console.log('   4. Copy and paste the contents of:');
console.log(`      ${path.relative(process.cwd(), outputFile)}`);
console.log('   5. Click "Run" to execute all migrations\n');
console.log('✨ Done!\n');

