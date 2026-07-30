/**
 * ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 */

/**
 * @typedef {Object} FundCols
 * @property {'rf_id'} id
 * @property {'rf_budget_id'} budget_id
 * @property {'rf_year'} year
 * @property {'rf_month'} month
 * @property {'rf_start_date'} start_date
 * @property {'rf_end_date'} end_date
 * @property {'rf_beginning'} beginning
 * @property {'rf_added'} added
 * @property {'rf_total_fund'} total_fund
 * @property {'rf_issued'} issued
 * @property {'rf_returned'} returned
 * @property {'rf_outstanding'} outstanding
 * @property {'rf_amount_expended'} amount_expended
 * @property {'rf_ending'} ending
 * @property {'rf_liquidated'} liquidated
 * @property {'rf_balance'} balance
 * @property {'rf_status'} status
 * @property {'rf_createdAt'} createdAt
 */

/**
 * @typedef {Object} FundActivityCols
 * @property {'rfa_id'} id
 * @property {'rfa_revolving_fund_id'} revolving_fund_id
 * @property {'rfa_remarks'} remarks
 * @property {'rfa_user_id'} user_id
 * @property {'rfa_createdAt'} createdAt
 */

const Revolving = {
  Fund: {
    table: 'revolving_fund',
    pk: 'rf_id',
    prefix: 'rf',
    /** @type {FundCols} */
    cols: {
      id: 'rf_id',
      budget_id: 'rf_budget_id',
      year: 'rf_year',
      month: 'rf_month',
      start_date: 'rf_start_date',
      end_date: 'rf_end_date',
      beginning: 'rf_beginning',
      added: 'rf_added',
      total_fund: 'rf_total_fund',
      issued: 'rf_issued',
      returned: 'rf_returned',
      outstanding: 'rf_outstanding',
      amount_expended: 'rf_amount_expended',
      ending: 'rf_ending',
      liquidated: 'rf_liquidated',
      balance: 'rf_balance',
      status: 'rf_status',
      createdAt: 'rf_createdAt',
    },
    select: ['rf_id', 'rf_budget_id', 'rf_year', 'rf_month', 'rf_start_date', 'rf_end_date', 'rf_beginning', 'rf_added', 'rf_total_fund', 'rf_issued', 'rf_returned', 'rf_outstanding', 'rf_amount_expended', 'rf_ending', 'rf_liquidated', 'rf_balance', 'rf_status', 'rf_createdAt'],
    insert: ['rf_budget_id', 'rf_year', 'rf_month', 'rf_beginning', 'rf_added', 'rf_total_fund', 'rf_issued', 'rf_returned', 'rf_outstanding', 'rf_amount_expended', 'rf_ending', 'rf_liquidated', 'rf_balance', 'rf_status'],
  },
  FundActivity: {
    table: 'revolving_fund_activity',
    pk: 'rfa_id',
    prefix: 'rfa',
    /** @type {FundActivityCols} */
    cols: {
      id: 'rfa_id',
      revolving_fund_id: 'rfa_revolving_fund_id',
      remarks: 'rfa_remarks',
      user_id: 'rfa_user_id',
      createdAt: 'rfa_createdAt',
    },
    select: ['rfa_id', 'rfa_revolving_fund_id', 'rfa_remarks', 'rfa_user_id', 'rfa_createdAt'],
    insert: ['rfa_revolving_fund_id', 'rfa_remarks', 'rfa_user_id'],
  },
};

exports.Revolving = Revolving;