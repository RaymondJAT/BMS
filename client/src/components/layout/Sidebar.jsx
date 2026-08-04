import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronDown, Layers, X } from 'lucide-react'
import { NAVIGATION_ITEMS } from '../../config/navigation.config'
import { sidebarVariants, labelVariants, dropdownVariants } from './layout.variants'

export default function Sidebar({ isOpen, onCloseMobile, isMobile = false }) {
  const shouldReduceMotion = useReducedMotion()

  // Initialize all dropdowns closed by default
  const [openMenus, setOpenMenus] = useState(() => {
    const initialState = {}
    NAVIGATION_ITEMS.forEach((item) => {
      if (item.type === 'dropdown') {
        initialState[item.id] = false
      }
    })
    return initialState
  })

  const toggleDropdown = (key) => {
    setOpenMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Trigger close callback on mobile navigation clicks
  const handleLinkClick = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile()
    }
  }

  const currentVariant = isMobile
    ? isOpen
      ? 'expanded'
      : 'closedMobile'
    : isOpen
      ? 'expanded'
      : 'collapsed'

  return (
    <>
      {/* Mobile / Tablet Backdrop Overlay */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCloseMobile}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar Shell */}
      <motion.aside
        initial={false}
        animate={currentVariant}
        variants={shouldReduceMotion ? {} : sidebarVariants}
        className={`
          fixed lg:static top-0 left-0 bottom-0 
          ${isMobile ? 'z-50 h-full w-72' : 'z-30'} 
          flex flex-col bg-white border-r border-slate-200/80 shadow-lg lg:shadow-xs
          shrink-0 select-none overflow-hidden
        `}
        aria-label="Main Navigation"
      >
        {/* Unified Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200/80 shrink-0">
          <Link
            to="/dashboard"
            onClick={handleLinkClick}
            className="flex items-center gap-3 overflow-hidden outline-none"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E31837] text-white shadow-xs">
              <Layers className="h-5 w-5" />
            </div>

            <motion.div
              variants={shouldReduceMotion ? {} : labelVariants}
              initial={false}
              animate={isOpen || isMobile ? 'expanded' : 'collapsed'}
              className="whitespace-nowrap min-w-0"
            >
              <span className="font-extrabold text-slate-900 tracking-tight text-base block leading-tight">
                BMS Admin
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                Enterprise
              </span>
            </motion.div>
          </Link>

          {/* Close button explicitly for mobile header */}
          {isMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="custom-scrollbar flex-1 space-y-1.5 p-3 overflow-y-auto overflow-x-hidden">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon

            // Single link item
            if (item.type === 'link') {
              return (
                <div key={item.id}>
                  <Link
                    to={item.to}
                    onClick={handleLinkClick}
                    activeProps={{ className: 'bg-red-50 text-[#E31837] font-semibold' }}
                    inactiveProps={{
                      className: 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    }}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                  >
                    <motion.div
                      whileHover={shouldReduceMotion ? {} : { x: 3 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-center shrink-0"
                    >
                      <Icon className="h-5 w-5 transition-colors duration-200 group-hover:text-slate-900" />
                    </motion.div>

                    <motion.span
                      variants={shouldReduceMotion ? {} : labelVariants}
                      initial={false}
                      animate={isOpen || isMobile ? 'expanded' : 'collapsed'}
                      className="whitespace-nowrap"
                    >
                      {item.title}
                    </motion.span>
                  </Link>
                </div>
              )
            }

            // Dropdown group item
            if (item.type === 'dropdown') {
              const isDropdownOpen = !!openMenus[item.id]

              return (
                <div key={item.id}>
                  <button
                    onClick={() => toggleDropdown(item.id)}
                    className="group flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                    aria-expanded={isDropdownOpen}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <motion.div
                        whileHover={shouldReduceMotion ? {} : { x: 3 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-center shrink-0"
                      >
                        <Icon className="h-5 w-5 transition-colors duration-200 group-hover:text-slate-900" />
                      </motion.div>
                      <motion.span
                        variants={shouldReduceMotion ? {} : labelVariants}
                        initial={false}
                        animate={isOpen || isMobile ? 'expanded' : 'collapsed'}
                        className="whitespace-nowrap"
                      >
                        {item.title}
                      </motion.span>
                    </div>

                    {(isOpen || isMobile) && (
                      <motion.div
                        animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="text-slate-400 shrink-0"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </motion.div>
                    )}
                  </button>

                  {/* Sub-items list */}
                  <AnimatePresence initial={false}>
                    {(isOpen || isMobile) && isDropdownOpen && (
                      <motion.div
                        key={`${item.id}-sub`}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={shouldReduceMotion ? {} : dropdownVariants}
                        className="ml-8 mt-1 space-y-1 overflow-hidden border-l-2 border-slate-100 pl-2"
                      >
                        {item.children?.map((child) => (
                          <Link
                            key={child.id}
                            to={child.to}
                            onClick={handleLinkClick}
                            activeProps={{ className: 'text-[#E31837] font-semibold bg-red-50' }}
                            inactiveProps={{
                              className: 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
                            }}
                            className="block rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 hover:translate-x-1 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                          >
                            {child.title}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            }

            return null
          })}
        </nav>
      </motion.aside>
    </>
  )
}
