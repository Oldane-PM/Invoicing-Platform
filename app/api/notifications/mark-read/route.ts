import { NextRequest, NextResponse } from 'next/server'
import { markNotificationRead } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const { notificationId, userId } = await request.json()

    if (!notificationId || !userId) {
      return NextResponse.json({ error: 'notificationId and userId are required' }, { status: 400 })
    }

    await markNotificationRead(notificationId, userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
  }
}


