import { useState, useEffect, useCallback, useMemo } from 'react'
import { revolvingFundApi } from '../api/revolvingFundApi'
import { budgetApi } from '../api/budgetApi'
import { masterDepartmentApi } from '../api/masterDepartmentApi'
import { masterEmployeeApi } from '../api/masterEmployeeApi'
import { masterParticularsApi } from '../api/masterParticularsApi'
import { masterUserApi } from '../api/masterUserApi'
import { masterAccessApi } from '../api/masterAccessApi'
import { routeAccessApi } from '../api/routeAccessApi'

/**
 * Central reference-data lookup hook for Budget / Revolving Fund / Cash
 * Disbursement / Cash Request / Liquidation / Master Files pages.
 */
export function useCashDisbursementLookups() {
  const [revolvingFunds, setRevolvingFunds] = useState([])
  const [budgets, setBudgets] = useState([])
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [particulars, setParticulars] = useState([])
  const [users, setUsers] = useState([])
  const [accessRoles, setAccessRoles] = useState([])
  const [routeAccess, setRouteAccess] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [rfRes, budgetRes, deptRes, empRes, partRes, userRes, accessRes, routeAccessRes] =
        await Promise.allSettled([
          revolvingFundApi.getAll(),
          budgetApi.getAll(),
          masterDepartmentApi.getAll(),
          masterEmployeeApi.getAll(),
          masterParticularsApi.getAll(),
          masterUserApi.getAll(),
          masterAccessApi?.getAll ? masterAccessApi.getAll() : Promise.resolve([]),
          routeAccessApi.getAll(),
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
      setUsers(unwrap(userRes))
      setAccessRoles(unwrap(accessRes))
      setRouteAccess(unwrap(routeAccessRes))
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

  // id -> role name, for resolving a user's access_id to a display label.
  const rolesMap = useMemo(() => {
    return accessRoles.reduce((acc, role) => {
      const id = role.id ?? role.access_id ?? role.role_id
      const name = role.name || role.role_name || role.access_name
      if (id != null && name) {
        acc[id] = name
        acc[String(id)] = name
      }
      return acc
    }, {})
  }, [accessRoles])

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
      return match?.fullname || `Employee #${id ?? 'N/A'}`
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

  const getFundLabel = useCallback(
    (id) => {
      const fund = revolvingFunds.find((f) => String(f.id) === String(id))
      if (!fund) return 'Unknown Fund'

      const budget = budgets.find((b) => String(b.id) === String(fund.budget_id))
      if (!budget) return 'Unknown Fund'

      const deptName = getDepartmentName(budget.department_id)
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
    users,
    rolesMap,
    routeAccess,
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
