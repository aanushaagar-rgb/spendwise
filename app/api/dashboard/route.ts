import { and, desc, eq, gte, lt, lte, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  spendwiseBudgets,
  spendwiseCategories,
  spendwiseProfiles,
  spendwiseSavingsGoals,
  spendwiseTransactions,
} from '@/lib/db/schema'
import { getUsernameIdentity } from '@/lib/spendwise/identity'

export const dynamic = 'force-dynamic'

const toDateString = (value: Date) => value.toISOString().slice(0, 10)
const asNumber = (value: string | number | null | undefined) => Number(value ?? 0) || 0

export async function GET() {
  const identity = await getUsernameIdentity()
  if (!identity) return NextResponse.json({ error: 'Choose a name to continue.' }, { status: 401 })

  const now = new Date()
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1))
  const today = toDateString(now)
  const monthStart = toDateString(currentMonthStart)
  const monthEnd = toDateString(nextMonthStart)
  const chartStartDate = toDateString(chartStart)
  const monthExpression = sql<string>`to_char(${spendwiseTransactions.transactionDate}, 'YYYY-MM')`

  const [profiles, categories, transactions, budgets, goals, allTimeTotals, monthlyTotals, monthlyRollup, categorySpending] = await Promise.all([
    db.select({ displayName: spendwiseProfiles.displayName })
      .from(spendwiseProfiles)
      .where(eq(spendwiseProfiles.usernameKey, identity.usernameKey))
      .limit(1),
    db.select().from(spendwiseCategories)
      .where(eq(spendwiseCategories.usernameKey, identity.usernameKey))
      .orderBy(spendwiseCategories.type, spendwiseCategories.name),
    db.select().from(spendwiseTransactions)
      .where(eq(spendwiseTransactions.usernameKey, identity.usernameKey))
      .orderBy(desc(spendwiseTransactions.transactionDate), desc(spendwiseTransactions.createdAt))
      .limit(100),
    db.select().from(spendwiseBudgets)
      .where(and(
        eq(spendwiseBudgets.usernameKey, identity.usernameKey),
        lte(spendwiseBudgets.startDate, today),
        gte(spendwiseBudgets.endDate, today),
      ))
      .orderBy(spendwiseBudgets.endDate),
    db.select().from(spendwiseSavingsGoals)
      .where(eq(spendwiseSavingsGoals.usernameKey, identity.usernameKey))
      .orderBy(desc(spendwiseSavingsGoals.createdAt)),
    db.select({
      type: spendwiseTransactions.type,
      total: sql<string>`COALESCE(SUM(${spendwiseTransactions.amount}), 0)`,
    }).from(spendwiseTransactions)
      .where(eq(spendwiseTransactions.usernameKey, identity.usernameKey))
      .groupBy(spendwiseTransactions.type),
    db.select({
      type: spendwiseTransactions.type,
      total: sql<string>`COALESCE(SUM(${spendwiseTransactions.amount}), 0)`,
    }).from(spendwiseTransactions)
      .where(and(
        eq(spendwiseTransactions.usernameKey, identity.usernameKey),
        gte(spendwiseTransactions.transactionDate, monthStart),
        lt(spendwiseTransactions.transactionDate, monthEnd),
      ))
      .groupBy(spendwiseTransactions.type),
    db.select({
      monthKey: monthExpression,
      income: sql<string>`COALESCE(SUM(CASE WHEN ${spendwiseTransactions.type} = 'income' THEN ${spendwiseTransactions.amount} ELSE 0 END), 0)`,
      spending: sql<string>`COALESCE(SUM(CASE WHEN ${spendwiseTransactions.type} = 'expense' THEN ${spendwiseTransactions.amount} ELSE 0 END), 0)`,
    }).from(spendwiseTransactions)
      .where(and(
        eq(spendwiseTransactions.usernameKey, identity.usernameKey),
        gte(spendwiseTransactions.transactionDate, chartStartDate),
        lt(spendwiseTransactions.transactionDate, monthEnd),
      ))
      .groupBy(monthExpression)
      .orderBy(monthExpression),
    db.select({
      categoryName: spendwiseTransactions.categoryName,
      total: sql<string>`COALESCE(SUM(${spendwiseTransactions.amount}), 0)`,
    }).from(spendwiseTransactions)
      .where(and(
        eq(spendwiseTransactions.usernameKey, identity.usernameKey),
        eq(spendwiseTransactions.type, 'expense'),
        gte(spendwiseTransactions.transactionDate, monthStart),
        lt(spendwiseTransactions.transactionDate, monthEnd),
      ))
      .groupBy(spendwiseTransactions.categoryName),
  ])

  if (!profiles[0]) return NextResponse.json({ error: 'Choose a name to continue.' }, { status: 401 })

  const allTime = Object.fromEntries(allTimeTotals.map((row) => [row.type, asNumber(row.total)]))
  const thisMonth = Object.fromEntries(monthlyTotals.map((row) => [row.type, asNumber(row.total)]))
  const categoryTotals = new Map(categorySpending.map((row) => [row.categoryName, asNumber(row.total)]))
  const chartTotals = new Map(monthlyRollup.map((row) => [row.monthKey, row]))
  const chart = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1))
    const monthKey = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}`
    const totals = chartTotals.get(monthKey)
    return {
      month: new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(monthDate),
      income: asNumber(totals?.income),
      spending: asNumber(totals?.spending),
    }
  })

  return NextResponse.json({
    profile: { displayName: profiles[0].displayName },
    summary: {
      balance: asNumber(allTime.income) - asNumber(allTime.expense),
      incomeThisMonth: asNumber(thisMonth.income),
      spendingThisMonth: asNumber(thisMonth.expense),
    },
    chart,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
    })),
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      title: transaction.title,
      categoryName: transaction.categoryName,
      amount: asNumber(transaction.amount),
      type: transaction.type,
      paymentMethod: transaction.paymentMethod,
      transactionDate: transaction.transactionDate,
      notes: transaction.notes,
    })),
    budgets: budgets.map((budget) => ({
      id: budget.id,
      name: budget.name,
      categoryName: budget.categoryName,
      amount: asNumber(budget.amount),
      spent: categoryTotals.get(budget.categoryName) ?? 0,
      startDate: budget.startDate,
      endDate: budget.endDate,
    })),
    goals: goals.map((goal) => ({
      id: goal.id,
      name: goal.name,
      targetAmount: asNumber(goal.targetAmount),
      currentAmount: asNumber(goal.currentAmount),
      targetDate: goal.targetDate,
      icon: goal.icon,
    })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
