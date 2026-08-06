import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import budgetApi from '../api/budgetApi'

const INITIAL_FORM_STATE = {
  department_id: '',
  type: 'CASH',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  remarks: '',
}

function useBudgetForm() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState(null)
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)

  const saveMutation = useMutation({
    mutationFn: (payload) => budgetApi.save(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      handleCloseModal()
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Error processing budget request')
    },
  })

  const handleOpenModal = (budget = null) => {
    if (budget) {
      setSelectedBudget(budget)
      setFormData({
        department_id: budget.department_id || '',
        type: budget.type || 'CASH',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        remarks: '',
      })
    } else {
      setSelectedBudget(null)
      setFormData(INITIAL_FORM_STATE)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedBudget(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const parsedAmount = parseFloat(formData.amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount greater than zero.')
      return
    }

    const payload = {
      ...formData,
      amount: parsedAmount,
      ...(selectedBudget ? { id: selectedBudget.id } : {}),
    }

    saveMutation.mutate(payload)
  }

  return {
    isModalOpen,
    selectedBudget,
    isSubmitting: saveMutation.isPending,
    formData,
    setFormData,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
  }
}

export default useBudgetForm
