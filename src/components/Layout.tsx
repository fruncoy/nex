import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Home, 
  Users, 
  Building2, 
  GraduationCap, 
  Calendar, 
  LogOut,
  MessageCircle,
  Menu,
  ChevronLeft,
  BarChart3,
  ChevronDown,
  ChevronRight,
  FileText,
  Shield,
  UserCheck,
  Target,
  CheckCircle,
  Brain,
  Clock,
  Gift
} from 'lucide-react'

export function Layout() {
  const { signOut, user, staff } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['Candidates', 'Leads (All)', 'Training Leads', 'Updates', 'Insights']))

  console.log('Layout rendering - user:', user, 'staff:', staff, 'location:', location.pathname)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false)
        setIsCollapsed(false)
      } else {
        setIsSidebarOpen(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    
    if (location.pathname === '/interviews') {
      setExpandedItems(prev => new Set([...prev, 'Candidates']))
    }
    
    return () => window.removeEventListener('resize', handleResize)
  }, [location.pathname])

  useEffect(() => {
    checkWrappedViews()
  }, [staff?.id])

  const checkWrappedViews = async () => {
    if (!staff?.id) return

    const { data } = await supabase
      .from('wrapped_views')
      .select('has_viewed_wrapped')
      .eq('user_id', staff.id)
      .single()

    if (!data || !data.has_viewed_wrapped) {
      navigate('/wrapped')
      await supabase
        .from('wrapped_views')
        .upsert({ user_id: staff.id, has_viewed_wrapped: true })
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { 
      name: 'Candidates', 
      href: '/candidates', 
      icon: Users,
      subItems: [
        { name: 'Vetting', href: '/vetting', icon: Shield },
        { name: 'Interviews', href: '/interviews', icon: Calendar },
        { name: 'Staff', href: '/staff', icon: UserCheck },
        { name: 'Blacklisted', href: '/blacklisted', icon: Users }
      ]
    },
    { 
      name: 'Leads (All)', 
      href: '/leads', 
      icon: Building2,
      subItems: [
        { name: 'Clients', href: '/clients', icon: Target },
        { name: 'Converted Clients', href: '/converted-clients', icon: CheckCircle },
        { name: 'Placements', href: '/placements', icon: Users }
      ]
    },
    { 
      name: 'Training Leads', 
      href: '/training', 
      icon: GraduationCap,
      subItems: [
        { name: 'Lead Tracker', href: '/lead-tracker', icon: Target }
      ]
    },
    { 
      name: 'Updates', 
      href: '/updates', 
      icon: MessageCircle,
      subItems: [
        { name: 'Reminders', href: '/reminders', icon: Clock },
        { name: 'Meeting Notes', href: '/meeting-notes', icon: MessageCircle }
      ]
    },
    { name: 'Reporting', href: '/reporting', icon: FileText },
    { 
      name: 'Insights', 
      href: '/insights', 
      icon: BarChart3,
      subItems: [
        { name: 'Reports', href: '/reports', icon: FileText },
        { name: '2025 Wrapped', href: '/wrapped', icon: Gift }
      ]
    },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'SMS Management', href: '/sms', icon: MessageCircle },
    { name: 'Nestara AI', href: '/nestara-ai', icon: Brain },
  ]

  const getPageTitle = () => {
    const currentPath = location.pathname
    // Check main items first
    let currentNav = navigation.find(nav => nav.href === currentPath)
    if (currentNav) return currentNav.name
    
    // Check sub-items
    for (const nav of navigation) {
      if (nav.subItems) {
        const subItem = nav.subItems.find(sub => sub.href === currentPath)
        if (subItem) return subItem.name
      }
    }
    return 'Dashboard'
  }

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemName)) {
        newSet.delete(itemName)
      } else {
        newSet.add(itemName)
      }
      return newSet
    })
  }

  const isItemExpanded = (itemName: string) => expandedItems.has(itemName)

  const isSubItemActive = (subItems: any[]) => {
    return subItems.some(item => location.pathname === item.href)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 ${isCollapsed && window.innerWidth >= 1024 ? 'w-16' : 'w-64'} bg-white shadow-lg transform transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-[73px] px-4 bg-nestalk-primary">
            <img 
              src="/icon.png" 
              alt="NEX" 
              className="w-10 h-10"
            />
          </div>

          {/* Navigation */}
          <nav className={`flex-1 py-6 space-y-1 overflow-y-auto ${isCollapsed && window.innerWidth >= 1024 ? 'px-2' : 'px-4'}`}>
            {navigation.map((item) => (
              <div key={item.name}>
                {item.subItems ? (
                  <>
                    <div className="flex">
                      <NavLink
                        to={item.href}
                        className={({ isActive }) =>
                          `flex items-center flex-1 ${isCollapsed && window.innerWidth >= 1024 ? 'px-2 justify-center' : 'px-4'} py-2 text-sm font-medium rounded-md transition-colors ${
                            isActive
                              ? 'bg-nestalk-primary/10 text-nestalk-primary'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`
                        }
                        title={isCollapsed && window.innerWidth >= 1024 ? item.name : undefined}
                      >
                        <item.icon className={`w-5 h-5 ${isCollapsed && window.innerWidth >= 1024 ? '' : 'mr-3'}`} />
                        <span className={`transition-opacity duration-300 ${isCollapsed && window.innerWidth >= 1024 ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                          {item.name}
                        </span>
                      </NavLink>
                      {!isCollapsed && (
                        <button
                          onClick={() => toggleExpanded(item.name)}
                          className="px-2 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <div className="transition-transform duration-200">
                            {isItemExpanded(item.name) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </button>
                      )}
                    </div>
                    {isItemExpanded(item.name) && !isCollapsed && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.subItems.map((subItem) => (
                          <NavLink
                            key={subItem.name}
                            to={subItem.href}
                            className={({ isActive }) =>
                              `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                isActive
                                  ? 'bg-nestalk-primary/10 text-nestalk-primary'
                                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }`
                            }
                          >
                            <subItem.icon className="w-4 h-4 mr-3" />
                            {subItem.name}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center ${isCollapsed && window.innerWidth >= 1024 ? 'px-2 justify-center' : 'px-4'} py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-nestalk-primary/10 text-nestalk-primary'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                    title={isCollapsed && window.innerWidth >= 1024 ? item.name : undefined}
                  >
                    <item.icon className={`w-5 h-5 ${isCollapsed && window.innerWidth >= 1024 ? '' : 'mr-3'}`} />
                    <span className={`transition-opacity duration-300 ${isCollapsed && window.innerWidth >= 1024 ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                      {item.name}
                    </span>
                  </NavLink>
                )}
              </div>
            ))}
          </nav>

          {/* User info and logout */}
          <div className={`border-t border-gray-200 ${isCollapsed && window.innerWidth >= 1024 ? 'p-2' : 'p-4'}`}>
            <div className="flex items-center">
              <div className={`flex-1 ${isCollapsed && window.innerWidth >= 1024 ? 'hidden' : ''}`}>
                <p className="text-sm font-medium text-gray-900">
                  {staff?.name || user?.email || 'Loading...'}
                </p>
                <p className="text-sm text-gray-500">
                  {staff?.role || 'Staff'} {staff?.username && `(${staff.username})`}
                </p>
              </div>
              <button
                onClick={signOut}
                className={`p-2 text-gray-400 hover:text-gray-600 transition-colors ${isCollapsed && window.innerWidth >= 1024 ? 'mx-auto' : ''}`}
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Main content */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isSidebarOpen ? (isCollapsed && window.innerWidth >= 1024 ? 'lg:ml-16' : 'lg:ml-64') : 'lg:ml-0'}`}>
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 bg-white shadow-sm p-4 flex items-center">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center space-x-4 flex-1">
            <h1 className="text-xl font-bold text-gray-900 ml-2 lg:ml-0">{getPageTitle()}</h1>
          </div>
          
          <div className="hidden lg:flex items-center">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}