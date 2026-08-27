import { useState, useCallback } from 'react'

// Mirrors createCashRequest's required fields exactly — project, purpose,
// amount, department_id, team_lead. employee_id is deliberately NOT part
// of the form: it's the logged-in Requester, supplied by the caller at
// submit time (see handleSubmit), not typed in. revolving_fund_id is
// deliberately NOT collected here either — createCashRequest always
// inserts it as null; fund selection happens later, at Fund Custodian
// completion (see DisburseCashRequestModal / completeCashRequest), never
// at creation.
const INITIAL_FORM_STATE = {
  project: '',
  purpose: '',
  amount: '',
  department_id: '',
  team_lead: '',
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
