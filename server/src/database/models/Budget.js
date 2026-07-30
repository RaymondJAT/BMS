/**
 * ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 */

/**
 * @typedef {Object} BudgetCols
 * @property {'b_id'} id
 * @property {'b_department_id'} department_id
 * @property {'b_type'} type
 * @property {'b_amount'} amount
 * @property {'b_status'} status
 * @property {'b_createdBy'} createdBy
 * @property {'b_createdAt'} createdAt
 */

/**
 * @typedef {Object} HistoryCols
 * @property {'bh_id'} id
 * @property {'bh_budget_id'} budget_id
 * @property {'bh_amount'} amount
 * @property {'bh_previous_amount'} previous_amount
 * @property {'bh_new_amount'} new_amount
 * @property {'bh_remarks'} remarks
 * @property {'bh_department_id'} department_id
 * @property {'bh_type'} type
 * @property {'bh_date'} date
 * @property {'bh_created_by'} created_by
 * @property {'bh_createdAt'} createdAt
 */

const Budget = {
  Budget: {
    table: 'budget',
    pk: 'b_id',
    prefix: 'b',
    /** @type {BudgetCols} */
    cols: {
      id: 'b_id',
      department_id: 'b_department_id',
      type: 'b_type',
      amount: 'b_amount',
      status: 'b_status',
      createdBy: 'b_createdBy',
      createdAt: 'b_createdAt',
    },
    select: ['b_id', 'b_department_id', 'b_type', 'b_amount', 'b_status', 'b_createdBy', 'b_createdAt'],
    insert: ['b_department_id', 'b_type', 'b_amount', 'b_status', 'b_createdBy'],
  },
  History: {
    table: 'budget_history',
    pk: 'bh_id',
    prefix: 'bh',
    /** @type {HistoryCols} */
    cols: {
      id: 'bh_id',
      budget_id: 'bh_budget_id',
      amount: 'bh_amount',
      previous_amount: 'bh_previous_amount',
      new_amount: 'bh_new_amount',
      remarks: 'bh_remarks',
      department_id: 'bh_department_id',
      type: 'bh_type',
      date: 'bh_date',
      created_by: 'bh_created_by',
      createdAt: 'bh_createdAt',
    },
    select: ['bh_id', 'bh_budget_id', 'bh_amount', 'bh_previous_amount', 'bh_new_amount', 'bh_remarks', 'bh_department_id', 'bh_type', 'bh_date', 'bh_created_by', 'bh_createdAt'],
    insert: ['bh_budget_id', 'bh_amount', 'bh_previous_amount', 'bh_new_amount', 'bh_remarks', 'bh_department_id', 'bh_type', 'bh_created_by'],
  },
};

exports.Budget = Budget;