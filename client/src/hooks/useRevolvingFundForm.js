import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import revolvingFundApi from '../api/revolvingFundApi'

const getTodayISO = () => new Date().toISOString().split('T')[0]

const INITIAL_FORM_STATE = {
  budgetId: '',
  budget_id: '',
  name: '',
  baseCap: '',
  base_cap: '',
  remarks: '',
}

/**
 * Handles CREATE only. Editing an existing fund goes through
 * useEditRevolvingFund's additive add_amount flow instead — this hook
 * used to also support an "edit" branch, but nothing in RevolvingFundPage
 * ever calls handleOpenModal with a fund argument, and if it ever did,
 * this branch would have sent beginning/total_fund/balance as absolute
 * overwrites rather than a top-up delta, silently discarding the fund's
 * real accumulated added/issued/liquidated history. Removed rather than
 * left as dead code that could get wired up by accident later.
 */
function useRevolvingFundForm() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)

  const saveMutation = useMutation({
    mutationFn: (payload) => revolvingFundApi.save(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revolvingFunds'] })
      handleCloseModal()
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Error processing revolving fund request.')
    },
  })

  const handleOpenModal = () => {
    setFormData(INITIAL_FORM_STATE)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setFormData(INITIAL_FORM_STATE)
  }

  const handleSubmit = (e) => {
    e?.preventDefault?.()

    const rawCap = formData.baseCap || formData.base_cap
    const parsedCap = parseFloat(rawCap)
    const budgetIdVal = formData.budgetId || formData.budget_id

    if (!budgetIdVal) {
      alert('Please select a valid Budget.')
      return
    }
    if (isNaN(parsedCap) || parsedCap <= 0) {
      alert('Please enter a valid base capacity amount greater than zero.')
      return
    }

    const startDateVal = getTodayISO()
    const startDateObj = new Date(startDateVal)

    const payload = {
      budget_id: Number(budgetIdVal),
      year: startDateObj.getFullYear(),
      month: startDateObj.getMonth() + 1,
      start_date: startDateVal,
      end_date: null,
      beginning: parsedCap,
      total_fund: parsedCap,
      balance: parsedCap,
      status: 'OPEN',
    }

    saveMutation.mutate(payload)
  }

  return {
    isModalOpen,
    isSubmitting: saveMutation.isPending,
    formData,
    setFormData,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
  }
}

export default useRevolvingFundForm
