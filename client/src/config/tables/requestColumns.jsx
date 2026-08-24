import React from 'react'
import { FileDown, User, Building, Calendar, Folder } from 'lucide-react'

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const formatDate = (val) => {
  if (!val) return 'N/A'
  const dateObj = new Date(val)
  return !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A'
}

export function createRequestColumns({ onDownloadPdf, getEmployeeName, getDepartmentName }) {
  const resolveEmployee = (row) => {
    if (typeof getEmployeeName === 'function') {
      const resolved = getEmployeeName(row.requester_name || row.employee_id || row.created_by)
      if (resolved && resolved !== 'N/A') return resolved
    }
    return row.requester_name || row.employee_name || 'N/A'
  }

  const resolveDepartment = (row) => {
    if (typeof getDepartmentName === 'function') {
      const resolved = getDepartmentName(row.department_id)
      if (resolved && resolved !== 'N/A') return resolved
    }
    return row.department_name || 'General'
  }

  return [
    {
      header: 'ID & Voucher',
      accessorKey: 'cash_voucher',
      sortable: true,
      cell: (row) => (
        <div className="py-0.5">
          <p className="font-semibold text-slate-900 text-sm">
            {row.cash_voucher || `REQ-${row.id}`}
          </p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {row.id ?? 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Purpose',
      accessorKey: 'purpose',
      cell: (row) => {
        const text = row.purpose || 'No purpose specified'
        return (
          <div className="py-0.5 max-w-50">
            <p
              className="text-xs text-slate-700 font-medium line-clamp-2 leading-snug"
              title={text}
            >
              {text}
            </p>
          </div>
        )
      },
    },
    {
      header: 'Requester & Context',
      accessorKey: 'requester_name',
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5 py-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{resolveEmployee(row)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Building className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{resolveDepartment(row)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Folder className="w-3 h-3 text-slate-400 shrink-0" />
            <span
              className="truncate max-w-35"
              title={row.project_name || row.project || 'General / Internal'}
            >
              {row.project_name || row.project || 'General / Internal'}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Amount Requested',
      accessorKey: 'amount_requested',
      sortable: true,
      align: 'right',
      cell: (row) => (
        <div className="py-0.5 text-right">
          <span className="font-bold text-slate-900 text-sm">
            {formatCurrency(row.amount_requested)}
          </span>
        </div>
      ),
    },
    {
      header: 'Request Date',
      accessorKey: 'created_at',
      sortable: true,
      align: 'center',
      cell: (row) => {
        const formattedDate = formatDate(row.created_at || row.request_date)

        return (
          <div className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formattedDate}
          </div>
        )
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      align: 'center',
      cell: (row) => {
        const rawStatus = String(row.status || '').trim()

        let displayStatus = rawStatus.toUpperCase()
        if (displayStatus.includes('PENDING')) displayStatus = 'PENDING'
        else if (displayStatus.includes('REJECT')) displayStatus = 'REJECTED'
        else if (['DISBURSED', 'LIQUIDATED', 'COMPLETED'].includes(displayStatus))
          displayStatus = 'COMPLETED'
        else if (displayStatus === 'APPROVED') displayStatus = 'APPROVED'
        else displayStatus = 'PENDING'

        const statusKey = displayStatus.toLowerCase()

        const statusStyles = {
          pending: 'bg-amber-50 text-amber-700 border-amber-200',
          approved: 'bg-blue-50 text-blue-700 border-blue-200',
          completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          rejected: 'bg-rose-50 text-rose-700 border-rose-200',
        }

        const labels = {
          pending: 'PENDING',
          approved: 'APPROVED',
          completed: 'COMPLETED',
          rejected: 'REJECTED',
        }

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              statusStyles[statusKey] || 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {labels[statusKey] || displayStatus}
          </span>
        )
      },
    },
    {
      header: 'Actions',
      align: 'center',
      cell: (row) => (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDownloadPdf?.(row)
            }}
            title="Download PDF"
            className="p-1.5 text-slate-500 hover:text-[#E31837] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]
}
