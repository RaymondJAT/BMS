import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import revolvingFundApi from '../api/revolvingFundApi'

const getTodayISO = () => new Date().toISOString().split('T')[0]

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
    const submissionDate = getTodayISO()

    const payload = {
      revolving_fund_id: fundId,
      end_date: submissionDate,
      cashonhand: cashOnHand,
      gcash: gcash,
      total_cash: cashOnHand + gcash,
      status: 'CLOSED',
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
