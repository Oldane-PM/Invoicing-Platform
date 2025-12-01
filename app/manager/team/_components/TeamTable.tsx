'use client'

import { useState } from 'react'
import { Trash2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import type { TeamMember } from '@/types/domain'

interface TeamMemberWithDetails extends TeamMember {
  employee: {
    id: string
    name: string
    email: string
  }
  project: {
    id: string
    name: string
  } | null
}

interface TeamTableProps {
  teamMembers: TeamMemberWithDetails[]
  onRemove: (teamMemberId: string, employeeName: string) => void
}

export function TeamTable({ teamMembers, onRemove }: TeamTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedMember, setSelectedMember] =
    useState<TeamMemberWithDetails | null>(null)

  const handleRemoveClick = (member: TeamMemberWithDetails) => {
    setSelectedMember(member)
    setShowConfirmModal(true)
  }

  const handleConfirmRemove = () => {
    if (selectedMember) {
      setRemovingId(selectedMember.id)
      onRemove(selectedMember.id, selectedMember.employee.name)
      setShowConfirmModal(false)
      setSelectedMember(null)
      setRemovingId(null)
    }
  }

  const formatContractPeriod = (start: string, end: string) => {
    const startDate = format(new Date(start), 'MMM yyyy')
    const endDate = format(new Date(end), 'MMM yyyy')
    return `${startDate} - ${endDate}`
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contract Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No team members found. Add employees to your team to get started.
                  </td>
                </tr>
              ) : (
                teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {member.employee.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.employee.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.project?.name || member.project_name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatContractPeriod(member.contract_start, member.contract_end)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleRemoveClick(member)}
                        disabled={removingId === member.id}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Remove Employee</h3>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to remove{' '}
              <span className="font-medium">{selectedMember.employee.name}</span> from
              your team?
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setSelectedMember(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

