'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { getManagerTeam } from '@/lib/supabase/queries/team'
import { TeamTable } from './_components/TeamTable'
import { AddEmployeeModal } from './_components/AddEmployeeModal'
import type { TeamMember } from '@/types/domain'

interface TeamMemberWithDetails extends TeamMember {
  employee: {
    id: string
    name: string
    email: string
  }
}

export default function ManageTeam() {
  const router = useRouter()
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [managerId, setManagerId] = useState<string>('')

  useEffect(() => {
    // Get manager ID from localStorage (should come from auth in production)
    const storedManagerId = localStorage.getItem('managerId')
    if (storedManagerId) {
      setManagerId(storedManagerId)
    } else {
      router.push('/manager/dashboard')
    }
  }, [router])

  useEffect(() => {
    if (managerId) {
      loadTeam()
    }
  }, [managerId])

  const loadTeam = async () => {
    try {
      setLoading(true)
      const data = await getManagerTeam(managerId)
      setTeamMembers(data)
    } catch (error) {
      console.error('Error loading team:', error)
      alert('Failed to load team. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveEmployee = async (teamMemberId: string, employeeName: string) => {
    try {
      const response = await fetch(`/api/team/${teamMemberId}/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          managerId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove employee')
      }

      // Optimistically update UI
      setTeamMembers(teamMembers.filter((member) => member.id !== teamMemberId))
      alert(`${employeeName} has been removed from your team.`)
    } catch (error) {
      console.error('Error removing employee:', error)
      alert('Failed to remove employee. Please try again.')
      loadTeam() // Reload on error
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <button
              onClick={() => router.push('/manager/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Manage Team</h1>
            <p className="text-gray-600">View and manage your team roster</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Employee</span>
          </button>
        </div>

        {/* Team Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            <span className="font-medium text-gray-900">{teamMembers.length}</span>{' '}
            {teamMembers.length === 1 ? 'employee' : 'employees'} in your team
          </p>
        </div>

        {/* Team Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-500">Loading team members...</p>
          </div>
        ) : (
          <TeamTable teamMembers={teamMembers} onRemove={handleRemoveEmployee} />
        )}

        {/* Add Employee Modal */}
        {showAddModal && (
          <AddEmployeeModal
            managerId={managerId}
            onClose={() => setShowAddModal(false)}
            onSuccess={loadTeam}
            existingEmployeeIds={teamMembers.map(m => m.employee_id)}
          />
        )}
      </div>
    </div>
  )
}

