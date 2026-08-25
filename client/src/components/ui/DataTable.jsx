import React, { useState, useMemo, useRef, useEffect } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Check, Minus } from 'lucide-react'

// Custom Header Checkbox rendering a red/maroon check or dash icon
const HeaderCheckbox = ({ checked, indeterminate, onChange }) => {
  const checkboxRef = useRef(null)

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = Boolean(indeterminate)
    }
  }, [indeterminate])

  return (
    <label className="relative inline-flex items-center justify-center cursor-pointer p-0.5">
      <input
        type="checkbox"
        ref={checkboxRef}
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className="w-4 h-4 rounded border border-slate-300 bg-white peer-checked:bg-rose-50 peer-checked:border-red-600 peer-focus:ring-2 peer-focus:ring-red-500/20 transition-all flex items-center justify-center shadow-2xs">
        {checked && <Check className="w-3 h-3 text-[#E31837] stroke-3" />}
        {!checked && indeterminate && <Minus className="w-3 h-3 text-[#E31837] stroke-3" />}
      </div>
    </label>
  )
}

// Custom Row Checkbox
const RowCheckbox = ({ checked, onChange }) => {
  return (
    <label
      className="relative inline-flex items-center justify-center cursor-pointer p-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-4 h-4 rounded border border-slate-300 bg-white peer-checked:bg-rose-50 peer-checked:border-red-600 peer-focus:ring-2 peer-focus:ring-red-500/20 transition-all flex items-center justify-center shadow-2xs">
        {checked && <Check className="w-3 h-3 text-[#E31837] stroke-3" />}
      </div>
    </label>
  )
}

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
  newestFirst = true,
  // Selection Props
  selectable = false,
  selectedRows = [],
  onSelectionChange,
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

  const sortedData = useMemo(() => {
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

  // Selection Logic
  const isAllSelected =
    data.length > 0 && data.every((row, idx) => selectedRows.includes(keyExtractor(row, idx)))

  const isSomeSelected =
    data.some((row, idx) => selectedRows.includes(keyExtractor(row, idx))) && !isAllSelected

  const handleSelectAll = (e) => {
    if (!onSelectionChange) return
    if (e.target.checked) {
      const allKeys = data.map((row, idx) => keyExtractor(row, idx))
      onSelectionChange(allKeys, data)
    } else {
      onSelectionChange([], [])
    }
  }

  const handleSelectRow = (e, row, rowKey) => {
    e.stopPropagation()
    if (!onSelectionChange) return

    let nextSelected = []
    if (e.target.checked) {
      nextSelected = [...selectedRows, rowKey]
    } else {
      nextSelected = selectedRows.filter((id) => id !== rowKey)
    }

    const nextSelectedObjects = data.filter((item, idx) =>
      nextSelected.includes(keyExtractor(item, idx)),
    )

    onSelectionChange(nextSelected, nextSelectedObjects)
  }

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

  const displayColumns = useMemo(() => {
    if (!selectable) return columns

    const checkboxColumn = {
      id: '__selection__',
      width: 'w-10',
      align: 'center',
      header: (
        <HeaderCheckbox
          checked={isAllSelected}
          indeterminate={isSomeSelected}
          onChange={handleSelectAll}
        />
      ),
      cell: (row, rowKey) => {
        const isChecked = selectedRows.includes(rowKey)
        return <RowCheckbox checked={isChecked} onChange={(e) => handleSelectRow(e, row, rowKey)} />
      },
    }

    return [checkboxColumn, ...columns]
  }, [columns, selectable, isAllSelected, isSomeSelected, selectedRows, data])

  return (
    <div
      className={`w-full bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col ${
        maxHeight || ''
      } ${containerClassName}`}
    >
      <div className={`overflow-auto min-w-full flex-1 min-h-0 ${scrollbarClassName}`}>
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-xs">
            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {displayColumns.map((col, index) => {
                const alignClass = getAlignmentClass(col.align)
                const isSorted = sortColumn === col.accessorKey

                return (
                  <th
                    key={col.id || index}
                    className={`py-2 px-3 font-semibold select-none bg-slate-50 ${col.width || ''}`}
                  >
                    {col.sortable && col.accessorKey ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.accessorKey)}
                        className={`flex items-center gap-1 transition-colors hover:text-slate-900 ${alignClass} w-full`}
                      >
                        <span>{typeof col.header === 'function' ? col.header() : col.header}</span>
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
                      <div className={`flex items-center ${alignClass}`}>
                        {typeof col.header === 'function' ? col.header() : col.header}
                      </div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {displayColumns.map((_, cIdx) => (
                    <td key={cIdx} className="py-2.5 px-3">
                      <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={displayColumns.length || 1}
                  className="py-6 text-center text-slate-400 text-xs font-medium"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => {
                const rowKey = keyExtractor(row, index)
                const isSelected = selectedRows.includes(rowKey)

                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isSelected ? 'bg-rose-50/40' : ''
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {displayColumns.map((col, cIdx) => {
                      const alignClass = getAlignmentClass(col.align)
                      return (
                        <td key={cIdx} className="py-2 px-3 align-middle">
                          <div className={`flex items-center ${alignClass}`}>
                            {col.cell
                              ? col.cell(row, rowKey)
                              : col.accessorKey
                                ? String(row[col.accessorKey] ?? '')
                                : null}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {footer && (
        <div className="border-t border-slate-200/80 bg-slate-50/50 py-2 px-3 shrink-0">
          {footer}
        </div>
      )}
    </div>
  )
}

export default DataTable
