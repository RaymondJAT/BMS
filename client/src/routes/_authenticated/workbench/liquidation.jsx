import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useMemo, useCallback, useEffect } from 'react'
import DataTable from '../../../components/ui/DataTable'
import { Loader2 } from 'lucide-react'
import { createLiquidationColumns } from '../../../config/tables/liquidationColumns'
import CreateLiquidationModal from '../../../features/liquidation/CreateLiquidationModal'
import ApproveLiquidationModal from '../../../features/liquidation/ApproveLiquidationModal'
import VerifyLiquidationModal from '../../../features/liquidation/VerifyLiquidationModal'
import FinanceReviewModal from '../../../features/liquidation/FinanceReviewModal'
import useLiquidations from '../../../hooks/useLiquidations'
import useLiquidationMasterData from '../../../hooks/useLiquidationMasterData'
import { useAuth } from '../../../context/AuthContext'
import { useLiquidationLookups } from '../../../hooks/useLiquidationLookups'
import { useCashDisbursements } from '../../../hooks/useCashDisbursements'
import useRevolvingFunds from '../../../hooks/useRevolvingFunds'
import { liquidationApi } from '../../../api/liquidationApi'

export const Route = createFileRoute('/_authenticated/workbench/liquidation')({
  component: LiquidationPage,
})

function LiquidationPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const userRole = currentUser?.access_name || null
  const currentEmployeeId = currentUser?.employee_id || null

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
  const { districts, modes, searchStores } = useLiquidationMasterData()
  const { particulars, getEmployeeName, getFundLabel } = useLiquidationLookups()

  // Needed only for the Verify modal's fund picker: the disbursement tied
  // to the liquidation (to find its ORIGINAL fund + that fund's status)
  // and the pool of funds eligible to receive a Return/Reimbursement.
  const { disbursements = [] } = useCashDisbursements()
  const { funds = [] } = useRevolvingFunds()

  // ── Modal state ──────────────────────────────────────────────────
  // One object instead of 4 separate useStates ('view' used to be one
  // of these too — it's now a navigation instead, see handleView).
  // modal.type is one of: 'edit' | 'approve' | 'verify' | 'finance' | null.
  const [modal, setModal] = useState({ type: null, row: null })
  const [detail, setDetail] = useState(null)
  const [activity, setActivity] = useState([])

  const openModal = useCallback((type, row) => setModal({ type, row }), [])
  const closeModal = useCallback(() => {
    setModal({ type: null, row: null })
    setDetail(null)
    setActivity([])
  }, [])

  useEffect(() => {
    if (!modal.row) return
    let cancelled = false
    Promise.all([
      liquidationApi.getById(modal.row.id),
      liquidationApi.getActivity({ liquidation_id: modal.row.id }),
    ]).then(([full, acts]) => {
      if (cancelled) return
      setDetail(full)
      setActivity(acts || [])
    })
    return () => {
      cancelled = true
    }
  }, [modal.row])

  // View now navigates to the dedicated detail page instead of opening a
  // modal — see LiquidationDetailPage.
  const handleView = useCallback(
    (row) => navigate({ to: '/workbench/liquidationDetail', search: { id: String(row.id) } }),
    [navigate],
  )
  const handleEdit = useCallback((row) => openModal('edit', row), [openModal])
  const handleApprove = useCallback((row) => openModal('approve', row), [openModal])
  const handleVerify = useCallback((row) => openModal('verify', row), [openModal])
  const handleFinance = useCallback((row) => openModal('finance', row), [openModal])

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
            onRowClick={handleView}
          />
        )}
      </div>

      {modal.type === 'edit' && detail && (
        <CreateLiquidationModal
          isOpen
          onClose={closeModal}
          onUpdate={(payload) => editLiquidation(payload.id, payload)}
          isSubmitting={isMutating}
          editingLiquidation={detail}
          districts={districts}
          particulars={particulars}
          modes={modes}
          searchStores={searchStores}
        />
      )}

      {modal.type === 'approve' && detail && (
        <ApproveLiquidationModal
          isOpen
          onClose={closeModal}
          liquidation={detail}
          receipt={receiptForSelected}
          onApprove={(p) => approveLiquidation(modal.row.id, p)}
          onReject={(p) => rejectLiquidation(modal.row.id, p)}
          isSubmitting={isMutating}
          getEmployeeName={getEmployeeName}
        />
      )}

      {modal.type === 'verify' && detail && (
        <VerifyLiquidationModal
          isOpen
          onClose={closeModal}
          liquidation={detail}
          receipt={receiptForSelected}
          onVerify={(p) => verifyLiquidation(modal.row.id, p)}
          onReject={(p) => rejectLiquidation(modal.row.id, p)}
          isSubmitting={isMutating}
          getEmployeeName={getEmployeeName}
          revolvingFunds={eligibleFundsForVerify}
          originalFundId={originalFundId}
          originalFundStatus={originalFund?.status}
          getFundLabel={getFundLabel}
        />
      )}

      {modal.type === 'finance' && detail && (
        <FinanceReviewModal
          isOpen
          onClose={closeModal}
          liquidation={detail}
          onComplete={(p) => completeLiquidation(modal.row.id, p)}
          onMarkIncomplete={(p) => markIncomplete(modal.row.id, p)}
          isSubmitting={isMutating}
        />
      )}
    </div>
  )
}
