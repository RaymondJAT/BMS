import React, { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

const DataTable = ({
  columns = [],
  data = [],
  keyExtractor = (row, index) => row.id || index,
  isLoading = false,
  emptyMessage = 'No data available.',
  onRowClick,
  footer,
  maxHeight,
  containerClassName = '',
  scrollbarClassName = 'custom-scrollbar',
  // APIs generally return rows in ascending insertion order (oldest
  // first, by auto-increment id or created_at ASC). Defaulting to
  // newest-first here means the latest entry shows up at the top without
  // requiring the user to click a sort header first. Explicit column
  // sorting (via handleSort) always takes priority over this default —
  // set to false for tables where the caller's own row order should be
  // preserved as-is.
  newestFirst = true,
}) => {
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')

  const handleSort = (key) => {
    if (!key) return
    if (sortColumn === key) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else {
        setSortColumn(null)
        setSortDirection('asc')
      }
    } else {
      setSortColumn(key)
      setSortDirection('asc')
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortColumn) {
      return newestFirst ? [...data].reverse() : data
    }

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]

      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1
    })
  }, [data, sortColumn, sortDirection, newestFirst])

  const getAlignmentClass = (align) => {
    switch (align) {
      case 'center':
        return 'text-center justify-center'
      case 'right':
        return 'text-right justify-end'
      default:
        return 'text-left justify-start'
    }
  }

  return (
    <div
      className={`w-full bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col ${
        maxHeight || ''
      } ${containerClassName}`}
    >
      {/* Scrollable Table Wrapper with custom scrollbar styling */}
      <div className={`overflow-auto min-w-full flex-1 min-h-0 ${scrollbarClassName}`}>
        <table className="w-full text-left border-collapse">
          {/* Header - Sticky on Top */}
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-xs">
            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {columns.map((col, index) => {
                const alignClass = getAlignmentClass(col.align)
                const isSorted = sortColumn === col.accessorKey

                return (
                  <th
                    key={index}
                    className={`py-2 px-3 font-semibold select-none bg-slate-50 ${col.width || ''}`}
                  >
                    {col.sortable && col.accessorKey ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.accessorKey)}
                        className={`flex items-center gap-1 transition-colors hover:text-slate-900 ${alignClass} w-full`}
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[#E31837]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[#E31837]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </button>
                    ) : (
                      <div className={`flex items-center ${alignClass}`}>{col.header}</div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="py-2.5 px-3">
                      <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length || 1}
                  className="py-6 text-center text-slate-400 text-xs font-medium"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={keyExtractor(row, index)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors hover:bg-slate-50/80 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col, cIdx) => {
                    const alignClass = getAlignmentClass(col.align)
                    return (
                      <td key={cIdx} className="py-2 px-3 align-middle">
                        <div className={`flex items-center ${alignClass}`}>
                          {col.cell
                            ? col.cell(row)
                            : col.accessorKey
                              ? String(row[col.accessorKey] ?? '')
                              : null}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Container - Stays fixed at bottom */}
      {footer && (
        <div className="border-t border-slate-200/80 bg-slate-50/50 py-2 px-3 shrink-0">
          {footer}
        </div>
      )}
    </div>
  )
}

export default DataTable
