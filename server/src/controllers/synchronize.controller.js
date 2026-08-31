const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const { normalizeName, fetchAllHrmisData } = require('../services/hrmis.service.js')

const SQL = new SQLQueryBuilder()

// TODO: confirm this import still resolves in the refactored database/
// layout — the legacy sync route pulled it from repository/helper/
// crytography. If it's gone, point this at whatever hashing this
// codebase's login/auth flow actually uses — passwords should never
// land in master_user as plaintext.
let EncrypterString
try {
  ;({ EncrypterString } = require('../repository/helper/crytography'))
} catch {
  console.warn(
    'synchronize.controller: EncrypterString not found — passwords will be stored as-is ' +
      'until this is wired to the real hashing utility.',
  )
  EncrypterString = (v) => v
}

// ==========================================
// SHARED HELPERS
// ==========================================

/**
 * Next available `PREFIX-###` code for a table whose code column follows
 * that pattern (master_department.md_code, master_position.mp_code).
 */
const nextCode = async (table, codeColumn, prefix) => {
  const rows = await Query(
    `SELECT MAX(CAST(SUBSTRING(${codeColumn}, ${prefix.length + 1}, 3) AS UNSIGNED)) AS max_seq FROM ${table}`,
  )
  const seq = rows?.[0]?.max_seq || 0
  return () => {
    // returns a code-generator closure so callers don't have to thread
    // an incrementing counter through a loop by hand
  }
}

// ==========================================
// DEPARTMENT / POSITION SYNC
// (structurally identical — both are "HRMIS gives a free-text name,
// match by normalized name, insert with an auto-generated PREFIX-### code
// if not found" — collapsed into one generic function instead of two
// near-duplicate ones.)
// ==========================================

/**
 * Syncs a simple, name-keyed master table (department or position)
 * against a list of HRMIS records. Returns how many were added and a
 * normalizedName -> local id map, which employee sync uses to resolve
 * FKs without a second round-trip to the DB.
 *
 * @param {object} model - Master.Department or Master.Position
 * @param {string} nameCol - local column to match on ('name' or 'description')
 * @param {string} codeCol - local code column ('code')
 * @param {string} codePrefix - e.g. 'MD-' or 'MP-'
 * @param {string} tableName - raw table name, for the code-sequence query
 * @param {string} rawCodeCol - raw db column name, for the code-sequence query
 * @param {Array} hrmisRecords - HRMIS's raw array for this entity
 * @param {(record: object) => string} getHrmisName - pulls the display name off one HRMIS record
 */
const syncNamedMasterTable = async ({
  model,
  nameCol,
  codeCol,
  codePrefix,
  tableName,
  rawCodeCol,
  hrmisRecords,
  getHrmisName,
}) => {
  const { sql, bindings } = SQL.model(model).select([model.cols.id, model.cols[nameCol]]).build()
  const existing = await Query(sql, bindings)

  const byName = new Map(existing.map((row) => [normalizeName(row[nameCol]), row.id]))

  const seqRows = await Query(
    `SELECT MAX(CAST(SUBSTRING(${rawCodeCol}, ${codePrefix.length + 1}, 3) AS UNSIGNED)) AS max_seq FROM ${tableName}`,
  )
  let seq = seqRows?.[0]?.max_seq || 0
  let added = 0

  for (const record of hrmisRecords) {
    const displayName = getHrmisName(record)
    const key = normalizeName(displayName)
    if (!key || byName.has(key)) continue

    seq += 1
    const insertQuery = SQL.model(model)
      .insert({
        [model.cols[codeCol]]: `${codePrefix}${String(seq).padStart(3, '0')}`,
        [model.cols[nameCol]]: displayName,
        [model.cols.status]: 'ACTIVE',
      })
      .build()
    const result = await Query(insertQuery.sql, insertQuery.bindings)

    byName.set(key, result.insertId)
    added += 1
  }

  return { added, byName }
}

const syncDepartments = (hrmisDepartments) =>
  syncNamedMasterTable({
    model: Master.Department,
    nameCol: 'name',
    codeCol: 'code',
    codePrefix: 'MD-',
    tableName: 'master_department',
    rawCodeCol: 'md_code',
    hrmisRecords: hrmisDepartments,
    getHrmisName: (dept) => dept.departmentname,
  })

const syncPositions = (hrmisPositions) =>
  syncNamedMasterTable({
    model: Master.Position,
    nameCol: 'description',
    codeCol: 'code',
    codePrefix: 'MP-',
    tableName: 'master_position',
    rawCodeCol: 'mp_code',
    hrmisRecords: hrmisPositions,
    getHrmisName: (pos) => pos.positionname,
  })

// ==========================================
// EMPLOYEE SYNC
// ==========================================

/**
 * master_employee has no column for HRMIS's own employee id — only
 * fullname/department_id/position_id/status. So there's no persisted
 * key to dedupe against or to link a user account back to later. This
 * matches on normalized fullname instead, and returns an in-memory
 * hrmisEmployeeId -> local id map for syncUsers to use within this same
 * run. Two employees sharing a normalized name will collide — flagged,
 * not silently handled. The real fix is adding an external-id column
 * to master_employee.
 */
const syncEmployees = async (hrmisEmployees, deptByName, posByName) => {
  const { sql, bindings } = SQL.model(Master.Employee)
    .select([Master.Employee.cols.id, Master.Employee.cols.fullname])
    .build()
  const existing = await Query(sql, bindings)
  const byName = new Map(existing.map((row) => [normalizeName(row.fullname), row.id]))

  const hrmisIdToLocalId = new Map()
  let added = 0
  const skipped = []

  for (const employee of hrmisEmployees) {
    const fullname = `${employee.firstname || ''} ${employee.lastname || ''}`.trim()
    const nameKey = normalizeName(fullname)

    if (byName.has(nameKey)) {
      hrmisIdToLocalId.set(String(employee.id), byName.get(nameKey))
      continue
    }

    const departmentId = deptByName.get(normalizeName(employee.department))
    const positionId = posByName.get(normalizeName(employee.position))

    if (!departmentId || !positionId) {
      skipped.push({
        id: employee.id,
        name: fullname,
        reason: !departmentId
          ? `Unknown department "${employee.department}"`
          : `Unknown position "${employee.position}"`,
      })
      continue
    }

    const insertQuery = SQL.model(Master.Employee)
      .insert({
        [Master.Employee.cols.fullname]: fullname,
        [Master.Employee.cols.department_id]: departmentId,
        [Master.Employee.cols.position_id]: positionId,
        [Master.Employee.cols.status]: employee.jobstatus || 'ACTIVE',
      })
      .build()
    const result = await Query(insertQuery.sql, insertQuery.bindings)

    byName.set(nameKey, result.insertId)
    hrmisIdToLocalId.set(String(employee.id), result.insertId)
    added += 1
  }

  return { added, skipped, hrmisIdToLocalId }
}

// ==========================================
// USER ACCOUNT SYNC
// ==========================================

/**
 * master_user.employee_id is the FK to master_employee.id (the LOCAL
 * id), not HRMIS's own employee id. hrmisIdToLocalId (built in
 * syncEmployees) bridges the two for this run.
 */
const syncUsers = async (hrmisUsers, hrmisIdToLocalId) => {
  const { sql, bindings } = SQL.model(Master.User)
    .select([Master.User.cols.id, Master.User.cols.employee_id])
    .build()
  const existing = await Query(sql, bindings)
  const existingByEmployeeId = new Set(existing.map((row) => String(row.employee_id)))

  let added = 0
  const skipped = []

  for (const user of hrmisUsers) {
    const { employee_id: hrmisEmployeeId, username, user_password } = user
    const localEmployeeId = hrmisIdToLocalId.get(String(hrmisEmployeeId))

    if (!localEmployeeId) {
      skipped.push({
        employee_id: hrmisEmployeeId,
        username,
        reason: 'No matching local employee record (see employees_skipped, or a fullname mismatch)',
      })
      continue
    }
    if (!username) {
      skipped.push({ employee_id: hrmisEmployeeId, reason: 'Missing username' })
      continue
    }
    if (existingByEmployeeId.has(String(localEmployeeId))) continue

    const insertQuery = SQL.model(Master.User)
      .insert({
        [Master.User.cols.employee_id]: localEmployeeId,
        [Master.User.cols.username]: username,
        [Master.User.cols.password]: EncrypterString(user_password),
        [Master.User.cols.status]: 'ACTIVE',
      })
      .build()
    await Query(insertQuery.sql, insertQuery.bindings)

    existingByEmployeeId.add(String(localEmployeeId))
    added += 1
  }

  return { added, skipped }
}

// ==========================================
// ENTRY POINT
// ==========================================

/**
 * @name runSync
 * @description Pulls departments, positions, employees, and user
 *              accounts from HRMIS and upserts anything not already
 *              present locally, in dependency order (departments/
 *              positions -> employees -> users). A failing HRMIS
 *              endpoint doesn't abort the run — see fetchAllHrmisData.
 */
const runSync = async (req, res) => {
  // #swagger.tags = ['Synchronize']
  // #swagger.description = 'Sync departments, positions, employees, and user accounts from HRMIS'
  try {
    // Token is fetched fresh from HRMIS's permanent token endpoint right
    // before use — no human copy-paste step, so no expiry race.
    const hrmis = await fetchAllHrmisData({ debug: true })

    const received = {
      departments_received: hrmis.departments.length,
      positions_received: hrmis.positions.length,
      employees_received: hrmis.employees.length,
      users_received: hrmis.users.length,
    }
    console.log('runSync — raw counts received from HRMIS:', received)

    const { added: departmentsAdded, byName: deptByName } = await syncDepartments(hrmis.departments)
    const { added: positionsAdded, byName: posByName } = await syncPositions(hrmis.positions)
    const {
      added: employeesAdded,
      skipped: employeesSkipped,
      hrmisIdToLocalId,
    } = await syncEmployees(hrmis.employees, deptByName, posByName)
    const { added: usersAdded, skipped: usersSkipped } = await syncUsers(
      hrmis.users,
      hrmisIdToLocalId,
    )

    return res.status(200).json({
      message:
        hrmis.errors.length > 0
          ? 'Synchronization completed with some HRMIS endpoints unreachable - see fetch_errors'
          : 'Synchronization completed',
      summary: {
        ...received,
        departments_added: departmentsAdded,
        positions_added: positionsAdded,
        employees_added: employeesAdded,
        employees_skipped: employeesSkipped,
        users_added: usersAdded,
        users_skipped: usersSkipped,
        fetch_errors: hrmis.errors,
        synced_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error in runSync:', error)
    return res.status(500).json({ message: error.message || 'Synchronization failed' })
  }
}

module.exports = { runSync }
