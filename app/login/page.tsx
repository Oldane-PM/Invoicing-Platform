'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Users, Database, Chrome } from 'lucide-react'

type Role = 'employee' | 'manager' | 'admin'

export default function LoginPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role)
  }

  const handleContinue = () => {
    if (!selectedRole) {
      alert('Please select a role')
      return
    }

    // Store selected role in localStorage for now
    // In production, this would be handled by Better-Auth
    localStorage.setItem('userRole', selectedRole)

    // Route based on role
    // Using valid UUIDs that match test employees in Supabase
    switch (selectedRole) {
      case 'employee':
        // Demo employee UUID - must exist in Supabase employees table
        localStorage.setItem('employeeId', '00000000-0000-0000-0000-000000000001')
        router.push('/')
        break
      case 'manager':
        // Demo manager UUID - must exist in Supabase employees table
        localStorage.setItem('managerId', '00000000-0000-0000-0000-000000000002')
        localStorage.setItem('employeeId', '00000000-0000-0000-0000-000000000002')
        router.push('/manager/dashboard')
        break
      case 'admin':
        // Demo admin UUID - must exist in Supabase employees table
        localStorage.setItem('employeeId', '00000000-0000-0000-0000-000000000003')
        router.push('/admin/dashboard')
        break
      default:
        break
    }
  }

  const handleGoogleSignIn = () => {
    if (!selectedRole) {
      alert('Please select a role first')
      return
    }

    // Google sign-in is not enabled, just show a message
    alert('Google Sign-In is not currently enabled. Please continue without it.')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Logo and Title */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-white text-2xl font-bold">IP</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Invoicing Platform
            </h1>
            <p className="text-sm text-gray-600">Sign in to access your dashboard</p>
          </div>

          {/* Divider */}
          <hr className="border-gray-200 mb-6" />

          {/* Welcome Back */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Welcome Back</h2>
          </div>

          {/* Select Role */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Role
            </label>
            <div className="space-y-3">
              <button
                onClick={() => handleRoleSelect('employee')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-colors ${
                  selectedRole === 'employee'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Employee</span>
              </button>

              <button
                onClick={() => handleRoleSelect('manager')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-colors ${
                  selectedRole === 'manager'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">Manager</span>
              </button>

              <button
                onClick={() => handleRoleSelect('admin')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-colors ${
                  selectedRole === 'admin'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <Database className="w-5 h-5" />
                <span className="font-medium">Admin</span>
              </button>
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium mb-6"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!selectedRole}
            className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
              selectedRole
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue
          </button>

          {/* Terms and Privacy */}
          <p className="text-xs text-gray-500 text-center mt-6">
            By signing in, you agree to our{' '}
            <a href="#" className="text-primary-600 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary-600 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Need help? Contact{' '}
          <a
            href="mailto:support@employeesystem.com"
            className="text-primary-600 hover:underline"
          >
            support@employeesystem.com
          </a>
        </p>
      </div>
    </div>
  )
}


