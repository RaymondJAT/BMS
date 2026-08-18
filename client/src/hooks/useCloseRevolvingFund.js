import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import revolvingFundApi from '../api/revolvingFundApi'

const getLocalTodayISO = () => {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60 * 1000).toISOString().split('T')[0]
}

const VALID_VARIANCE_STATUSES = ['BALANCED', 'SHORT', 'OVER']

function useCloseRevolvingFund() {
  const queryClient = useQueryClient()
  const [closeModalFund, setCloseModalFund] = useState(null)

  const closeMutation = useMutation({
    mutationFn: (payload) => revolvingFundApi.saveClosed(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revolvingFunds'] })
      handleCloseModal()
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to submit fund closure report.')
    },
  })

  const handleOpenCloseModal = (fund, e) => {
    e?.stopPropagation?.()
    setCloseModalFund(fund)
  }

  const handleCloseModal = () => {
    setCloseModalFund(null)
  }

  const handleConfirmClose = (closureData = {}) => {
    if (!closeModalFund) return

    const fundId = closeModalFund.id || closeModalFund.revolving_fund_id
    const cashOnHand = parseFloat(closureData.cashonhand) || 0
    const gcash = parseFloat(closureData.gcash) || 0

    // BUG FIX 1: this used to hardcode status: 'CLOSED', which isn't a
    // valid reconciliation status as far as the backend's
    // upsertClosedRevolvingFund is concerned (it only accepts
    // BALANCED/SHORT/OVER) — that invalid value silently failed
    // validation there and fell back to 'BALANCED' every time, regardless
    // of actual variance. SubmitRevolvingFundModal already computes the
    // real variance and passes it as closureData.varianceStatus, so use
    // that directly instead of re-deriving or hardcoding it here.
    const varianceStatus = VALID_VARIANCE_STATUSES.includes(
      String(closureData.varianceStatus || '').toUpperCase(),
    )
      ? closureData.varianceStatus.toUpperCase()
      : 'BALANCED'

    // BUG FIX 2: this used to always stamp today's date via getTodayISO(),
    // discarding the "Closure Date" the user picked in the modal (passed
    // through as closureData.end_date / closureData.reportedDate). Now
    // uses whichever the modal supplied, falling back to today only if
    // neither is present (e.g. called from somewhere without that field).
    const closureDate = closureData.end_date || closureData.reportedDate || getLocalTodayISO()

    const payload = {
      revolving_fund_id: fundId,
      end_date: closureDate,
      cashonhand: cashOnHand,
      gcash: gcash,
      total_cash: cashOnHand + gcash,
      status: varianceStatus,
      remarks: closureData.remarks || '',
    }

    closeMutation.mutate(payload)
  }

  return {
    closeModalFund,
    isClosing: closeMutation.isPending,
    handleOpenCloseModal,
    handleCloseModal,
    handleConfirmClose,
  }
}

export default useCloseRevolvingFund
