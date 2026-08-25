const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function chunkToWords(n) {
  if (n === 0) return ''
  if (n < 20) return ONES[n]
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`
  return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + chunkToWords(n % 100) : ''}`
}

/**
 * Converts a numeric amount into Philippine-peso words, e.g.
 * 5000 -> "Five Thousand Pesos Only". Used to auto-derive the
 * "Amount in Words" field on the Cash Request form — the user never
 * types this directly (see Cash Request Form V1 behavior).
 */
export function amountToWords(amount) {
  const value = parseFloat(amount)
  if (isNaN(value) || value < 0) return ''

  const whole = Math.floor(value)
  const cents = Math.round((value - whole) * 100)

  if (whole === 0 && cents === 0) return 'Zero Pesos Only'

  const groups = [
    [1_000_000_000, 'Billion'],
    [1_000_000, 'Million'],
    [1_000, 'Thousand'],
    [1, ''],
  ]

  let remaining = whole
  const parts = []
  for (const [divisor, label] of groups) {
    const chunk = Math.floor(remaining / divisor)
    if (chunk > 0) {
      parts.push(`${chunkToWords(chunk)}${label ? ' ' + label : ''}`)
      remaining %= divisor
    }
  }

  let words = (parts.join(' ') || 'Zero') + ' Pesos'
  if (cents > 0) {
    words += ` and ${chunkToWords(cents)} Centavos`
  }
  return `${words} Only`
}

export default amountToWords
