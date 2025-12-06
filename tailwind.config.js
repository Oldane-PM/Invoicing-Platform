/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /**
         * Design system colors
         * Primary brand: Blue 500 #3B82F6
         * Manager accent: Indigo 500 #6366F1
         * Employee accent: Teal 600 #0D9488
         */
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // Main brand color
          600: '#2563eb', // Primary hover
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        role: {
          admin: '#3b82f6', // Primary Blue
          manager: '#6366f1', // Indigo
          employee: '#0d9488', // Teal
        },
      },
    },
  },
  plugins: [],
}

