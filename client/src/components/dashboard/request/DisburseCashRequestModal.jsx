import { useState, useEffect, useMemo } from 'react'
import { Modal } from '../../ui/Modal'
import { amountToWords } from '../../../utils/numberToWords'

const ELIGIBLE_FUND_STATUSES = ['OPEN', 'ON REVIEW']

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

/**
 * Fund Custodian gate for an APPROVED (Team-Lead-approved) request — the
 * FINAL approval stage. Before approving, the Fund Custodian must select
 * the Revolving Fund this request will draw from and confirm it can
 * cover the amount — the Requester never picks this (see
 * CreateCashRequestModal).
 *
 * Disburse -> COMPLETED (backend/API name: complete, PUT
 * /cash-request/complete), which generates exactly one UNLIQUIDATED Cash
 * Disbursement against the SELECTED Revolving Fund and persists that
 * fund onto the cash_request row — see completeCashRequest's docstring
 * on the backend. `particulars` is REQUIRED because cd_particulars is a
 * NOT NULL FK on cash_disbursement.
 *
 * Also allows declining (Reject) an APPROVED request before cash is
 * actually released — mandatory remarks, same as the Team Leader stage.
 */
export default function DisburseCashRequestModal({
  isOpen,
  onClose,
  request,
  particulars = [],
  revolvingFunds = [],
  onDisburse,
  onReject,
  isSubmitting,
  getFundLabel,
  getDepartmentName,
  getEmployeeName,
}) {
  const [revolvingFundId, setRevolvingFundId] = useState('')
  const [cashVoucher, setCashVoucher] = useState('')
  const [particularsId, setParticularsId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [pendingAction, setPendingAction] = useState(null) // 'disburse' | 'reject'
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setRevolvingFundId('')
      setCashVoucher('')
      setParticularsId('')
      setRemarks('')
      setPendingAction(null)
      setFormError(null)
    }
  }, [isOpen])

  const amountInWords = useMemo(() => {
    return request?.amount ? amountToWords(request.amount) : ''
  }, [request?.amount])

  const eligibleFunds = useMemo(
    () =>
      revolvingFunds.filter((fund) =>
        ELIGIBLE_FUND_STATUSES.includes(String(fund.status || '').toUpperCase()),
      ),
    [revolvingFunds],
  )

  const selectedFund = revolvingFunds.find((fund) => String(fund.id) === String(revolvingFundId))
  const selectedBalance = parseFloat(selectedFund?.balance || 0)
  const requestAmount = parseFloat(request?.amount || 0)
  const insufficientBalance = Boolean(selectedFund) && selectedBalance < requestAmount

  if (!request) return null

  const handleDisburse = async (e) => {
    e.preventDefault()
    setFormError(null)

    if (!revolvingFundId) {
      setFormError('Please select a Revolving Fund to disburse from.')
      return
    }
    if (!particularsId) {
      setFormError('Please select a particulars category to categorize this disbursement.')
      return
    }
    if (insufficientBalance) {
      setFormError("The selected fund's balance is insufficient for this request.")
      return
    }

    setPendingAction('disburse')
    const result = await onDisburse({
      revolving_fund_id: revolvingFundId,
      particulars: particularsId,
      cash_voucher: cashVoucher || undefined,
      remarks: remarks || undefined,
    })
    setPendingAction(null)

    if (result?.success) {
      onClose()
    } else {
      setFormError(result?.message || 'Failed to complete cash request.')
    }
  }

  const handleReject = async () => {
    setFormError(null)
    if (!remarks.trim()) {
      setFormError('A reason is required to reject a cash request.')
      return
    }
    setPendingAction('reject')
    const result = await onReject({ remarks })
    setPendingAction(null)
    if (result?.success) {
      onClose()
    } else {
      setFormError(result?.message || 'Failed to reject cash request.')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Fund Custodian Approval"
      subtitle={`${request.reference_id || `#${request.id}`} — select a fund, confirm balance, and release cash`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleDisburse} className="space-y-3 sm:space-y-3.5">
        {formError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Project
            </div>
            <div className="font-semibold text-slate-800">{request.project}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Purpose
            </div>
            <div className="font-semibold text-slate-800">{request.purpose}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Requester
            </div>
            <div className="font-semibold text-slate-800">
              {getEmployeeName
                ? getEmployeeName(request.employee_id)
                : `Employee #${request.employee_id}`}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Department
            </div>
            <div className="font-semibold text-slate-800">
              {getDepartmentName
                ? getDepartmentName(request.department_id)
                : `Dept #${request.department_id}`}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Amount to Disburse
            </div>
            <div className="font-bold text-slate-900">{formatCurrency(request.amount)}</div>
          </div>
        </div>

        {/* Amount in Words Field */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Amount in Words
          </label>
          <input
            type="text"
            readOnly
            tabIndex={-1}
            value={amountInWords}
            placeholder="N/A"
            className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 italic cursor-not-allowed select-none focus:outline-none"
          />
        </div>

        {/* REVOLVING FUND & BALANCE — selected here, not by the Requester */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3">
          <div className="sm:col-span-8">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Revolving Fund <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={revolvingFundId}
              onChange={(e) => setRevolvingFundId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all cursor-pointer"
            >
              <option value="">Select Revolving Fund...</option>
              {eligibleFunds.map((fund) => (
                <option key={fund.id} value={fund.id}>
                  {getFundLabel ? getFundLabel(fund.id) : fund.name || `Fund #${fund.id}`}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Balance
            </label>
            <input
              type="text"
              readOnly
              tabIndex={-1}
              value={selectedFund ? formatCurrency(selectedFund.balance) : ''}
              placeholder="₱ 0.00"
              className={`w-full px-2 py-1.5 border rounded-lg text-xs font-semibold cursor-not-allowed select-none focus:outline-none ${
                insufficientBalance
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            />
          </div>
        </div>
        {insufficientBalance && (
          <p className="text-[11px] text-red-600 font-semibold -mt-2">
            This fund's balance is insufficient to cover {formatCurrency(request.amount)}.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Particulars <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={particularsId}
              onChange={(e) => setParticularsId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all cursor-pointer"
            >
              <option value="">Select Particulars...</option>
              {particulars.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.description || `Particulars #${p.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Cash Voucher{' '}
              <span className="text-slate-400 normal-case font-medium">(optional)</span>
            </label>
            <input
              type="text"
              placeholder={request.reference_id}
              value={cashVoucher}
              onChange={(e) => setCashVoucher(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Remarks{' '}
            <span className="text-slate-400 normal-case font-medium">
              (required to reject, optional to disburse)
            </span>
          </label>
          <textarea
            rows={3}
            placeholder="Add a note..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all placeholder:text-slate-400 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {pendingAction === 'reject' ? 'Rejecting...' : 'Reject'}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || insufficientBalance}
            className="px-4 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {pendingAction === 'disburse' ? 'Disbursing...' : 'Approve & Disburse'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
