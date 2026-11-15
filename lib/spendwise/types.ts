export type FinanceCategory = {
  id: string
  name: string
  type: 'income' | 'expense'
  color: string
  icon: string
}

export type FinanceTransaction = {
  id: string
  title: string
  categoryName: string
  amount: number
  type: 'income' | 'expense'
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank' | 'other'
  transactionDate: string
  notes: string | null
}

export type FinanceBudget = {
  id: string
  name: string
  categoryName: string
  amount: number
  spent: number
  startDate: string
  endDate: string
}

export type FinanceGoal = {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  icon: string
}

export type DashboardData = {
  profile: { displayName: string }
  summary: { balance: number; incomeThisMonth: number; spendingThisMonth: number }
  chart: { month: string; income: number; spending: number }[]
  categories: FinanceCategory[]
  transactions: FinanceTransaction[]
  budgets: FinanceBudget[]
  goals: FinanceGoal[]
}
