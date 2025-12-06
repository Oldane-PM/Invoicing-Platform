import { NextRequest, NextResponse } from 'next/server'
import { markAllNotificationsRead, type NotificationRole } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const { userId, role } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const roleValue = role as NotificationRole | undefined
    await markAllNotificationsRead(userId, roleValue)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
  }
}


