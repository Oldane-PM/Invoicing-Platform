/**
 * Centralized Query Keys
 * 
 * All query keys follow the pattern: [domain, scope, ...filters]
 * This ensures consistent cache invalidation across the app.
 */

// ============================================
// SUBMISSIONS
// ============================================
export const submissionsKeys = {
  all: ['submissions'] as const,
  
  // List queries
  lists: () => [...submissionsKeys.all, 'list'] as const,
  list: (scope: { employeeId?: string; managerId?: string; role?: string }, filters?: Record<string, any>) =>
    [...submissionsKeys.lists(), scope, filters] as const,
  
  // Detail queries
  details: () => [...submissionsKeys.all, 'detail'] as const,
  detail: (submissionId: string) => [...submissionsKeys.details(), submissionId] as const,
  
  // Dashboard aggregates
  dashboards: () => [...submissionsKeys.all, 'dashboard'] as const,
  dashboard: (scope: { employeeId?: string; managerId?: string; role?: string }, filters?: Record<string, any>) =>
    [...submissionsKeys.dashboards(), scope, filters] as const,
}

// ============================================
// EMPLOYEES
// ============================================
export const employeesKeys = {
  all: ['employees'] as const,
  
  // List queries
  lists: () => [...employeesKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...employeesKeys.lists(), filters] as const,
  
  // Directory (admin view)
  directory: (filters?: Record<string, any>) => [...employeesKeys.all, 'directory', filters] as const,
  
  // Team (manager view)
  team: (managerId: string, filters?: Record<string, any>) =>
    [...employeesKeys.all, 'team', managerId, filters] as const,
  
  // Detail queries
  details: () => [...employeesKeys.all, 'detail'] as const,
  detail: (employeeId: string) => [...employeesKeys.details(), employeeId] as const,
  
  // Current user
  me: (employeeId: string) => [...employeesKeys.all, 'me', employeeId] as const,
  
  // Dashboard stats
  dashboard: () => [...employeesKeys.all, 'dashboard'] as const,
  
  // Managers list
  managers: () => [...employeesKeys.all, 'managers'] as const,
}

// ============================================
// HOLIDAYS / BLOCKED DAYS
// ============================================
export const holidaysKeys = {
  all: ['holidays'] as const,
  
  // List queries
  lists: () => [...holidaysKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...holidaysKeys.lists(), filters] as const,
  
  // Calendar blocked days (for employee calendar)
  blockedDays: (scope: { employeeId: string; startDate: string; endDate: string; employeeType?: string; country?: string; region?: string }) =>
    [...holidaysKeys.all, 'blockedDays', scope] as const,
  
  // Detail
  detail: (holidayId: string) => [...holidaysKeys.all, 'detail', holidayId] as const,
  
  // Dashboard (admin)
  dashboard: (filters?: Record<string, any>) => [...holidaysKeys.all, 'dashboard', filters] as const,
}

// ============================================
// NOTIFICATIONS
// ============================================
export const notificationsKeys = {
  all: ['notifications'] as const,
  
  // List queries
  lists: () => [...notificationsKeys.all, 'list'] as const,
  list: (scope: { employeeId?: string; managerId?: string; role?: string }) =>
    [...notificationsKeys.lists(), scope] as const,
  
  // Unread count
  unreadCount: (scope: { employeeId?: string; managerId?: string; role?: string }) =>
    [...notificationsKeys.all, 'unreadCount', scope] as const,
  
  // Detail
  detail: (notificationId: string) => [...notificationsKeys.all, 'detail', notificationId] as const,
}

// ============================================
// PROJECTS
// ============================================
export const projectsKeys = {
  all: ['projects'] as const,
  
  lists: () => [...projectsKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...projectsKeys.lists(), filters] as const,
  
  detail: (projectId: string) => [...projectsKeys.all, 'detail', projectId] as const,
}

// ============================================
// INVOICES
// ============================================
export const invoicesKeys = {
  all: ['invoices'] as const,
  
  lists: () => [...invoicesKeys.all, 'list'] as const,
  list: (scope: { employeeId?: string; managerId?: string }, filters?: Record<string, any>) =>
    [...invoicesKeys.lists(), scope, filters] as const,
  
  detail: (invoiceId: string) => [...invoicesKeys.all, 'detail', invoiceId] as const,
  
  // Payment queue (admin)
  paymentQueue: (filters?: Record<string, any>) => [...invoicesKeys.all, 'paymentQueue', filters] as const,
}

// ============================================
// HELPER: Invalidation Scopes
// ============================================
export const invalidationScopes = {
  // Invalidate all submission-related queries
  allSubmissions: () => submissionsKeys.all,
  
  // Invalidate employee's submission data
  employeeSubmissions: (employeeId: string) => ({
    list: submissionsKeys.list({ employeeId }),
    dashboard: submissionsKeys.dashboard({ employeeId }),
  }),
  
  // Invalidate manager's view
  managerSubmissions: (managerId: string) => ({
    list: submissionsKeys.list({ managerId }),
    dashboard: submissionsKeys.dashboard({ managerId }),
  }),
  
  // Invalidate admin's view
  adminSubmissions: () => ({
    list: submissionsKeys.list({ role: 'ADMIN' }),
    dashboard: submissionsKeys.dashboard({ role: 'ADMIN' }),
  }),
  
  // Invalidate all holiday-related queries
  allHolidays: () => holidaysKeys.all,
  
  // Invalidate all notification queries for a user
  userNotifications: (scope: { employeeId?: string; managerId?: string; role?: string }) => ({
    list: notificationsKeys.list(scope),
    unreadCount: notificationsKeys.unreadCount(scope),
  }),
}

