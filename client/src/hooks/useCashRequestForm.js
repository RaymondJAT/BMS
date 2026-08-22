import { useState, useCallback } from 'react'

const INITIAL_FORM_STATE = {
  department_id: '',
  department_name: '',
  purpose: '',
  amount_requested: '',
  revolving_fund_id: '',
  notes: '',
}

function useCashRequestForm() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setFormData(INITIAL_FORM_STATE)
  }, [])

  const handleSubmit = useCallback(
    async (onSubmitCallback) => {
      setIsSubmitting(true)
      try {
        if (onSubmitCallback && typeof onSubmitCallback === 'function') {
          await onSubmitCallback(formData)
        }
      } finally {
        setIsSubmitting(false)
        handleCloseModal()
      }
    },
    [formData, handleCloseModal],
  )

  return {
    isModalOpen,
    formData,
    setFormData,
    isSubmitting,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
  }
}

export default useCashRequestForm
