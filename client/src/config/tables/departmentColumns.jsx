import { Edit, Building2, Calendar } from 'lucide-react'

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Helper function to extract row data regardless of DataTable prop structure
const getItem = (rowOrItem) => rowOrItem?.row?.original || rowOrItem || {}

export const createDepartmentColumns = ({ onEdit }) => [
  {
    header: 'Department',
    accessorKey: 'name',
    sortable: true,
    width: 'w-3/12',
    cell: (cellProps) => {
      const item = getItem(cellProps)
      return (
        <div className="flex items-center gap-2.5 min-w-0 w-full">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-slate-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 text-xs tracking-tight truncate">
              {item.name || '—'}
            </p>
            <p className="text-[11px] text-slate-600 font-semibold font-mono truncate mt-0.5">
              Code: {item.code || '—'}
            </p>
          </div>
        </div>
      )
    },
  },
  {
    header: 'Status',
    accessorKey: 'status',
    align: 'center',
    width: 'w-2/12',
    cell: (cellProps) => {
      const item = getItem(cellProps)
      const status = (item.status || 'ACTIVE').toUpperCase()
      const isActive = status === 'ACTIVE'
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide whitespace-nowrap ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-700 border border-slate-300'
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
    align: 'center',
    width: 'w-4/12',
    cell: (cellProps) => {
      const item = getItem(cellProps)
      return (
        <div className="flex items-center justify-center gap-1.5 text-slate-700 text-xs font-semibold whitespace-nowrap w-full">
          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>{formatDate(item.createdAt)}</span>
        </div>
      )
    },
  },
  {
    header: 'Actions',
    id: 'actions',
    align: 'center',
    width: 'w-1/12',
    cell: (cellProps) => {
      const item = getItem(cellProps)
      return (
        <div className="flex items-center justify-center whitespace-nowrap w-full">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.(item)
            }}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="Edit Department"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
  },
]

export default createDepartmentColumns
