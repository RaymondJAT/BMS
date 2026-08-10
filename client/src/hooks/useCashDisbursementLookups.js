import { useState, useEffect, useCallback } from 'react'
import { revolvingFundApi } from '../api/revolvingFundApi'
import { budgetApi } from '../api/budgetApi'
import { masterDepartmentApi } from '../api/masterDepartmentApi'
import { masterEmployeeApi } from '../api/masterEmployeeApi'
import { masterParticularsApi } from '../api/masterParticularsApi'

/**
 * Fetches the reference data needed by the disbursement modals and table
 * (fund/department/employee/particulars dropdowns + id→label resolution).
 *
 * NOTE: master-employee and master-particulars response shapes are assumed
 * (see api/masterEmployeeApi.js and api/masterParticularsApi.js). The
 * resolver functions below try a couple of likely key names as a fallback
 * so a shape mismatch degrades to "Employee #12" style placeholders rather
 * than throwing — but the real keys should be confirmed and this narrowed
 * once the actual controllers are available.
 */
export function useCashDisbursementLookups() {
  const [revolvingFunds, setRevolvingFunds] = useState([])
  const [budgets, setBudgets] = useState([])
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [particulars, setParticulars] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [rfRes, budgetRes, deptRes, empRes, partRes] = await Promise.allSettled([
        revolvingFundApi.getAll(),
        budgetApi.getAll(),
        masterDepartmentApi.getAll(),
        masterEmployeeApi.getAll(),
        masterParticularsApi.getAll(),
      ])

      if (rfRes.status === 'fulfilled') setRevolvingFunds(rfRes.value || [])
      else console.error('Failed to fetch revolving funds:', rfRes.reason)

      if (budgetRes.status === 'fulfilled') setBudgets(budgetRes.value || [])
      else console.error('Failed to fetch budgets:', budgetRes.reason)

      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value || [])
      else console.error('Failed to fetch departments:', deptRes.reason)

      if (empRes.status === 'fulfilled') setEmployees(empRes.value || [])
      else console.error('Failed to fetch employees:', empRes.reason)

      if (partRes.status === 'fulfilled') setParticulars(partRes.value || [])
      else console.error('Failed to fetch particulars:', partRes.reason)
    } catch (err) {
      console.error('Failed to fetch cash disbursement lookups:', err)
      setError('Failed to load reference data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const getDepartmentName = useCallback(
    (id) => {
      const match = departments.find((d) => String(d.id) === String(id))
      return match?.name || `Department #${id ?? 'N/A'}`
    },
    [departments],
  )

  const getEmployeeName = useCallback(
    (id) => {
      const match = employees.find((e) => String(e.id) === String(id))
      // Trying a couple of likely key names — see note at top of file.
      return match?.fullname || match?.name || match?.full_name || `Employee #${id ?? 'N/A'}`
    },
    [employees],
  )

  const getParticularsName = useCallback(
    (id) => {
      const match = particulars.find((p) => String(p.id) === String(id))
      return match?.name || match?.description || `Particulars #${id ?? 'N/A'}`
    },
    [particulars],
  )

  /**
   * revolving_fund rows only carry budget_id, not department_id directly —
   * the department comes from budget.department_id, one hop further out.
   */
  const getFundLabel = useCallback(
    (id) => {
      const fund = revolvingFunds.find((f) => String(f.id) === String(id))
      if (!fund) return `Fund #${id ?? 'N/A'}`

      const budget = budgets.find((b) => String(b.id) === String(fund.budget_id))
      const deptName = budget ? getDepartmentName(budget.department_id) : 'Unknown Dept'
      const fundType = budget?.type ? ` — ${budget.type}` : ''

      return `${deptName}${fundType} (Fund #${fund.id})`
    },
    [revolvingFunds, budgets, getDepartmentName],
  )

  return {
    revolvingFunds,
    budgets,
    departments,
    employees,
    particulars,
    isLoading,
    error,
    refetch: fetchAll,
    getDepartmentName,
    getEmployeeName,
    getParticularsName,
    getFundLabel,
  }
}

export default useCashDisbursementLookups
