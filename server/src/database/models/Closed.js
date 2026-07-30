/**
 * ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 */

/**
 * @typedef {Object} RevolvingFundCols
 * @property {'crf_id'} id
 * @property {'crf_revolving_fund_id'} revolving_fund_id
 * @property {'crf_beginning'} beginning
 * @property {'crf_cash_inflow'} cash_inflow
 * @property {'crf_cash_outflow'} cash_outflow
 * @property {'crf_ending'} ending
 * @property {'crf_cashonhand'} cashonhand
 * @property {'crf_gcash'} gcash
 * @property {'crf_total_cash'} total_cash
 * @property {'crf_sub_total'} sub_total
 * @property {'crf_status'} status
 * @property {'crf_created_by'} created_by
 */

const Closed = {
  RevolvingFund: {
    table: 'closed_revolving_fund',
    pk: 'crf_id',
    prefix: 'crf',
    /** @type {RevolvingFundCols} */
    cols: {
      id: 'crf_id',
      revolving_fund_id: 'crf_revolving_fund_id',
      beginning: 'crf_beginning',
      cash_inflow: 'crf_cash_inflow',
      cash_outflow: 'crf_cash_outflow',
      ending: 'crf_ending',
      cashonhand: 'crf_cashonhand',
      gcash: 'crf_gcash',
      total_cash: 'crf_total_cash',
      sub_total: 'crf_sub_total',
      status: 'crf_status',
      created_by: 'crf_created_by',
    },
    select: ['crf_id', 'crf_revolving_fund_id', 'crf_beginning', 'crf_cash_inflow', 'crf_cash_outflow', 'crf_ending', 'crf_cashonhand', 'crf_gcash', 'crf_total_cash', 'crf_sub_total', 'crf_status', 'crf_created_by'],
    insert: ['crf_revolving_fund_id', 'crf_beginning', 'crf_cash_inflow', 'crf_cash_outflow', 'crf_ending', 'crf_cashonhand', 'crf_gcash', 'crf_total_cash', 'crf_sub_total', 'crf_status', 'crf_created_by'],
  },
};

exports.Closed = Closed;