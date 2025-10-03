import React from 'react'
import { Shield } from 'lucide-react'

export function Vetting() {
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Vetting</h3>
        <p className="mt-1 text-sm text-gray-500">Coming Soon</p>
      </div>
    </div>
  )
}