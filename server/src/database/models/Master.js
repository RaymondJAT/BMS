/**
 * ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 */

/**
 * @typedef {Object} AccessCols
 * @property {'ma_id'} id
 * @property {'ma_name'} name
 * @property {'ma_status'} status
 * @property {'ma_createdAt'} createdAt
 */

/**
 * @typedef {Object} PositionCols
 * @property {'mp_id'} id
 * @property {'mp_code'} code
 * @property {'mp_description'} description
 * @property {'mp_status'} status
 * @property {'mp_createdAt'} createdAt
 */

/**
 * @typedef {Object} DepartmentCols
 * @property {'md_id'} id
 * @property {'md_code'} code
 * @property {'md_name'} name
 * @property {'md_status'} status
 * @property {'md_createdAt'} createdAt
 */

/**
 * @typedef {Object} EmployeeCols
 * @property {'me_id'} id
 * @property {'me_fullname'} fullname
 * @property {'me_department_id'} department_id
 * @property {'me_position_id'} position_id
 * @property {'me_status'} status
 * @property {'me_createdAt'} createdAt
 */

/**
 * @typedef {Object} UserCols
 * @property {'mu_id'} id
 * @property {'mu_employee_id'} employee_id
 * @property {'mu_username'} username
 * @property {'mu_password'} password
 * @property {'mu_status'} status
 * @property {'mu_createdAt'} createdAt
 */

/**
 * @typedef {Object} RouteAccessCols
 * @property {'mra_id'} id
 * @property {'mra_access_id'} access_id
 * @property {'mra_name'} name
 * @property {'mra_status'} status
 * @property {'mra_createdAt'} createdAt
 */

/**
 * @typedef {Object} WalletCols
 * @property {'mw_id'} id
 * @property {'mw_employee_id'} employee_id
 * @property {'mw_previous_amount'} previous_amount
 * @property {'mw_current_amount'} current_amount
 */

/**
 * @typedef {Object} WalletActivityCols
 * @property {'mwa_id'} id
 * @property {'mwa_wallet_id'} wallet_id
 * @property {'mwa_date'} date
 * @property {'mwa_createdAt'} createdAt
 */

/**
 * @typedef {Object} DistrictCols
 * @property {'mdt_id'} id
 * @property {'mdt_store_number'} store_number
 * @property {'mdt_store_name'} store_name
 * @property {'mdt_region'} region
 * @property {'mdt_city_province'} city_province
 * @property {'mdt_status'} status
 * @property {'mdt_createdAt'} createdAt
 */

/**
 * @typedef {Object} ModeOfTransportationCols
 * @property {'mmot_id'} id
 * @property {'mmot_name'} name
 * @property {'mmot_status'} status
 * @property {'mmot_createdAt'} createdAt
 */

/**
 * @typedef {Object} ParticularsCols
 * @property {'mpt_id'} id
 * @property {'mpt_code'} code
 * @property {'mpt_name'} name
 * @property {'mpt_type'} type
 * @property {'mpt_description'} description
 * @property {'mpt_status'} status
 * @property {'mpt_createdAt'} createdAt
 */

const Master = {
  Access: {
    table: 'master_access',
    pk: 'ma_id',
    prefix: 'ma',
    /** @type {AccessCols} */
    cols: {
      id: 'ma_id',
      name: 'ma_name',
      status: 'ma_status',
      createdAt: 'ma_createdAt',
    },
    select: ['ma_id', 'ma_name', 'ma_status', 'ma_createdAt'],
    insert: ['ma_name', 'ma_status'],
  },
  Position: {
    table: 'master_position',
    pk: 'mp_id',
    prefix: 'mp',
    /** @type {PositionCols} */
    cols: {
      id: 'mp_id',
      code: 'mp_code',
      description: 'mp_description',
      status: 'mp_status',
      createdAt: 'mp_createdAt',
    },
    select: ['mp_id', 'mp_code', 'mp_description', 'mp_status', 'mp_createdAt'],
    insert: ['mp_code', 'mp_description', 'mp_status'],
  },
  Department: {
    table: 'master_department',
    pk: 'md_id',
    prefix: 'md',
    /** @type {DepartmentCols} */
    cols: {
      id: 'md_id',
      code: 'md_code',
      name: 'md_name',
      status: 'md_status',
      createdAt: 'md_createdAt',
    },
    select: ['md_id', 'md_code', 'md_name', 'md_status', 'md_createdAt'],
    insert: ['md_code', 'md_name', 'md_status'],
  },
  Employee: {
    table: 'master_employee',
    pk: 'me_id',
    prefix: 'me',
    /** @type {EmployeeCols} */
    cols: {
      id: 'me_id',
      fullname: 'me_fullname',
      department_id: 'me_department_id',
      position_id: 'me_position_id',
      status: 'me_status',
      createdAt: 'me_createdAt',
    },
    select: ['me_id', 'me_fullname', 'me_department_id', 'me_position_id', 'me_status', 'me_createdAt'],
    insert: ['me_fullname', 'me_department_id', 'me_position_id', 'me_status'],
  },
  User: {
    table: 'master_user',
    pk: 'mu_id',
    prefix: 'mu',
    /** @type {UserCols} */
    cols: {
      id: 'mu_id',
      employee_id: 'mu_employee_id',
      username: 'mu_username',
      password: 'mu_password',
      status: 'mu_status',
      createdAt: 'mu_createdAt',
    },
    select: ['mu_id', 'mu_employee_id', 'mu_username', 'mu_password', 'mu_status', 'mu_createdAt'],
    insert: ['mu_employee_id', 'mu_username', 'mu_password', 'mu_status'],
  },
  RouteAccess: {
    table: 'master_route_access',
    pk: 'mra_id',
    prefix: 'mra',
    /** @type {RouteAccessCols} */
    cols: {
      id: 'mra_id',
      access_id: 'mra_access_id',
      name: 'mra_name',
      status: 'mra_status',
      createdAt: 'mra_createdAt',
    },
    select: ['mra_id', 'mra_access_id', 'mra_name', 'mra_status', 'mra_createdAt'],
    insert: ['mra_access_id', 'mra_name', 'mra_status'],
  },
  Wallet: {
    table: 'master_wallet',
    pk: 'mw_id',
    prefix: 'mw',
    /** @type {WalletCols} */
    cols: {
      id: 'mw_id',
      employee_id: 'mw_employee_id',
      previous_amount: 'mw_previous_amount',
      current_amount: 'mw_current_amount',
    },
    select: ['mw_id', 'mw_employee_id', 'mw_previous_amount', 'mw_current_amount'],
    insert: ['mw_employee_id', 'mw_previous_amount', 'mw_current_amount'],
  },
  WalletActivity: {
    table: 'master_wallet_activity',
    pk: 'mwa_id',
    prefix: 'mwa',
    /** @type {WalletActivityCols} */
    cols: {
      id: 'mwa_id',
      wallet_id: 'mwa_wallet_id',
      date: 'mwa_date',
      createdAt: 'mwa_createdAt',
    },
    select: ['mwa_id', 'mwa_wallet_id', 'mwa_date', 'mwa_createdAt'],
    insert: ['mwa_wallet_id'],
  },
  District: {
    table: 'master_district',
    pk: 'mdt_id',
    prefix: 'mdt',
    /** @type {DistrictCols} */
    cols: {
      id: 'mdt_id',
      store_number: 'mdt_store_number',
      store_name: 'mdt_store_name',
      region: 'mdt_region',
      city_province: 'mdt_city_province',
      status: 'mdt_status',
      createdAt: 'mdt_createdAt',
    },
    select: ['mdt_id', 'mdt_store_number', 'mdt_store_name', 'mdt_region', 'mdt_city_province', 'mdt_status', 'mdt_createdAt'],
    insert: ['mdt_store_number', 'mdt_store_name', 'mdt_region', 'mdt_city_province', 'mdt_status'],
  },
  ModeOfTransportation: {
    table: 'master_mode_of_transportation',
    pk: 'mmot_id',
    prefix: 'mmot',
    /** @type {ModeOfTransportationCols} */
    cols: {
      id: 'mmot_id',
      name: 'mmot_name',
      status: 'mmot_status',
      createdAt: 'mmot_createdAt',
    },
    select: ['mmot_id', 'mmot_name', 'mmot_status', 'mmot_createdAt'],
    insert: ['mmot_name', 'mmot_status'],
  },
  Particulars: {
    table: 'master_particulars',
    pk: 'mpt_id',
    prefix: 'mpt',
    /** @type {ParticularsCols} */
    cols: {
      id: 'mpt_id',
      code: 'mpt_code',
      name: 'mpt_name',
      type: 'mpt_type',
      description: 'mpt_description',
      status: 'mpt_status',
      createdAt: 'mpt_createdAt',
    },
    select: ['mpt_id', 'mpt_code', 'mpt_name', 'mpt_type', 'mpt_description', 'mpt_status', 'mpt_createdAt'],
    insert: ['mpt_code', 'mpt_name', 'mpt_type', 'mpt_description', 'mpt_status'],
  },
};

exports.Master = Master;