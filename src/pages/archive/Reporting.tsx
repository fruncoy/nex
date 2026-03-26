import React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, FileText, PieChart, Edit } from 'lucide-react'

export function Reporting() {
  const location = useLocation()

  const tabs = [
    { name: 'Data Entry', href: '/reporting/data-entry', icon: Edit },
    { name: 'Reports', href: '/reporting/reports', icon: FileText },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">KPI Reporting System</h1>
        <p className="text-gray-600">Track and analyze key performance indicators</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <NavLink
                key={tab.name}
                to={tab.href}
                className={({ isActive }) =>
                  `flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    isActive || (location.pathname === '/reporting' && tab.href === '/reporting/data-entry')
                      ? 'border-nestalk-primary text-nestalk-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <Outlet />
    </div>
  )
}