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

function useRevolvingFundForm() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedFund, setSelectedFund] = useState(null)
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

  const handleOpenModal = (fund = null) => {
    if (fund) {
      setSelectedFund(fund)
      setFormData({
        budgetId: fund.budget_id || fund.budgetId || '',
        budget_id: fund.budget_id || fund.budgetId || '',
        name: fund.name || fund.fund_name || '',
        baseCap: fund.beginning || fund.base_cap || fund.baseCap || '',
        base_cap: fund.beginning || fund.base_cap || fund.baseCap || '',
        remarks: fund.remarks || '',
      })
    } else {
      setSelectedFund(null)
      setFormData(INITIAL_FORM_STATE)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedFund(null)
    setFormData(INITIAL_FORM_STATE)
  }

  const handleSubmit = (e) => {
    e?.preventDefault?.()

    // 1. Extract inputs
    const rawCap = formData.baseCap || formData.base_cap
    const parsedCap = parseFloat(rawCap)
    const budgetIdVal = formData.budgetId || formData.budget_id

    // 2. Validate input values
    if (!budgetIdVal) {
      alert('Please select a valid Budget.')
      return
    }

    if (isNaN(parsedCap) || parsedCap <= 0) {
      alert('Please enter a valid base capacity amount greater than zero.')
      return
    }

    // 3. Dynamically set start_date to today for new funds
    const startDateVal = selectedFund?.start_date
      ? selectedFund.start_date.split('T')[0]
      : getTodayISO()
    const startDateObj = new Date(startDateVal)
    const computedYear = startDateObj.getFullYear()
    const computedMonth = startDateObj.getMonth() + 1

    // 4. Build payload with end_date explicitly null on creation
    const payload = {
      ...(selectedFund ? { id: selectedFund.id } : {}),
      budget_id: Number(budgetIdVal),
      name: formData.name || `Revolving Fund - ${startDateVal}`,
      year: computedYear,
      month: computedMonth,
      start_date: startDateVal,
      end_date: selectedFund ? selectedFund.end_date || null : null,
      beginning: parsedCap,
      total_fund: parsedCap,
      balance: parsedCap,
      status: selectedFund?.status || 'OPEN',
      remarks: formData.remarks || '',
    }

    saveMutation.mutate(payload)
  }

  return {
    isModalOpen,
    selectedFund,
    isSubmitting: saveMutation.isPending,
    formData,
    setFormData,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
  }
}

export default useRevolvingFundForm
