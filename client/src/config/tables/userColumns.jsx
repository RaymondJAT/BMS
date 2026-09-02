import { Shield, Calendar, User } from 'lucide-react'

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
export const createUserColumns = ({ rolesMap = {} } = {}) => [
  {
    header: 'Full Name',
    accessorKey: 'fullname',
    sortable: true,
    width: 'w-3/12',
    cell: (row) => (
      <div className="flex items-center gap-2.5 min-w-0 w-full">
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-slate-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 text-xs tracking-tight truncate">
            {row?.fullname || row?.username || '—'}
          </p>
          <p className="text-[11px] text-slate-600 font-semibold font-mono truncate mt-0.5">
            Emp ID: {row?.employee_id ? row.employee_id : '—'}
          </p>
        </div>
      </div>
    ),
  },
  {
    header: 'Username',
    accessorKey: 'username',
    sortable: true,
    width: 'w-1/12',
    cell: (row) => (
      <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold min-w-0 w-full">
        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="truncate">{row?.username || '—'}</span>
      </div>
    ),
  },
  {
    header: 'Access Role',
    accessorKey: 'access_id',
    align: 'center',
    width: 'w-2/12',
    cell: (row) => {
      const roleName =
        rolesMap[row?.access_id] ||
        rolesMap[String(row?.access_id)] ||
        (row?.access_id != null ? `Role #${row.access_id}` : 'Standard Access')

      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300 whitespace-nowrap">
          {roleName}
        </span>
      )
    },
  },
  {
    header: 'Account Status',
    accessorKey: 'status',
    align: 'center',
    width: 'w-2/12',
    cell: (row) => {
      const status = String(row?.status || 'ACTIVE').toUpperCase()
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
    accessorKey: 'createdAt',
    sortable: true,
    align: 'right',
    width: 'w-1/12',
    cell: (row) => (
      <div className="flex items-center justify-end gap-1.5 text-slate-700 text-xs font-semibold whitespace-nowrap w-full">
        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>{formatDate(row?.createdAt)}</span>
      </div>
    ),
  },
]

export default createUserColumns
