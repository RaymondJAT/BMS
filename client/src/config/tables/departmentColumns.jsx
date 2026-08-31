import { Edit, Building2, Calendar } from 'lucide-react'

const formatDate = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
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
    cell: (cellProps) => {
      const item = getItem(cellProps)
      return (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-xs">{item.name || '—'}</p>
            <p className="text-[10px] text-slate-400 font-medium">Code: {item.code || '—'}</p>
          </div>
        </div>
      )
    },
  },
  {
    header: 'Code',
    accessorKey: 'code',
    cell: (cellProps) => {
      const item = getItem(cellProps)
      return (
        <span className="font-mono text-xs text-slate-600 font-semibold">{item.code || '—'}</span>
      )
    },
  },
  {
    header: 'Status',
    accessorKey: 'status',
    cell: (cellProps) => {
      const item = getItem(cellProps)
      const status = (item.status || 'ACTIVE').toUpperCase()
      const isActive = status === 'ACTIVE'
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
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
    cell: (cellProps) => {
      const item = getItem(cellProps)
      return (
        <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatDate(item.createdAt)}</span>
        </div>
      )
    },
  },
  {
    header: 'Actions',
    id: 'actions',
    cell: (cellProps) => {
      const item = getItem(cellProps)
      return (
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="Edit Status"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
  },
]
