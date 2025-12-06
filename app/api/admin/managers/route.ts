import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('id, name, email')
      .eq('role', 'manager')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching managers:', error)
      return NextResponse.json({ error: 'Failed to fetch managers' }, { status: 500 })
    }

    return NextResponse.json({ managers: data || [] })
  } catch (error) {
    console.error('Error in admin managers API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

