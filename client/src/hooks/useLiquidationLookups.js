import { useState, useEffect, useCallback } from 'react'
import { revolvingFundApi } from '../api/revolvingFundApi'
import { budgetApi } from '../api/budgetApi'
import { masterDepartmentApi } from '../api/masterDepartmentApi'
import { masterEmployeeApi } from '../api/masterEmployeeApi'
import { masterParticularsApi } from '../api/masterParticularsApi'

/**
 * Liquidation page's lookup hook. Scoped to what the Liquidation list +
 * Edit/Approve/Verify/Finance modals actually read from the old shared
 * hook: particulars (each liquidation line's Particulars dropdown),
 * employees + getEmployeeName, and revolvingFunds + budgets +
 * departments purely so getFundLabel can resolve a disbursement's
 * originating fund to a display name.
 *
 * Deliberately does NOT duplicate what the page already fetches via its
 * own dedicated hooks, left untouched: useLiquidationMasterData
 * (districts/modes/searchStores — Store/Transport fields on each line),
 * useCashDisbursements (disbursement rows, for the Verify modal's fund
 * picker), and useRevolvingFunds (full fund list with status, same
 * picker).
 */
export function useLiquidationLookups() {
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

      const unwrap = (res) => {
        if (res.status !== 'fulfilled') return []
        const val = res.value
        return Array.isArray(val) ? val : val?.data || val?.result || []
      }

      setRevolvingFunds(unwrap(rfRes))
      setBudgets(unwrap(budgetRes))
      setDepartments(unwrap(deptRes))
      setEmployees(unwrap(empRes))
      setParticulars(unwrap(partRes))
    } catch (err) {
      console.error('Failed to fetch liquidation lookups:', err)
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
      const match = departments.find((d) => String(d.id || d.md_id) === String(id))
      return match?.name || match?.md_name || `Department #${id ?? 'N/A'}`
    },
    [departments],
  )

  const getEmployeeName = useCallback(
    (id) => {
      const match = employees.find((e) => String(e.id || e.me_id) === String(id))
      return match?.fullname || match?.me_fullname || `Employee #${id ?? 'N/A'}`
    },
    [employees],
  )

  const getFundLabel = useCallback(
    (id) => {
      const fund = revolvingFunds.find((f) => String(f.id || f.rf_id) === String(id))
      if (!fund) return 'Unknown Fund'

      const budget = budgets.find(
        (b) => String(b.id || b.b_id) === String(fund.budget_id || fund.rf_budget_id),
      )
      if (!budget) return 'Unknown Fund'

      const deptName = getDepartmentName(budget.department_id || budget.b_department_id)
      return budget.type ? `${deptName} — ${budget.type}` : deptName
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
    getFundLabel,
  }
}

export default useLiquidationLookups
