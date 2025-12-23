import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/lib/query/QueryProvider'

export const metadata: Metadata = {
  title: 'Invoice Platform - Employee Dashboard',
  description: 'Employee time submission and invoicing platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}

