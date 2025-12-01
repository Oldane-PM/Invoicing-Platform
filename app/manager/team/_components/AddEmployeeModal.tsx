'use client'

import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { getAvailableEmployees } from '@/lib/supabase/queries/employees'
import { getAllProjects } from '@/lib/supabase/queries/projects'
import type { Employee, Project } from '@/types/domain'

interface AddEmployeeModalProps {
  managerId: string
  onClose: () => void
  onSuccess: () => void
}

export function AddEmployeeModal({
  managerId,
  onClose,
  onSuccess,
}: AddEmployeeModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    employeeId: '',
    projectId: '',
    projectName: '',
    contractStart: '',
    contractEnd: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [employeesData, projectsData] = await Promise.all([
        getAvailableEmployees(managerId),
        getAllProjects(),
      ])
      setEmployees(employeesData)
      setProjects(projectsData)
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Failed to load employees and projects')
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.employeeId || !formData.contractStart || !formData.contractEnd) {
      alert('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/team/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          managerId,
          employeeId: formData.employeeId,
          projectId: formData.projectId || null,
          projectName: formData.projectName || null,
          contractStart: formData.contractStart,
          contractEnd: formData.contractEnd,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add employee')
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error adding employee:', error)
      alert('Failed to add employee. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Employee to Team</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Search/Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent mb-2"
              />
            </div>
            <select
              required
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select an employee</option>
              {loading ? (
                <option disabled>Loading employees...</option>
              ) : filteredEmployees.length === 0 ? (
                <option disabled>No available employees</option>
              ) : (
                filteredEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.email})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => {
                const selectedProject = projects.find((p) => p.id === e.target.value)
                setFormData({
                  ...formData,
                  projectId: e.target.value,
                  projectName: selectedProject?.name || '',
                })
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select a project (optional)</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Project Name (if no project selected) */}
          {!formData.projectId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) =>
                  setFormData({ ...formData, projectName: e.target.value })
                }
                placeholder="Enter project name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Contract Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.contractStart}
              onChange={(e) =>
                setFormData({ ...formData, contractStart: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Contract End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contract End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.contractEnd}
              onChange={(e) =>
                setFormData({ ...formData, contractEnd: e.target.value })
              }
              min={formData.contractStart}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

