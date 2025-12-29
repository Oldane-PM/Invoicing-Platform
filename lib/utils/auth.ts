/**
 * Authentication Utilities
 * 
 * Helper functions for managing auth state in localStorage
 * and retrieving user information.
 */

export interface AuthUser {
  userId: string | null
  employeeId: string | null
  name: string | null
  email: string | null
  role: string | null
  managerId: string | null
}

/**
 * Get current authenticated user from localStorage
 */
export function getAuthUser(): AuthUser {
  if (typeof window === 'undefined') {
    return {
      userId: null,
      employeeId: null,
      name: null,
      email: null,
      role: null,
      managerId: null,
    }
  }

  return {
    userId: localStorage.getItem('userId'),
    employeeId: localStorage.getItem('employeeId'),
    name: localStorage.getItem('employeeName'),
    email: localStorage.getItem('employeeEmail'),
    role: localStorage.getItem('userRole'),
    managerId: localStorage.getItem('managerId'),
  }
}

/**
 * Set authenticated user in localStorage
 */
export function setAuthUser(user: Partial<AuthUser>): void {
  if (typeof window === 'undefined') return

  if (user.userId) localStorage.setItem('userId', user.userId)
  if (user.employeeId) localStorage.setItem('employeeId', user.employeeId)
  if (user.name) localStorage.setItem('employeeName', user.name)
  if (user.email) localStorage.setItem('employeeEmail', user.email)
  if (user.role) localStorage.setItem('userRole', user.role)
  if (user.managerId) localStorage.setItem('managerId', user.managerId)
}

/**
 * Clear authenticated user from localStorage
 */
export function clearAuthUser(): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem('userId')
  localStorage.removeItem('employeeId')
  localStorage.removeItem('employeeName')
  localStorage.removeItem('employeeEmail')
  localStorage.removeItem('userRole')
  localStorage.removeItem('managerId')
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('userId') || !!localStorage.getItem('employeeId')
}

/**
 * Check if user has a specific role
 */
export function hasRole(role: string): boolean {
  if (typeof window === 'undefined') return false
  const userRole = localStorage.getItem('userRole')
  return userRole?.toUpperCase() === role.toUpperCase()
}

/**
 * Check if user is admin
 */
export function isAdmin(): boolean {
  return hasRole('ADMIN')
}

/**
 * Check if user is manager
 */
export function isManager(): boolean {
  return hasRole('MANAGER')
}

/**
 * Check if user is employee
 */
export function isEmployee(): boolean {
  return hasRole('EMPLOYEE')
}

