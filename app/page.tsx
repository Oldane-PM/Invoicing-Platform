import { redirect } from 'next/navigation'

/**
 * Root page - redirects all users to sign-in
 * After authentication, users are redirected to their role-specific portals
 */
export default function RootPage() {
  redirect('/sign-in')
}
