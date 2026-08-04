import React from 'react'
import { Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Navbar({ onToggleSidebar, onToggleMobile, isMobile = false }) {
  const { user, logout } = useAuth()

  const handleMenuClick = () => {
    if (isMobile) {
      onToggleMobile?.()
    } else {
      onToggleSidebar?.()
    }
  }

  return (
    <header className="relative flex h-16 items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6 shadow-xs shrink-0 z-20">
      {/* Menu Trigger (Handles both Mobile & Desktop) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleMenuClick}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
          aria-label={isMobile ? 'Open navigation menu' : 'Toggle sidebar expansion'}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* User Info & Logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name || 'User'}</p>
          <p className="text-xs text-slate-400 font-medium">{user?.role || 'DEVELOPER'}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="text-xs font-semibold text-slate-600 hover:text-[#E31837] hover:bg-red-50 px-3 py-2 rounded-xl transition-colors cursor-pointer border border-slate-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
        >
          Sign Out
        </button>
      </div>
    </header>
  )
}
