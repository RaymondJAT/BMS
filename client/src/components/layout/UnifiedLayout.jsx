import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function UnifiedLayout({ children }) {
  const [isOpen, setIsOpen] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleToggleSidebar = () => setIsOpen((prev) => !prev)
  const handleToggleMobile = () => setIsMobileOpen((prev) => !prev)
  const handleCloseMobile = () => setIsMobileOpen(false)

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 antialiased overflow-hidden">
      {/* Unified Shell Outer Frame */}
      <div className="relative flex h-full w-full overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar isOpen={isOpen} isMobile={false} onCloseMobile={handleCloseMobile} />

        {/* Mobile Sidebar */}
        <div className="lg:hidden">
          <Sidebar isOpen={isMobileOpen} isMobile={true} onCloseMobile={handleCloseMobile} />
        </div>

        {/* Boundary Toggle Button */}
        <div
          className="hidden lg:block absolute top-8 -translate-y-1/2 z-50 transition-all duration-300 ease-in-out"
          style={{ left: isOpen ? '242px' : '66px' }}
        >
          <motion.button
            onClick={handleToggleSidebar}
            whileHover={{ scale: 1.1, backgroundColor: '#ffffff' }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-md hover:text-slate-900 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none cursor-pointer"
            title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            aria-label={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            <motion.div
              animate={{ rotate: isOpen ? 0 : 180 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="flex items-center justify-center"
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.div>
          </motion.button>
        </div>

        {/* Right Shell Area */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <Navbar onToggleMobile={handleToggleMobile} />

          {/* Tightened Main Canvas Padding */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
