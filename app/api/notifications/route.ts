import { NextRequest, NextResponse } from 'next/server'
import { getNotifications, type NotificationRole } from '@/lib/notifications'

// Force dynamic rendering - notifications are per-user and real-time
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const roleParam = searchParams.get('role') as NotificationRole | null

    if (!userId || !roleParam) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 })
    }

    const notifications = await getNotifications(userId, roleParam)
    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}


