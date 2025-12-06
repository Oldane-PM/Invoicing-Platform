/**
 * Session helper functions
 * TODO: Replace with Better-Auth integration when auth is set up
 */

export function getCurrentUserRole(): 'employee' | 'manager' | 'admin' | null {
  if (typeof window === 'undefined') return null
  return (localStorage.getItem('userRole') as 'employee' | 'manager' | 'admin' | null) || null
}

export function getCurrentManagerId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('managerId') || null
}

export function isAuthenticated(): boolean {
  return getCurrentUserRole() !== null
}

export function logout() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('userRole')
  localStorage.removeItem('managerId')
}


