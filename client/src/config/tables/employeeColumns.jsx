import { Edit, User, Calendar, Building2, Briefcase } from 'lucide-react'

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Field names match getMasterEmployee's confirmed response shape:
 * { id, employee_id, fullname, department_id, department_name,
 *   position_id, position_name, status, createdAt }
 * department_name / position_name are pre-joined by the backend — no
 * lookup maps are needed or accepted here.
 */
export const createEmployeeColumns = ({ onEdit }) => [
  {
    header: 'Full Name',
    accessorKey: 'fullname',
    cell: (row) => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-slate-600" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-xs tracking-tight">{row.fullname || '—'}</p>
          <p className="text-[10px] text-slate-400 font-medium">
            ID: #{row.employee_id ?? row.id ?? 'N/A'}
          </p>
        </div>
      </div>
    ),
  },
  {
    header: 'Department',
    accessorKey: 'department_name',
    cell: (row) => (
      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
        <Building2 className="w-3.5 h-3.5 text-slate-400" />
        <span>{row.department_name || `Dept #${row.department_id ?? 'N/A'}`}</span>
      </div>
    ),
  },
  {
    header: 'Position',
    accessorKey: 'position_name',
    cell: (row) => (
      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
        <span>{row.position_name || `Position #${row.position_id ?? 'N/A'}`}</span>
      </div>
    ),
  },
  {
    header: 'Employment Status',
    accessorKey: 'status',
    cell: (row) => {
      const status = String(row.status || 'PROBATIONARY').toUpperCase()
      const isRegular = status === 'REGULAR'

      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide ${
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
    cell: (row) => (
      <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <span>{formatDate(row.createdAt)}</span>
      </div>
    ),
  },
  {
    header: 'Actions',
    id: 'actions',
    cell: (row) => (
      <div className="flex items-center gap-1 justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit?.(row)
          }}
          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          title="Edit Employee"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
      </div>
    ),
  },
]

export default createEmployeeColumns
