import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import DataTable from '../../../components/ui/DataTable'
import { Loader2 } from 'lucide-react'
import { createLiquidationColumns } from '../../../table-columns/liquidationColumns'
import useLiquidations from '../../../hooks/useLiquidations'
import { useLiquidationLookups } from '../../../hooks/useLiquidationLookups'
import { useAuth } from '../../../context/AuthContext'

export const Route = createFileRoute('/_authenticated/workbench/liquidation')({
  component: LiquidationPage,
})

/**
 * Liquidation list. Read-only besides Download — every workflow decision
 * (Edit & resubmit, Team Leader Approve/Reject, Fund Custodian
 * Verify/Reject, Finance post-audit) requires checking the liquidation's
 * line items against their receipts first, so all of that now lives on
 * LiquidationDetailPage instead. Clicking a row goes there.
 */
function LiquidationPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const userRole = currentUser?.access_name || null

  const { liquidations, isLoading, error } = useLiquidations({ role: userRole })
  const { getEmployeeName } = useLiquidationLookups()

  const handleView = (row) =>
    navigate({ to: '/workbench/liquidationDetail', search: { id: String(row.id) } })

  const columns = useMemo(() => createLiquidationColumns({ getEmployeeName }), [getEmployeeName])

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
      <div>
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
          Liquidations
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Team Leader → Fund Custodian → Finance post-audit pipeline. New liquidations are created
          from a completed Cash Request. Open a row to review and act on it.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl shrink-0">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-6 h-6 text-[#E31837] animate-spin" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={liquidations}
            keyExtractor={(row) => row.id}
            maxHeight="h-full"
            containerClassName="h-full flex flex-col min-h-0"
            emptyMessage="No liquidations found."
            onRowClick={handleView}
          />
        )}
      </div>
    </div>
  )
}
