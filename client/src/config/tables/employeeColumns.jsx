import { Edit, User, Calendar, Building2, Briefcase } from 'lucide-react'

const formatDate = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Safely extract item whether DataTable passes raw item or TanStack row object
const getItem = (rowOrItem) => rowOrItem?.row?.original || rowOrItem || {}

export const createEmployeeColumns = ({ onEdit, departmentsMap = {}, positionsMap = {} }) => [
  {
    header: 'Full Name',
    accessorKey: 'fullname',
    cell: (cellProps) => {
      const item = getItem(cellProps)
      // Fallback to alternative common property names
      const name = item.fullname || item.name || item.emp_name || '—'
      const id = item.id || item.emp_id || item.md_id || 'N/A'

      return (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-xs tracking-tight">{name}</p>
            <p className="text-[10px] text-slate-400 font-medium">ID: #{id}</p>
          </div>
        </div>
      )
    },
  },
  {
    header: 'Department',
    accessorKey: 'department_name',
    cell: (cellProps) => {
      const item = getItem(cellProps)
      const departmentName =
        item.department_name ||
        departmentsMap[item.department_id] ||
        (item.department_id ? `Dept #${item.department_id}` : '—')

      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>{departmentName}</span>
        </div>
      )
    },
  },
  {
    header: 'Position',
    accessorKey: 'position_name',
    cell: (cellProps) => {
      const item = getItem(cellProps)
      const positionTitle =
        item.position_name ||
        positionsMap[item.position_id] ||
        (item.position_id ? `Position #${item.position_id}` : '—')

      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
          <span>{positionTitle}</span>
        </div>
      )
    },
  },
  {
    header: 'Employment Status',
    accessorKey: 'status',
    cell: (cellProps) => {
      const item = getItem(cellProps)
      const status = (item.status || 'PROBATIONARY').toUpperCase()
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
            title="Edit Employee"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
  },
]
