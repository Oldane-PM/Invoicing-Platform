import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for route protection and role-based access control
 * 
 * PUBLIC ROUTES (accessible without authentication):
 * - /sign-in, /login
 * - /api/auth/* (authentication endpoints)
 * 
 * PROTECTED ROUTES (require authentication + role check):
 * - /employee/* → requires EMPLOYEE role
 * - /manager/* → requires MANAGER role
 * - /admin/* → requires ADMIN role
 * - /profile, /onboarding → accessible to all authenticated users
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/sign-in',
    '/login',
    '/signup',
    '/forgot-password',
  ]
  
  // API routes that should not be intercepted by middleware
  const apiAuthRoutes = pathname.startsWith('/api/auth/')
  const apiRoutes = pathname.startsWith('/api/')
  const staticFiles = pathname.startsWith('/_next/') || 
                      pathname.startsWith('/favicon') ||
                      pathname.includes('.')
  
  // Skip middleware for public routes, API auth, and static files
  if (publicRoutes.includes(pathname) || apiAuthRoutes || staticFiles) {
    return NextResponse.next()
  }
  
  // For client-side localStorage check (middleware can't access localStorage)
  // We'll rely on client-side checks in page components for now
  // A proper solution would use httpOnly cookies or server session
  
  // Allow root path (it redirects to sign-in anyway)
  if (pathname === '/') {
    return NextResponse.next()
  }
  
  /**
   * IMPORTANT: Since this app uses localStorage for session management,
   * we cannot perform server-side auth checks in middleware.
   * 
   * Route protection is enforced at the page component level via:
   * - useEffect hooks that check localStorage
   * - Redirects for unauthorized access
   * 
   * For production, consider migrating to:
   * - HTTP-only cookies
   * - Better Auth server sessions
   * - Supabase Auth with proper cookie management
   */
  
  return NextResponse.next()
}

/**
 * Matcher configuration - which routes should trigger middleware
 * 
 * Excludes:
 * - API routes (except auth which we handle specially)
 * - Static files (_next/static, images, etc.)
 * - Favicon and public assets
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, other static files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*),'
  ],
}

