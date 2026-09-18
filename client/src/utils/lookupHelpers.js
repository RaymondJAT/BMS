/**
 * Shared name/label resolvers used by every lookup hook that exposes
 * departments/employees/revolvingFunds+budgets (useCashDisbursementLookups,
 * useCashRequestLookups, useLiquidationLookups). Each of those hooks used
 * to carry its own copy of this exact find-by-id-with-fallback logic —
 * centralized here so a fix only has to happen once.
 */
export const findDepartmentName = (departments, id) => {
  const match = departments.find((d) => String(d.id || d.md_id) === String(id))
  return match?.name || match?.md_name || `Department #${id ?? 'N/A'}`
}

export const findEmployeeName = (employees, id) => {
  const match = employees.find((e) => String(e.id || e.me_id) === String(id))
  return match?.fullname || match?.me_fullname || `${id ?? 'N/A'}`
}

export const findFundLabel = (revolvingFunds, budgets, departments, id) => {
  const fund = revolvingFunds.find((f) => String(f.id || f.rf_id) === String(id))
  if (!fund) return 'Unknown Fund'

  const budget = budgets.find(
    (b) => String(b.id || b.b_id) === String(fund.budget_id || fund.rf_budget_id),
  )
  if (!budget) return 'Unknown Fund'

  const deptName = findDepartmentName(departments, budget.department_id || budget.b_department_id)
  return budget.type ? `${deptName} — ${budget.type}` : deptName
}
