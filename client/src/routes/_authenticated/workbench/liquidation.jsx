import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useCallback, useEffect } from 'react'
import DataTable from '../../../components/ui/DataTable'
import { Loader2 } from 'lucide-react'
import { createLiquidationColumns } from '../../../config/tables/liquidationColumns'
import CreateLiquidationModal from '../../../components/dashboard/liquidation/CreateLiquidationModal'
import ViewLiquidationModal from '../../../components/dashboard/liquidation/ViewLiquidationModal'
import ApproveLiquidationModal from '../../../components/dashboard/liquidation/ApproveLiquidationModal'
import VerifyLiquidationModal from '../../../components/dashboard/liquidation/VerifyLiquidationModal'
import FinanceReviewModal from '../../../components/dashboard/liquidation/FinanceReviewModal'
import useLiquidations from '../../../hooks/useLiquidations'
import useLiquidationMasterData from '../../../hooks/useLiquidationMasterData'
import { useCashDisbursementLookups } from '../../../hooks/useCashDisbursementLookups'
import { useCashDisbursements } from '../../../hooks/useCashDisbursements'
import useRevolvingFunds from '../../../hooks/useRevolvingFunds'
import { liquidationApi } from '../../../api/liquidationApi'

export const Route = createFileRoute('/_authenticated/workbench/liquidation')({
  component: LiquidationPage,
})

function LiquidationPage() {
  const userRole = 'ADMINISTRATOR'
  const currentEmployeeId = null

  const {
    liquidations,
    isLoading,
    isMutating,
    error,
    editLiquidation,
    approveLiquidation,
    rejectLiquidation,
    verifyLiquidation,
    completeLiquidation,
    markIncomplete,
  } = useLiquidations({ role: userRole })
  const { districts, modes, getModeName } = useLiquidationMasterData()
  const { particulars, getEmployeeName, getFundLabel } = useCashDisbursementLookups()

  // Needed only for the Verify modal's fund picker: the disbursement tied
  // to the liquidation (to find its ORIGINAL fund + that fund's status)
  // and the pool of funds eligible to receive a Return/Reimbursement.
  const { disbursements = [] } = useCashDisbursements()
  const { funds = [] } = useRevolvingFunds()

  const [activeModal, setActiveModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [activity, setActivity] = useState([])

  const loadDetail = useCallback(async (row) => {
    const full = await liquidationApi.getById(row.id)
    setDetail(full)
    const acts = await liquidationApi.getActivity({ liquidation_id: row.id })
    setActivity(acts)
  }, [])

  useEffect(() => {
    if (selected) loadDetail(selected)
  }, [selected, loadDetail])

  const handleView = useCallback((row) => {
    setSelected(row)
    setActiveModal('view')
  }, [])
  const handleEdit = useCallback((row) => {
    setSelected(row)
    setActiveModal('edit')
  }, [])
  const handleApprove = useCallback((row) => {
    setSelected(row)
    setActiveModal('approve')
  }, [])
  const handleVerify = useCallback((row) => {
    setSelected(row)
    setActiveModal('verify')
  }, [])
  const handleFinance = useCallback((row) => {
    setSelected(row)
    setActiveModal('finance')
  }, [])
  const handleClose = useCallback(() => {
    setActiveModal(null)
    setSelected(null)
    setDetail(null)
    setActivity([])
  }, [])

  const receiptForSelected = useMemo(
    () => [...activity].reverse().find((a) => a.receipt)?.receipt,
    [activity],
  )

  // The disbursement this liquidation is settling — carries the ORIGINAL
  // fund id/status the Verify modal needs to decide whether a fund picker
  // is even required.
  const disbursementForSelected = useMemo(() => {
    if (!detail) return null
    return disbursements.find((d) => String(d.cash_request_id) === String(detail.cash_request_id))
  }, [detail, disbursements])

  const originalFundId = disbursementForSelected?.revolving_fund_id ?? null
  const originalFund = useMemo(
    () => funds.find((f) => String(f.id) === String(originalFundId)),
    [funds, originalFundId],
  )

  // Eligible targets for Cash to Return / Reimbursement — CLOSED funds
  // can't receive either (mirrors NON_ISSUABLE_RF_STATUSES's CLOSED leg
  // for a Return; Reimbursement is further screened server-side by
  // checkReimbursementEligibility for CLEARED/RETURN + balance).
  const eligibleFundsForVerify = useMemo(() => funds.filter((f) => f.status !== 'CLOSED'), [funds])

  const columns = useMemo(
    () =>
      createLiquidationColumns({
        userRole,
        currentEmployeeId,
        onView: handleView,
        onEdit: handleEdit,
        onApprove: handleApprove,
        onVerify: handleVerify,
        onFinanceReview: handleFinance,
        getEmployeeName,
      }),
    [
      userRole,
      currentEmployeeId,
      handleView,
      handleEdit,
      handleApprove,
      handleVerify,
      handleFinance,
      getEmployeeName,
    ],
  )

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
      <div>
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
          Liquidations
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Team Leader → Fund Custodian → Finance post-audit pipeline. New liquidations are created
          from a completed Cash Request.
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
          />
        )}
      </div>

      {activeModal === 'edit' && detail && (
        <CreateLiquidationModal
          isOpen
          onClose={handleClose}
          onUpdate={(payload) => editLiquidation(payload.id, payload)}
          isSubmitting={isMutating}
          editingLiquidation={detail}
          districts={districts}
          particulars={particulars}
          modes={modes}
        />
      )}
      {activeModal === 'view' && detail && (
        <ViewLiquidationModal
          isOpen
          onClose={handleClose}
          liquidation={detail}
          activity={activity}
          getEmployeeName={getEmployeeName}
          getModeName={getModeName}
        />
      )}
      {activeModal === 'approve' && detail && (
        <ApproveLiquidationModal
          isOpen
          onClose={handleClose}
          liquidation={detail}
          receipt={receiptForSelected}
          onApprove={(p) => approveLiquidation(selected.id, p)}
          onReject={(p) => rejectLiquidation(selected.id, p)}
          isSubmitting={isMutating}
          getEmployeeName={getEmployeeName}
        />
      )}
      {activeModal === 'verify' && detail && (
        <VerifyLiquidationModal
          isOpen
          onClose={handleClose}
          liquidation={detail}
          receipt={receiptForSelected}
          onVerify={(p) => verifyLiquidation(selected.id, p)}
          onReject={(p) => rejectLiquidation(selected.id, p)}
          isSubmitting={isMutating}
          getEmployeeName={getEmployeeName}
          revolvingFunds={eligibleFundsForVerify}
          originalFundId={originalFundId}
          originalFundStatus={originalFund?.status}
          getFundLabel={getFundLabel}
        />
      )}
      {activeModal === 'finance' && detail && (
        <FinanceReviewModal
          isOpen
          onClose={handleClose}
          liquidation={detail}
          onComplete={(p) => completeLiquidation(selected.id, p)}
          onMarkIncomplete={(p) => markIncomplete(selected.id, p)}
          isSubmitting={isMutating}
        />
      )}
    </div>
  )
}
