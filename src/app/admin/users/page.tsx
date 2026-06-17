'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  _count: { timeEntries: number }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('USER')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data.users)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(`User ${name} created successfully`)
      setShowAddForm(false)
      setName('')
      setEmail('')
      setPassword('')
      fetchUsers()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create user')
    }
  }

  if (isLoading) {
    return <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage employee accounts</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
          {showAddForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {success && <div className="bg-green-50 text-green-700 p-4 rounded-lg">{success}</div>}
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>}

      {showAddForm && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Create New User</h3></div>
          <div className="card-body">
            <form onSubmit={handleCreateUser} className="space-y-4 max-w-md">
              <div>
                <label className="label">Name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Full name" required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="Email address" required />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="Password" required minLength={8} />
              </div>
              <div>
                <label className="label">Role</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="input">
                  <option value="USER">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <button type="submit" className="btn-primary">Create User</button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Email</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Role</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Entries</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{user.name}</td>
                  <td className="py-3 px-4 text-gray-600">{user.email}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`badge ${user.role === 'ADMIN' ? 'badge-approved' : 'badge-draft'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-900">{user._count.timeEntries}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}