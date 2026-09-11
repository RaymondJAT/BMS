import { useState, useEffect, useCallback, useMemo } from 'react'
import { revolvingFundApi } from '../api/revolvingFundApi'
import { budgetApi } from '../api/budgetApi'
import { masterDepartmentApi } from '../api/masterDepartmentApi'
import { masterEmployeeApi } from '../api/masterEmployeeApi'
import { masterParticularsApi } from '../api/masterParticularsApi'
import { masterUserApi } from '../api/masterUserApi'
import { masterAccessApi } from '../api/masterAccessApi'
import { routeAccessApi } from '../api/routeAccessApi'
import { masterProjectApi } from '../api/masterProjectApi'

// Strips spaces/punctuation and upper-cases, so "Team Leader",
// "TEAM_LEAD", "team-leader" etc. all normalize to the same string.
// getMasterUser already joins access_name straight onto each user row
// (see masterUserController.js), so no separate role-id lookup is
// needed here — just filter users by that field directly.
const normalizeRoleName = (name) =>
  String(name || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')

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
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [
        rfRes,
        budgetRes,
        deptRes,
        empRes,
        partRes,
        userRes,
        accessRes,
        routeAccessRes,
        projectRes,
      ] = await Promise.allSettled([
        revolvingFundApi.getAll(),
        budgetApi.getAll(),
        masterDepartmentApi.getAll(),
        masterEmployeeApi.getAll(),
        masterParticularsApi.getAll(),
        masterUserApi.getAll(),
        masterAccessApi?.getAll ? masterAccessApi.getAll() : Promise.resolve([]),
        routeAccessApi.getAll(),
        // Master Project controller isn't wired up yet — fails soft via
        // Promise.allSettled so the rest of the page still loads. Once
        // masterProjectApi/masterProjectController exist server-side,
        // this starts returning real data with no other changes needed.
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
      setAccessRoles(unwrap(accessRes))
      setRouteAccess(unwrap(routeAccessRes))
      setProjects(unwrap(projectRes))
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

  // id -> role name, for resolving a user's access_id to a display label
  // in places that only have an access_id, not an already-joined
  // access_name (e.g. Master Users admin table).
  const rolesMap = useMemo(() => {
    return accessRoles.reduce((acc, role) => {
      const id = role.ma_id ?? role.id ?? role.access_id ?? role.role_id
      const name = role.ma_name || role.name || role.role_name || role.access_name
      if (id != null && name) {
        acc[id] = name
        acc[String(id)] = name
      }
      return acc
    }, {})
  }, [accessRoles])

  // Cash Request "Project" dropdown should only offer ACTIVE projects —
  // INACTIVE ones stay visible on an admin Master Projects page (via the
  // full `projects` list) but drop out of new-request selection.
  const activeProjects = useMemo(
    () => projects.filter((p) => String(p.status).toUpperCase() === 'ACTIVE'),
    [projects],
  )

  // Users with Team Leader access — source for the Cash Request "Team
  // Leader" dropdown. getMasterUser already joins access_name onto each
  // row, so this filters directly rather than resolving access_id
  // through rolesMap. Only ACTIVE users are offered as selectable leads.
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

  const getParticularsName = useCallback(
    (id) => {
      const match = particulars.find((p) => String(p.id || p.mp_id) === String(id))
      return match?.name || match?.mp_name || match?.description || `Particulars #${id ?? 'N/A'}`
    },
    [particulars],
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
    rolesMap,
    accessRoles,
    routeAccess,
    projects,
    activeProjects,
    teamLeads,
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
