import { Edit, Shield, Calendar, User, UserCheck, UserX, IdCard } from 'lucide-react'

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

/**
 * Field names match getMasterUser's confirmed response shape:
 * { id, user_id, username, password, status, employee_id, access_id,
 *   fullname, createdAt }
 * fullname is pre-joined by the backend. rolesMap (id/access_id -> name)
 * comes from useCashDisbursementLookups. password is intentionally
 * never rendered.
 */
export const createUserColumns = ({ onEdit, rolesMap = {} }) => [
  {
    header: 'Full Name',
    accessorKey: 'fullname',
    cell: (row) => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-slate-600" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-xs tracking-tight">
            {row.fullname || row.username || '—'}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            User ID: #{row.user_id ?? row.id ?? 'N/A'}
          </p>
        </div>
      </div>
    ),
  },
  {
    header: 'Username',
    accessorKey: 'username',
    cell: (row) => (
      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
        <User className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-mono text-[11px]">{row.username || '—'}</span>
      </div>
    ),
  },
  {
    header: 'Employee ID',
    accessorKey: 'employee_id',
    cell: (row) => (
      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
        <IdCard className="w-3.5 h-3.5 text-slate-400" />
        <span>{row.employee_id ? `${row.employee_id}` : '—'}</span>
      </div>
    ),
  },
  {
    header: 'Access Role',
    accessorKey: 'access_id',
    cell: (row) => {
      const roleName =
        rolesMap[row.access_id] ||
        rolesMap[String(row.access_id)] ||
        (row.access_id != null ? `Role #${row.access_id}` : 'Standard Access')

      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
          {roleName}
        </span>
      )
    },
  },
  {
    header: 'Account Status',
    accessorKey: 'status',
    cell: (row) => {
      const status = String(row.status || 'ACTIVE').toUpperCase()
      const isActive = status === 'ACTIVE'

      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide ${
            isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
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
          title="Edit User"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
      </div>
    ),
  },
]

export default createUserColumns
