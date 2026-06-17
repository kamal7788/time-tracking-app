'use client'

import { formatDuration } from '@/lib/utils'

interface LeaveBalance {
  id: string
  allocatedDays: number
  usedDays: number
  carriedOverDays: number
  leaveType: {
    name: string
    color: string
  }
}

interface LeaveBalanceListProps {
  balances: LeaveBalance[]
  year: number
}

export default function LeaveBalanceList({ balances, year }: LeaveBalanceListProps) {
  if (balances.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-8">
          <p className="text-gray-500">No leave balances found for {year}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900">Leave Balances - {year}</h2>
      </div>
      <div className="card-body">
        <div className="grid gap-4">
          {balances.map((balance) => {
            const total = balance.allocatedDays + balance.carriedOverDays
            const remaining = total - balance.usedDays
            const percentage = total > 0 ? (balance.usedDays / total) * 100 : 0

            return (
              <div key={balance.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: balance.leaveType.color }}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{balance.leaveType.name}</p>
                    <p className="text-sm text-gray-500">
                      {balance.carriedOverDays > 0 && `${balance.carriedOverDays} carried + `}
                      {balance.allocatedDays} allocated
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Used</p>
                    <p className="font-medium text-red-600">{balance.usedDays}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Remaining</p>
                    <p className="font-medium text-green-600">{remaining}</p>
                  </div>
                  <div className="w-24">
                    <div className="flex justify-between text-xs mb-1">
                      <span>{Math.round(percentage)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: percentage > 80 ? '#ef4444' : balance.leaveType.color 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}