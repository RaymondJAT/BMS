import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { Image } from 'antd'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import DataTable from '../../../components/ui/DataTable'
import { useLiquidationMasterData } from '../../../hooks/useLiquidationMasterData'
import { useCashDisbursementLookups } from '../../../hooks/useCashDisbursementLookups'
import { useLiquidationDetail } from '../../../hooks/useLiquidationDetail'
import { createLiquidationItemColumns } from '../../../config/tables/liquidationItemColumns'
import { resolveTeamLeader } from '../../../utils/resolveTeamLeader'

export const Route = createFileRoute('/_authenticated/workbench/liquidationDetail')({
  validateSearch: (search) => {
    const id = search.id
    if (id === undefined || id === null || id === '') {
      throw new Error('LiquidationDetailPage requires a ?id= search param')
    }
    return { id: String(id) }
  },
  component: LiquidationDetailPage,
})

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatDate = (val) => {
  if (!val) return '—'
  const d = new Date(val)
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// One field in the header summary grid — label on top, value below. The
// 8 fields below were previously 8 copy-pasted divs; this mirrors the
// fields.map(...) pattern ViewCashRequestModal already uses for the same
// kind of label/value grid.
function SummaryField({ label, value, valueClassName = 'font-semibold text-slate-800' }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`${valueClassName} mt-0.5`}>{value}</div>
    </div>
  )
}

function LiquidationDetailPage() {
  const { id } = Route.useSearch()
  const navigate = useNavigate()

  const { liquidation, activity, isLoading, error } = useLiquidationDetail(id)
  const { getModeName } = useLiquidationMasterData()
  const { getEmployeeName, getParticularsName, getDepartmentName } = useCashDisbursementLookups()

  const rejectionNotes = useMemo(() => activity.filter((a) => a.action === 'REJECTED'), [activity])

  const itemColumns = useMemo(
    () => createLiquidationItemColumns({ getParticularsName, getModeName }),
    [getParticularsName, getModeName],
  )

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-xl border border-slate-200">
        <Loader2 className="w-6 h-6 text-[#E31837] animate-spin" />
      </div>
    )
  }

  if (error || !liquidation) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-rose-600 font-medium">{error || 'Liquidation not found.'}</p>
        <button
          type="button"
          onClick={() => navigate({ to: '/workbench/liquidation' })}
          className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg"
        >
          Back to Liquidations
        </button>
      </div>
    )
  }

  const items = liquidation.items || []
  const difference = parseFloat(liquidation.reimburse_return || 0)
  const differenceColor =
    difference < 0 ? 'text-orange-600' : difference > 0 ? 'text-blue-600' : 'text-emerald-600'

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
      {/* Top Bar Navigation & Actions */}
      <div className="flex items-center justify-between shrink-0 print:hidden">
        <button
          type="button"
          onClick={() => navigate({ to: '/workbench/liquidation' })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
      </div>

      {rejectionNotes.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl shrink-0">
          <div className="font-bold mb-1">Latest Remarks</div>
          {rejectionNotes[rejectionNotes.length - 1].remarks}
        </div>
      )}

      {/* Main Content Scrollable Area */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto space-y-3 pr-1">
        {/* Header Summary Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-white p-4 border border-slate-200 rounded-xl shadow-2xs">
          <SummaryField
            label="Employee"
            value={
              getEmployeeName
                ? getEmployeeName(liquidation.employee_id)
                : liquidation.employee_name || `#${liquidation.employee_id}`
            }
          />
          <SummaryField
            label="Department"
            value={
              getDepartmentName
                ? getDepartmentName(liquidation.department_id)
                : liquidation.department || '—'
            }
          />
          <SummaryField
            label="Date of Liquidation"
            value={formatDate(liquidation.date_of_liquidation || liquidation.createdAt)}
          />
          <SummaryField label="Reference ID" value={liquidation.reference_id || '—'} />
          <SummaryField
            label="Team Leader"
            value={resolveTeamLeader(liquidation, getEmployeeName)}
          />
          <SummaryField
            label="Amount Obtained"
            value={formatCurrency(liquidation.amount_obtained)}
            valueClassName="font-bold text-slate-900"
          />
          <SummaryField
            label="Amount Expended"
            value={formatCurrency(liquidation.amount_expended)}
            valueClassName="font-bold text-slate-900"
          />
          <SummaryField
            label="Return / Reimbursement"
            value={formatCurrency(Math.abs(difference))}
            valueClassName={`font-bold ${differenceColor}`}
          />
        </div>

        {/* Liquidation Items Table */}
        <div className="flex-1 min-h-0 w-full overflow-hidden">
          <Image.PreviewGroup>
            <DataTable
              columns={itemColumns}
              data={items}
              keyExtractor={(row) => row.id}
              emptyMessage="No liquidation items found."
              containerClassName="flex flex-col min-h-0"
            />
          </Image.PreviewGroup>
        </div>
      </div>
    </div>
  )
}
