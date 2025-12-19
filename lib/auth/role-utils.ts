// Role-based routing utilities

export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE'

// Dashboard paths for each role
export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  MANAGER: '/manager/dashboard',
  EMPLOYEE: '/',
}

// Routes accessible by each role
export const ROLE_ALLOWED_ROUTES: Record<UserRole, string[]> = {
  EMPLOYEE: [
    '/',
    '/profile',
    '/onboarding',
    '/invoices',
  ],
  MANAGER: [
    '/',
    '/profile',
    '/onboarding',
    '/invoices',
    '/manager',
    '/manager/dashboard',
    '/manager/team',
  ],
  ADMIN: [
    // Admin has access to everything
    '/',
    '/profile',
    '/onboarding',
    '/invoices',
    '/manager',
    '/manager/dashboard',
    '/manager/team',
    '/admin',
    '/admin/dashboard',
    '/admin/employees',
    '/submissions',
  ],
}

// Get the correct dashboard path for a role
export function getDashboardForRole(role: UserRole): string {
  return ROLE_DASHBOARD_PATHS[role] || ROLE_DASHBOARD_PATHS.EMPLOYEE
}

// Normalize role from database (lowercase) to app format (uppercase)
export function normalizeRole(role: string | null | undefined): UserRole {
  if (!role) return 'EMPLOYEE'
  const upperRole = role.toUpperCase()
  if (upperRole === 'ADMIN' || upperRole === 'MANAGER' || upperRole === 'EMPLOYEE') {
    return upperRole as UserRole
  }
  return 'EMPLOYEE'
}

// Check if a role can access a specific path
export function canAccessPath(role: UserRole, path: string): boolean {
  // Admin can access everything
  if (role === 'ADMIN') return true
  
  const allowedPaths = ROLE_ALLOWED_ROUTES[role]
  
  // Check if the path starts with any allowed path
  return allowedPaths.some(allowedPath => {
    if (allowedPath === path) return true
    // Check prefix for nested routes
    if (path.startsWith(allowedPath + '/')) return true
    return false
  })
}

// Get redirect path if user can't access current path
export function getRedirectForUnauthorizedAccess(role: UserRole, attemptedPath: string): string | null {
  if (canAccessPath(role, attemptedPath)) {
    return null // No redirect needed
  }
  return getDashboardForRole(role)
}

// Check if path is an admin-only route
export function isAdminOnlyRoute(path: string): boolean {
  return path.startsWith('/admin')
}

// Check if path is a manager-only route
export function isManagerOnlyRoute(path: string): boolean {
  return path.startsWith('/manager')
}

// Get role display name
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    EMPLOYEE: 'Contractor / Employee',
  }
  return names[role] || 'User'
}

