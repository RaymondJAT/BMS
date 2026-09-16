import { Clock, CheckCircle2, Banknote, FileText } from 'lucide-react'

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(val || 0)

/**
 * Builds the 4 StatCard configs shown at the top of the Cash Request page.
 * Pulled out of CashRequestPage so the page component isn't a 40-line
 * object literal before you even get to the JSX.
 */
export function buildCashRequestMetricCards(metrics = {}) {
  return [
    {
      title: 'Total Requested',
      value: formatCurrency(metrics.totalRequested),
      icon: FileText,
      subtitle: 'Excludes rejected',
      variant: 'blue',
    },
    {
      title: 'Pending Team Leader',
      value: metrics.pendingCount || 0,
      icon: Clock,
      subtitle: 'Awaiting first approval',
      variant: 'amber',
    },
    {
      title: 'Pending Fund Custodian',
      value: formatCurrency(metrics.approvedAmount),
      icon: CheckCircle2,
      subtitle: 'Team Leader approved',
      variant: 'emerald',
    },
    {
      title: 'Completed',
      value: formatCurrency(metrics.completedAmount),
      icon: Banknote,
      subtitle: 'Disbursed to date',
      variant: 'blue',
    },
  ]
}

export default buildCashRequestMetricCards
