import { useState, useEffect, useCallback, useMemo } from 'react'
import { revolvingFundApi } from '../api/revolvingFundApi'
import { budgetApi } from '../api/budgetApi'
import { masterDepartmentApi } from '../api/masterDepartmentApi'
import { masterEmployeeApi } from '../api/masterEmployeeApi'
import { masterParticularsApi } from '../api/masterParticularsApi'
import { masterUserApi } from '../api/masterUserApi'
import { masterProjectApi } from '../api/masterProjectApi'

// Strips spaces/punctuation and upper-cases — same normalization as the
// original shared hook, so "Team Leader" / "TEAM_LEAD" / "team-leader"
// all match. getMasterUser already joins access_name onto each user row,
// so no separate role-id lookup is needed.
const normalizeRoleName = (name) =>
  String(name || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')

/**
 * Cash Request page's lookup hook. Same fetch pattern as
 * useCashDisbursementLookups, scoped to what the Create/Edit/Approve/
 * Disburse modals and the embedded Liquidate-flow's cash-side lookups
 * actually read: revolvingFunds + budgets (for getFundLabel),
 * departments, employees, particulars (handed to CreateLiquidationModal),
 * projects (for activeProjects), and users (for teamLeads).
 *
 * accessRoles/routeAccess are deliberately NOT fetched — this page never
 * reads a roles map, so pulling the full Access Role list here would be
 * dead weight. The page's own districts/modes/searchStores still come
 * from useLiquidationMasterData, untouched by this hook.
 */
export function useCashRequestLookups() {
  const [revolvingFunds, setRevolvingFunds] = useState([])
  const [budgets, setBudgets] = useState([])
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [particulars, setParticulars] = useState([])
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [rfRes, budgetRes, deptRes, empRes, partRes, userRes, projectRes] =
        await Promise.allSettled([
          revolvingFundApi.getAll(),
          budgetApi.getAll(),
          masterDepartmentApi.getAll(),
          masterEmployeeApi.getAll(),
          masterParticularsApi.getAll(),
          masterUserApi.getAll(),
          // Master Project controller isn't wired up yet — fails soft via
          // Promise.allSettled so the rest of the page still loads, same
          // guard as the original shared hook.
          masterProjectApi?.getAll ? masterProjectApi.getAll() : Promise.resolve([]),
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
      setProjects(unwrap(projectRes))
    } catch (err) {
      console.error('Failed to fetch cash request lookups:', err)
      setError('Failed to load reference data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Cash Request "Project" dropdown should only offer ACTIVE projects —
  // INACTIVE ones drop out of new-request selection. Mirrors the
  // original shared hook's behavior exactly.
  const activeProjects = useMemo(
    () => projects.filter((p) => String(p.status).toUpperCase() === 'ACTIVE'),
    [projects],
  )

  // Users with Team Leader access — filters directly against the
  // already-joined access_name rather than resolving access_id through a
  // separate roles lookup. Only ACTIVE users are offered as leads.
  const teamLeads = useMemo(() => {
    return users.filter((u) => {
      if (String(u.status).toUpperCase() !== 'ACTIVE') return false
      return normalizeRoleName(u.access_name).includes('TEAMLEAD')
    })
  }, [users])

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
    users,
    projects,
    activeProjects,
    teamLeads,
    isLoading,
    error,
    refetch: fetchAll,
    getDepartmentName,
    getEmployeeName,
    getFundLabel,
  }
}

export default useCashRequestLookups
