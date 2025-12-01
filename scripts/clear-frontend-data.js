/**
 * Script to clear all localStorage data from the frontend
 * Run this in the browser console to clear all cached data
 */

// Clear all localStorage keys related to the invoice platform
const keysToRemove = [
  'submissions',
  'invoices',
  'employeeProfile',
  'employeeId',
  'userRole',
  'managerId'
]

console.log('Clearing frontend data...')

keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key)
    console.log(`✓ Removed: ${key}`)
  } else {
    console.log(`- Not found: ${key}`)
  }
})

console.log('\n✅ All frontend data cleared!')
console.log('Please refresh the page to see the changes.')

