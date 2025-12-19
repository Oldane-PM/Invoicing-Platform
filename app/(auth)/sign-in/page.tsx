"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Info } from "lucide-react"

type AuthTab = 'login' | 'signup'

export default function SignIn() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<AuthTab>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  
  // Sign Up form state
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false)
  
  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validateLoginForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!loginEmail.trim()) {
      errors.loginEmail = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      errors.loginEmail = 'Please enter a valid email address'
    }
    
    if (!loginPassword) {
      errors.loginPassword = 'Password is required'
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateSignupForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!signupName.trim()) {
      errors.signupName = 'Full name is required'
    }
    
    if (!signupEmail.trim()) {
      errors.signupEmail = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) {
      errors.signupEmail = 'Please enter a valid email address'
    }
    
    if (!signupPassword) {
      errors.signupPassword = 'Password is required'
    } else if (signupPassword.length < 8) {
      errors.signupPassword = 'Password must be at least 8 characters'
    }
    
    if (!signupConfirmPassword) {
      errors.signupConfirmPassword = 'Please confirm your password'
    } else if (signupPassword !== signupConfirmPassword) {
      errors.signupConfirmPassword = 'Passwords do not match'
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!validateLoginForm()) return
    
    setLoading(true)
    setError(null)
    
    try {
      // For demo: Use mock login API
      const response = await fetch(`/api/auth/mock-login?role=employee&email=${encodeURIComponent(loginEmail)}`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Invalid email or password')
      }
      
      const data = await response.json()
      
      if (!data.employeeId) {
        throw new Error('Invalid credentials')
      }
      
      // Store authentication data
      const role = data.role?.toUpperCase() || 'EMPLOYEE'
      localStorage.setItem('userRole', role)
      localStorage.setItem('employeeId', data.employeeId)
      localStorage.setItem('employeeName', data.name || '')
      localStorage.setItem('employeeEmail', data.email || loginEmail)
      
      if (role === 'MANAGER') {
        localStorage.setItem('managerId', data.employeeId)
      }
      
      // Redirect based on role
      const redirectPaths: Record<string, string> = {
        EMPLOYEE: '/',
        MANAGER: '/manager/dashboard',
        ADMIN: '/admin/dashboard'
      }
      
      router.push(redirectPaths[role] || '/')
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!validateSignupForm()) return
    
    setLoading(true)
    setError(null)
    
    try {
      // For demo: Create account via API (would connect to auth provider in production)
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create account')
      }
      
      // Show success and switch to login
      setActiveTab('login')
      setLoginEmail(signupEmail)
      setError(null)
      
      // Clear signup form
      setSignupName('')
      setSignupEmail('')
      setSignupPassword('')
      setSignupConfirmPassword('')
      
      // Show success message (using the error state temporarily for a success message)
      alert('Account created successfully! Please log in.')
    } catch (err) {
      console.error('Signup error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // For demo: Use mock login with default employee role
      const response = await fetch('/api/auth/mock-login?role=employee')
      
      if (!response.ok) {
        throw new Error('Failed to sign in with Google')
      }
      
      const data = await response.json()
      
      if (!data.employeeId) {
        throw new Error('Authentication failed')
      }
      
      // Store authentication data
      const role = data.role?.toUpperCase() || 'EMPLOYEE'
      localStorage.setItem('userRole', role)
      localStorage.setItem('employeeId', data.employeeId)
      localStorage.setItem('employeeName', data.name || '')
      localStorage.setItem('employeeEmail', data.email || '')
      
      if (role === 'MANAGER') {
        localStorage.setItem('managerId', data.employeeId)
      }
      
      // Redirect based on role
      const redirectPaths: Record<string, string> = {
        EMPLOYEE: '/',
        MANAGER: '/manager/dashboard',
        ADMIN: '/admin/dashboard'
      }
      
      router.push(redirectPaths[role] || '/')
    } catch (err) {
      console.error('Google auth error:', err)
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.')
      setLoading(false)
    }
  }

  const isLoginFormValid = loginEmail.trim() && loginPassword
  const isSignupFormValid = signupName.trim() && signupEmail.trim() && signupPassword && signupConfirmPassword
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <span className="text-white text-2xl font-bold">E</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Invoicing Platform
          </h1>
          <p className="text-gray-600 text-sm">
            {activeTab === 'login' 
              ? 'Sign in to access your dashboard' 
              : 'Create your account to get started'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login')
              setError(null)
              setFieldErrors({})
            }}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              activeTab === 'login'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup')
              setError(null)
              setFieldErrors({})
            }}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              activeTab === 'signup'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                value={loginEmail}
                onChange={(e) => {
                  setLoginEmail(e.target.value)
                  if (fieldErrors.loginEmail) {
                    setFieldErrors(prev => ({ ...prev, loginEmail: '' }))
                  }
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  fieldErrors.loginEmail ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {fieldErrors.loginEmail && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.loginEmail}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value)
                    if (fieldErrors.loginPassword) {
                      setFieldErrors(prev => ({ ...prev, loginPassword: '' }))
                    }
                  }}
                  className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    fieldErrors.loginPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.loginPassword && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.loginPassword}</p>
              )}
              <div className="mt-1 text-right">
                <a href="#" className="text-xs text-indigo-600 hover:underline">
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={!isLoginFormValid || loading}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                value={signupName}
                onChange={(e) => {
                  setSignupName(e.target.value)
                  if (fieldErrors.signupName) {
                    setFieldErrors(prev => ({ ...prev, signupName: '' }))
                  }
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  fieldErrors.signupName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="John Doe"
                autoComplete="name"
              />
              {fieldErrors.signupName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.signupName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                value={signupEmail}
                onChange={(e) => {
                  setSignupEmail(e.target.value)
                  if (fieldErrors.signupEmail) {
                    setFieldErrors(prev => ({ ...prev, signupEmail: '' }))
                  }
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  fieldErrors.signupEmail ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {fieldErrors.signupEmail && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.signupEmail}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showSignupPassword ? 'text' : 'password'}
                  value={signupPassword}
                  onChange={(e) => {
                    setSignupPassword(e.target.value)
                    if (fieldErrors.signupPassword) {
                      setFieldErrors(prev => ({ ...prev, signupPassword: '' }))
                    }
                  }}
                  className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    fieldErrors.signupPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSignupPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.signupPassword && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.signupPassword}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="signup-confirm-password"
                  type={showSignupConfirmPassword ? 'text' : 'password'}
                  value={signupConfirmPassword}
                  onChange={(e) => {
                    setSignupConfirmPassword(e.target.value)
                    if (fieldErrors.signupConfirmPassword) {
                      setFieldErrors(prev => ({ ...prev, signupConfirmPassword: '' }))
                    }
                  }}
                  className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                    fieldErrors.signupConfirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSignupConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.signupConfirmPassword && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.signupConfirmPassword}</p>
              )}
            </div>

            {/* Role Assignment Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Your role will be assigned by an administrator after sign up.
              </p>
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={!isSignupFormValid || loading}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Switch to Login */}
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login')
                  setError(null)
                  setFieldErrors({})
                }}
                className="text-indigo-600 hover:underline font-medium"
              >
                Log in
              </button>
            </p>
          </form>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">OR</span>
          </div>
        </div>

        {/* Google SSO Button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:ring-4 focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
                <path
                  fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
                <path
                  fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
                <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
              </svg>
          Continue with Google
        </button>

        {/* Legal Text */}
        <p className="text-center text-xs text-gray-500 mt-6">
          By {activeTab === 'login' ? 'signing in' : 'creating an account'}, you agree to our{' '}
          <a href="#" className="text-indigo-600 hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-indigo-600 hover:underline">
            Privacy Policy
          </a>
        </p>
          </div>
        </div>
  )
}
