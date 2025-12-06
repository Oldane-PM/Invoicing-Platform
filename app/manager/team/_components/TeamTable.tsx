'use client'

import { useState } from 'react'
import { ChevronDown, AlertCircle } from 'lucide-react'
import type { TeamMember } from '@/types/domain'

interface TeamMemberWithDetails extends TeamMember {
  employee: {
    id: string
    name: string
    email: string
  }
}

interface TeamTableProps {
  teamMembers: TeamMemberWithDetails[]
  onRemove: (teamMemberId: string, employeeName: string) => void
}

export function TeamTable({ teamMembers, onRemove }: TeamTableProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMemberWithDetails | null>(null)

  const handleRemoveClick = (member: TeamMemberWithDetails) => {
    setSelectedMember(member)
    setShowConfirmModal(true)
    setOpenDropdownId(null)
  }

  const handleConfirmRemove = () => {
    if (selectedMember) {
      onRemove(selectedMember.id, selectedMember.employee.name)
      setShowConfirmModal(false)
      setSelectedMember(null)
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Email
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamMembers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {member.employee.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === member.id ? null : member.id)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          Actions
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </button>
                        
                        {openDropdownId === member.id && (
                          <>
                            {/* Backdrop to close dropdown */}
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setOpenDropdownId(null)}
                            />
                            <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                              <button
                                onClick={() => handleRemoveClick(member)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                Remove
                              </button>
                            </div>
                          </>
                        )}
                      </div>
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
