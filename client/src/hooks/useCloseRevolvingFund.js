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
    const totalCash = cashOnHand + gcash

    const varianceStatus = VALID_VARIANCE_STATUSES.includes(
      String(closureData.varianceStatus || '').toUpperCase(),
    )
      ? closureData.varianceStatus.toUpperCase()
      : 'BALANCED'

    const closureDate = closureData.end_date || closureData.reportedDate || getLocalTodayISO()

    // Pull the fund's own ledger numbers (beginning/added/returned/
    // expended) straight from the row the modal was opened with, so the
    // closed_revolving_fund audit row records a real reconciliation
    // rather than defaulting these to 0 — SubmitRevolvingFundModal
    // already computes expectedEndingBalance from the same fields, but
    // that value never made it into the payload before.
    const beginning = parseFloat(closeModalFund.beginning ?? closeModalFund.baseCap ?? 0)
    const added = parseFloat(closeModalFund.added ?? closeModalFund.replenished ?? 0)
    const returned = parseFloat(closeModalFund.returned ?? 0)
    const expended = parseFloat(closeModalFund.amount_expended ?? closeModalFund.expended ?? 0)
    const expectedEndingBalance =
      closureData.expectedEndingBalance ?? beginning + added + returned - expended

    const payload = {
      revolving_fund_id: fundId,
      end_date: closureDate,
      beginning,
      cash_inflow: added + returned,
      cash_outflow: expended,
      ending: expectedEndingBalance,
      cashonhand: cashOnHand,
      gcash: gcash,
      total_cash: totalCash,
      sub_total: totalCash,
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
