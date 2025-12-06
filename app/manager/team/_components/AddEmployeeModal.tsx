'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Swal from 'sweetalert2'

interface Employee {
  id: string
  name: string
  email: string
}

interface AddEmployeeModalProps {
  managerId: string
  onClose: () => void
  onSuccess: () => void
  existingEmployeeIds?: string[]
}

export function AddEmployeeModal({
  managerId,
  onClose,
  onSuccess,
  existingEmployeeIds = [],
}: AddEmployeeModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    loadAllEmployees()
  }, [])

  const loadAllEmployees = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/employees/all')
      if (response.ok) {
        const data = await response.json()
        // Filter out employees that are already on this manager's team
        const availableEmployees = (data.employees || []).filter(
          (emp: Employee) => !existingEmployeeIds.includes(emp.id)
        )
        setAllEmployees(availableEmployees)
      }
    } catch (error) {
      console.error('Error loading employees:', error)
    } finally {
      setLoading(false)
    }
  }

  // Real-time filtering - only show results when user types
  const filteredEmployees = searchQuery.trim()
    ? allEmployees.filter((employee) => {
        const query = searchQuery.toLowerCase()
        return (
          employee.name.toLowerCase().includes(query) ||
          employee.email.toLowerCase().includes(query)
        )
      })
    : []

  const handleAddEmployee = async (employee: Employee) => {
    setAddingId(employee.id)
    try {
      // Add employee to manager's team
      const contractStart = new Date().toISOString().split('T')[0]
      const contractEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const response = await fetch('/api/team/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          managerId,
          employeeId: employee.id,
          projectId: null,
          projectName: null,
          contractStart,
          contractEnd,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to add employee')
      }

      // Show success toast
      await Swal.fire({
        icon: 'success',
        title: 'Employee Added!',
        text: `${employee.name} added successfully!`,
        confirmButtonColor: '#7C3AED',
        timer: 2500,
        timerProgressBar: true,
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error adding employee:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error instanceof Error ? error.message : 'Failed to add employee. Please try again.',
        confirmButtonColor: '#7C3AED',
      })
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full relative shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Add Employee to Team</h2>
          <button
            onClick={onClose}
            disabled={addingId !== null}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Search Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Search Employee
            </label>
            <input
              type="text"
              placeholder="Enter employee name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              autoFocus
            />
          </div>

          {/* Employee List - Only show when searching */}
          {searchQuery.trim() && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading employees...</p>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No employees match your search.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
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
                    <tbody className="divide-y divide-gray-100">
                      {filteredEmployees.map((employee) => (
                        <tr
                          key={employee.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900">
                              {employee.name}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {employee.email}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleAddEmployee(employee)}
                              disabled={addingId !== null}
                              className="px-6 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {addingId === employee.id ? 'Adding...' : 'Add'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={addingId !== null}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
