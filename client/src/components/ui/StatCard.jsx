import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * Reusable Stat Card for Dashboard Metrics
 *
 * @param {string} title - Label (e.g. "Total Budget", "Requests")
 * @param {string|number} value - Main metric (e.g. "₱1,250,000", "48")
 * @param {React.ElementType} [icon] - Lucide icon component
 * @param {string} [subtitle] - Secondary helper text (e.g. "vs. last month")
 * @param {string|number} [trend] - Trend percentage or label (e.g. "+12.5%")
 * @param {'up'|'down'|'neutral'} [trendDirection='up'] - Direction of trend indicator
 * @param {'red'|'blue'|'emerald'|'amber'|'purple'|'slate'} [variant='red'] - Color theme
 * @param {boolean} [loading=false] - Skeleton loader state
 */
export default function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  trendDirection = 'up',
  variant = 'red',
  loading = false,
}) {
  // Variant theme mapping
  const variants = {
    red: {
      badge: 'bg-red-50 text-[#E31837] border-red-100/80',
    },
    blue: {
      badge: 'bg-blue-50 text-blue-600 border-blue-100/80',
    },
    emerald: {
      badge: 'bg-emerald-50 text-emerald-600 border-emerald-100/80',
    },
    amber: {
      badge: 'bg-amber-50 text-amber-600 border-amber-100/80',
    },
    purple: {
      badge: 'bg-purple-50 text-purple-600 border-purple-100/80',
    },
    slate: {
      badge: 'bg-slate-100 text-slate-700 border-slate-200/80',
    },
  }

  const selectedVariant = variants[variant] || variants.red

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-20 sm:w-24 rounded bg-slate-200" />
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-slate-100" />
        </div>
        <div className="mt-3.5 h-6 sm:h-7 w-28 sm:w-36 rounded-lg bg-slate-200" />
        <div className="mt-2.5 h-3 w-16 sm:w-20 rounded bg-slate-100" />
      </div>
    )
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200"
    >
      {/* Top Row: Title & Icon Badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-semibold text-slate-600 truncate">{title}</span>

        {Icon && (
          <div
            className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${selectedVariant.badge}`}
          >
            <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </div>
        )}
      </div>

      {/* Center Row: Main Metric Value */}
      <div className="mt-2.5 sm:mt-3">
        <div className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 break-word">
          {value}
        </div>

        {/* Bottom Row: Trend Badge & Subtitle */}
        {(trend || subtitle) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
            {trend && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold shrink-0 ${
                  trendDirection === 'up'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : trendDirection === 'down'
                      ? 'bg-red-50 text-red-700 border border-red-200/60'
                      : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                {trendDirection === 'up' && <TrendingUp className="h-3 w-3" />}
                {trendDirection === 'down' && <TrendingDown className="h-3 w-3" />}
                {trendDirection === 'neutral' && <Minus className="h-3 w-3" />}
                {trend}
              </span>
            )}

            {subtitle && <span className="truncate font-medium text-slate-400">{subtitle}</span>}
          </div>
        )}
      </div>
    </motion.div>
  )
}
