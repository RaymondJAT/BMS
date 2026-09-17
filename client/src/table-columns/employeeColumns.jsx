import { User, Calendar, Building2 } from 'lucide-react'

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const createEmployeeColumns = () => [
  {
    header: 'Full Name',
    accessorKey: 'fullname',
    sortable: true,
    width: 'w-4/12',
    cell: (row) => (
      <div className="flex items-center gap-2.5 min-w-0 w-full">
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-slate-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 text-xs tracking-tight truncate">
            {row?.fullname || '—'}
          </p>
          <p className="text-[11px] text-slate-600 font-semibold font-mono truncate mt-0.5">
            Emp ID: {row?.employee_id ?? row?.id ?? '—'}
          </p>
        </div>
      </div>
    ),
  },
  {
    header: 'Department & Position',
    accessorKey: 'department_name',
    width: 'w-3/12',
    cell: (row) => {
      const dept = row?.department_name || `Dept #${row?.department_id ?? 'N/A'}`
      const pos = row?.position_name || `Position #${row?.position_id ?? 'N/A'}`

      return (
        <div className="flex items-center gap-2.5 min-w-0 w-full">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-slate-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 text-xs tracking-tight truncate">{dept}</p>
            <p className="text-[11px] text-slate-600 font-semibold truncate mt-0.5">{pos}</p>
          </div>
        </div>
      )
    },
  },
  {
    header: 'Employment Status',
    accessorKey: 'status',
    align: 'center',
    width: 'w-2/12',
    cell: (row) => {
      const status = String(row?.status || 'PROBATIONARY').toUpperCase()
      const isRegular = status === 'REGULAR'

      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide whitespace-nowrap ${
            isRegular
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {status}
        </span>
      )
    },
  },
  {
    header: 'Date Created',
    accessorKey: 'createdAt',
    sortable: true,
    align: 'right',
    width: 'w-2/12',
    cell: (row) => (
      <div className="flex items-center justify-end gap-1.5 text-slate-700 text-xs font-semibold whitespace-nowrap w-full">
        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>{formatDate(row?.createdAt)}</span>
      </div>
    ),
  },
]

export default createEmployeeColumns
