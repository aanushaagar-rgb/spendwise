export function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function isValidAmount(value: number) {
  return Number.isFinite(value) && value > 0 && value <= 999_999_999_999.99 && Math.round(value * 100) === value * 100
}
