import { supabase } from '../client'
import type { Project } from '@/types/domain'

/**
 * Get all projects
 */
export async function getAllProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching projects:', error)
    throw error
  }

  return data as Project[]
}

