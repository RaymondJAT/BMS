import { Edit, ShieldCheck, Calendar, Key } from 'lucide-react'

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

const getItem = (rowOrItem) => rowOrItem?.row?.original || rowOrItem || {}

export const createAccessColumns = ({ onEdit, onPermissions }) => [
  {
    header: 'Access Role',
    accessorKey: 'ma_name',
    sortable: true,
    width: 'w-4/12',
    cell: (cellProps) => {
      const item = getItem(cellProps)
      const name = item.ma_name || item.name || '—'
      const id = item.ma_id || item.id || '—'

      return (
        <div className="flex items-center gap-2.5 min-w-0 w-full">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#E31837]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 text-xs tracking-tight truncate font-mono">
              {name}
            </p>
            <p className="text-[11px] text-slate-500 font-semibold font-mono truncate mt-0.5">
              ID: #{id}
            </p>
          </div>
        </div>
      )
    },
  },
  {
    header: 'Status',
    accessorKey: 'ma_status',
    align: 'center',
    width: 'w-3/12',
    cell: (cellProps) => {
      const item = getItem(cellProps)
      const status = (item.ma_status || item.status || 'ACTIVE').toUpperCase()
      const isActive = status === 'ACTIVE'

      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide whitespace-nowrap ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {status}
        </span>
      )
    },
  },
  {
    header: 'Date Created',
    accessorKey: 'ma_createdAt',
    sortable: true,
    align: 'center',
    width: 'w-3/12',
    cell: (cellProps) => {
      const item = getItem(cellProps)
      const createdAt = item.ma_createdAt || item.createdAt

      return (
        <div className="flex items-center justify-center gap-1.5 text-slate-700 text-xs font-semibold whitespace-nowrap w-full">
          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>{formatDate(createdAt)}</span>
        </div>
      )
    },
  },
  {
    header: 'Actions',
    id: 'actions',
    align: 'center',
    width: 'w-2/12',
    cell: (cellProps) => {
      const item = getItem(cellProps)

      return (
        <div className="flex items-center justify-center gap-1 whitespace-nowrap w-full">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onPermissions?.(item)
            }}
            className="p-1 text-slate-600 hover:text-[#E31837] hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
            title="Manage Route Permissions"
          >
            <Key className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.(item)
            }}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="Edit Access Role"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
  },
]

export default createAccessColumns
