import { Edit, Calendar, Tag } from 'lucide-react'

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const createTransportationColumns = ({ onEdit }) => [
  {
    header: 'Code',
    accessorKey: 'code',
    cell: (row) => {
      const code = row?.code || row?.id || '—'
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold whitespace-nowrap">
          <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{code}</span>
        </div>
      )
    },
  },
  {
    header: 'Name / Vehicle',
    accessorKey: 'name',
    cell: (row) => {
      const name = row?.name || '—'
      return (
        <div className="min-w-45 w-full">
          <span className="text-xs font-bold text-slate-900 whitespace-normal wrap-break-word leading-snug block">
            {name}
          </span>
        </div>
      )
    },
  },
  {
    header: 'Status',
    accessorKey: 'status',
    cell: (row) => {
      const status = String(row?.status || 'ACTIVE').toUpperCase()
      const isActive = status === 'ACTIVE'

      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide whitespace-nowrap ${
            isActive
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
    cell: (row) => (
      <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium whitespace-nowrap">
        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>{formatDate(row?.createdAt)}</span>
      </div>
    ),
  },
  {
    header: 'Actions',
    id: 'actions',
    cell: (row) => (
      <div className="flex items-center gap-1 justify-end whitespace-nowrap">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit?.(row)
          }}
          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          title="Edit Transportation Entry"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
      </div>
    ),
  },
]

export default createTransportationColumns
