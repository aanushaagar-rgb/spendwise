'use client'

import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plus,
  ReceiptText,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { DashboardData, FinanceBudget, FinanceGoal, FinanceTransaction } from '@/lib/spendwise/types'

export type DashboardSection = 'overview' | 'activity' | 'budgets' | 'goals'
export type DialogRequest =
  | { kind: 'transaction' }
  | { kind: 'budget' }
  | { kind: 'goal' }
  | { kind: 'contribution'; goalId: string; goalName: string }

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const chartConfig = {
  income: { label: 'Income', color: 'var(--chart-1)' },
  spending: { label: 'Spending', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function formatMoney(value: number) {
  return currency.format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00.000Z`))
}

const navItems: { id: DashboardSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'activity', label: 'Transactions', icon: ReceiptText },
  { id: 'budgets', label: 'Budgets', icon: ChartNoAxesCombined },
  { id: 'goals', label: 'Savings goals', icon: Target },
]

type DashboardProps = {
  data: DashboardData
  section: DashboardSection
  onSectionChange: (section: DashboardSection) => void
  onOpenDialog: (dialog: DialogRequest) => void
  onSwitchName: () => void
  onDeleteTransaction: (id: string) => void
  onDeleteBudget: (id: string) => void
  actionError: string | null
}

export function FinanceDashboard({
  data,
  section,
  onSectionChange,
  onOpenDialog,
  onSwitchName,
  onDeleteTransaction,
  onDeleteBudget,
  actionError,
}: DashboardProps) {
  const headings: Record<DashboardSection, { title: string; subtitle: string }> = {
    overview: { title: `Good ${greeting()}, ${data.profile.displayName.split(' ')[0]}.`, subtitle: 'Here’s your money picture, all in one place.' },
    activity: { title: 'Transactions', subtitle: 'Every little detail adds up to a clearer picture.' },
    budgets: { title: 'Budgets', subtitle: 'Make a plan that leaves room for real life.' },
    goals: { title: 'Savings goals', subtitle: 'Small steps, moving toward what matters.' },
  }
  const heading = headings[section]

  return (
    <main className="workspace-page">
      <header className="workspace-topbar">
        <a className="app-brand" href="/" aria-label="SpendWise home">
          <span className="brand-symbol"><Wallet aria-hidden="true" /></span>
          <span>spend<span>wise</span></span>
        </a>
        <div className="topbar-right">
          <span className="today-label">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())}</span>
          <button className="profile-pill" onClick={onSwitchName} type="button" title="Switch to another name">
            <span className="profile-avatar" aria-hidden="true">{data.profile.displayName.slice(0, 1).toUpperCase()}</span>
            <span>{data.profile.displayName}</span>
            <LogOut aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="workspace-layout">
        <aside className="workspace-sidebar" aria-label="Main navigation">
          <p className="sidebar-label">YOUR SPACE</p>
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button className={`nav-item${section === item.id ? ' is-active' : ''}`} key={item.id} onClick={() => onSectionChange(item.id)} type="button" aria-current={section === item.id ? 'page' : undefined}>
                  <Icon aria-hidden="true" /> <span>{item.label}</span>
                  {item.id === 'activity' && <span className="nav-count">{data.transactions.length}</span>}
                </button>
              )
            })}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-tip"><CircleHelp aria-hidden="true" /><div><strong>Your data, your pace</strong><span>Start with one small step today.</span></div></div>
            <p className="sidebar-privacy">Profiles are identified by name, not password. Anyone using the same name shares that profile.</p>
          </div>
        </aside>
        <section className="workspace-main" aria-labelledby="page-title">
          <div className="mobile-nav" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon
              return <button className={section === item.id ? 'is-active' : ''} key={item.id} onClick={() => onSectionChange(item.id)} type="button" aria-current={section === item.id ? 'page' : undefined}><Icon aria-hidden="true" /><span>{item.label}</span></button>
            })}
          </div>
          <div className="page-heading">
            <div><p className="page-eyebrow">SPENDWISE / {section.toUpperCase()}</p><h1 id="page-title">{heading.title}</h1><p>{heading.subtitle}</p></div>
            <div className="heading-actions">
              {(section === 'overview' || section === 'activity') && <button className="primary-button" onClick={() => onOpenDialog({ kind: 'transaction' })} type="button"><Plus aria-hidden="true" /> Add transaction</button>}
              {section === 'budgets' && <button className="primary-button" onClick={() => onOpenDialog({ kind: 'budget' })} type="button"><Plus aria-hidden="true" /> New budget</button>}
              {section === 'goals' && <button className="primary-button" onClick={() => onOpenDialog({ kind: 'goal' })} type="button"><Plus aria-hidden="true" /> New goal</button>}
            </div>
          </div>
          {actionError && <div className="inline-alert" role="alert">{actionError}</div>}
          {section === 'overview' && <Overview data={data} onOpenDialog={onOpenDialog} onDeleteTransaction={onDeleteTransaction} onSectionChange={onSectionChange} />}
          {section === 'activity' && <TransactionList transactions={data.transactions} onDelete={onDeleteTransaction} expanded />}
          {section === 'budgets' && <BudgetList budgets={data.budgets} onDelete={onDeleteBudget} onCreate={() => onOpenDialog({ kind: 'budget' })} expanded />}
          {section === 'goals' && <GoalList goals={data.goals} onContribute={(goal) => onOpenDialog({ kind: 'contribution', goalId: goal.id, goalName: goal.name })} onCreate={() => onOpenDialog({ kind: 'goal' })} expanded />}
          <footer className="workspace-footer"><span>SpendWise</span><span>Money clarity, one step at a time.</span></footer>
        </section>
      </div>
    </main>
  )
}

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
}

function Overview({ data, onOpenDialog, onDeleteTransaction, onSectionChange }: {
  data: DashboardData
  onOpenDialog: (dialog: DialogRequest) => void
  onDeleteTransaction: (id: string) => void
  onSectionChange: (section: DashboardSection) => void
}) {
  const netThisMonth = data.summary.incomeThisMonth - data.summary.spendingThisMonth
  return (
    <div className="overview-content">
      <div className="metric-grid">
        <MetricCard label="Available balance" value={formatMoney(data.summary.balance)} detail="All-time income minus spending" icon={<Wallet aria-hidden="true" />} tone="balance" />
        <MetricCard label="Income this month" value={formatMoney(data.summary.incomeThisMonth)} detail="Money coming in" icon={<ArrowDownLeft aria-hidden="true" />} tone="income" />
        <MetricCard label="Spent this month" value={formatMoney(data.summary.spendingThisMonth)} detail={`${formatMoney(netThisMonth)} net cash flow`} icon={<ArrowUpRight aria-hidden="true" />} tone="spending" />
      </div>
      <div className="overview-grid">
        <section className="surface-card chart-card" aria-labelledby="cashflow-title">
          <div className="card-heading"><div><p className="card-kicker">CASH FLOW</p><h2 id="cashflow-title">Income &amp; spending</h2></div><span className="period-chip">Last 6 months</span></div>
          <div className="chart-legend"><span><i className="legend-income" /> Income</span><span><i className="legend-spending" /> Spending</span></div>
          <ChartContainer config={chartConfig} className="cashflow-chart">
            <BarChart accessibilityLayer data={data.chart} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 5" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value))} />} />
              <Bar dataKey="income" fill="var(--color-income)" radius={[5, 5, 0, 0]} maxBarSize={28} />
              <Bar dataKey="spending" fill="var(--color-spending)" radius={[5, 5, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
        </section>
        <section className="surface-card insight-card" aria-labelledby="month-title">
          <div className="card-heading"><div><p className="card-kicker">MONTHLY SNAPSHOT</p><h2 id="month-title">A little perspective</h2></div><span className="insight-icon"><ChartNoAxesCombined aria-hidden="true" /></span></div>
          <div className="snapshot-total"><span>Net this month</span><strong className={netThisMonth < 0 ? 'negative-value' : ''}>{formatMoney(netThisMonth)}</strong></div>
          <div className="snapshot-track" aria-label={`Monthly spending is ${data.summary.incomeThisMonth > 0 ? Math.min(100, Math.round(data.summary.spendingThisMonth / data.summary.incomeThisMonth * 100)) : 0} percent of income`}><span style={{ width: `${data.summary.incomeThisMonth > 0 ? Math.min(100, Math.round(data.summary.spendingThisMonth / data.summary.incomeThisMonth * 100)) : 0}%` }} /></div>
          <p className="snapshot-note">{data.summary.incomeThisMonth ? `${Math.round(data.summary.spendingThisMonth / data.summary.incomeThisMonth * 100)}% of this month’s income has been spent.` : 'Add income to see how your spending compares.'}</p>
          <div className="snapshot-foot"><span><i className="legend-income" /> Income</span><strong>{formatMoney(data.summary.incomeThisMonth)}</strong></div>
          <div className="snapshot-foot"><span><i className="legend-spending" /> Spending</span><strong>{formatMoney(data.summary.spendingThisMonth)}</strong></div>
        </section>
      </div>
      <div className="overview-grid lower-grid">
        <section className="surface-card" aria-labelledby="recent-title">
          <div className="card-heading"><div><p className="card-kicker">RECENT ACTIVITY</p><h2 id="recent-title">Latest transactions</h2></div><button className="text-action" onClick={() => onSectionChange('activity')} type="button">View all <ArrowRight aria-hidden="true" /></button></div>
          <TransactionList transactions={data.transactions.slice(0, 5)} onDelete={onDeleteTransaction} />
        </section>
        <div className="stacked-panels">
          <section className="surface-card compact-panel" aria-labelledby="budget-preview-title">
            <div className="card-heading"><div><p className="card-kicker">YOUR PLAN</p><h2 id="budget-preview-title">Budgets</h2></div><button className="text-action" onClick={() => onOpenDialog({ kind: 'budget' })} type="button"><Plus aria-hidden="true" /> Add</button></div>
            <BudgetList budgets={data.budgets.slice(0, 2)} onDelete={() => {}} onCreate={() => onOpenDialog({ kind: 'budget' })} />
          </section>
          <section className="surface-card compact-panel" aria-labelledby="goals-preview-title">
            <div className="card-heading"><div><p className="card-kicker">LOOKING AHEAD</p><h2 id="goals-preview-title">Savings goals</h2></div><button className="text-action" onClick={() => onOpenDialog({ kind: 'goal' })} type="button"><Plus aria-hidden="true" /> Add</button></div>
            <GoalList goals={data.goals.slice(0, 2)} onContribute={(goal) => onOpenDialog({ kind: 'contribution', goalId: goal.id, goalName: goal.name })} onCreate={() => onOpenDialog({ kind: 'goal' })} />
          </section>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: ReactNode; tone: string }) {
  return <article className={`metric-card ${tone}`}><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><strong>{value}</strong><small>{detail}</small></article>
}

function TransactionList({ transactions, onDelete, expanded = false }: { transactions: FinanceTransaction[]; onDelete: (id: string) => void; expanded?: boolean }) {
  if (!transactions.length) return <EmptyState icon={<ReceiptText aria-hidden="true" />} title="No transactions yet" description="Add your first income or expense to start seeing patterns." />
  return (
    <div className={`transaction-list${expanded ? ' is-expanded' : ''}`}>
      {transactions.map((transaction) => (
        <article className="transaction-row" key={transaction.id}>
          <span className={`transaction-icon ${transaction.type}`} aria-hidden="true">{transaction.type === 'income' ? <BriefcaseBusiness /> : <CreditCard />}</span>
          <span className="transaction-description"><strong>{transaction.title}</strong><small>{transaction.categoryName} · {formatDate(transaction.transactionDate)}</small></span>
          <strong className={`transaction-value ${transaction.type}`}>{transaction.type === 'income' ? '+' : '−'}{formatMoney(transaction.amount)}</strong>
          <button className="icon-button delete-button" onClick={() => onDelete(transaction.id)} type="button" aria-label={`Delete ${transaction.title}`} title="Delete transaction"><Trash2 aria-hidden="true" /></button>
        </article>
      ))}
    </div>
  )
}

function BudgetList({ budgets, onDelete, onCreate, expanded = false }: { budgets: FinanceBudget[]; onDelete: (id: string) => void; onCreate: () => void; expanded?: boolean }) {
  if (!budgets.length) return <EmptyState icon={<ChartNoAxesCombined aria-hidden="true" />} title="No budgets yet" description="Set a spending limit for a category and track your progress." action={expanded ? onCreate : undefined} actionLabel="Create a budget" />
  return (
    <div className={`budget-list${expanded ? ' is-expanded' : ''}`}>
      {budgets.map((budget) => {
        const percent = Math.min(100, Math.round(budget.spent / budget.amount * 100))
        return <article className="budget-row" key={budget.id}>
          <div className="budget-row-heading"><div><strong>{budget.name}</strong><span>{budget.categoryName}</span></div><div className="budget-amounts"><strong>{formatMoney(budget.spent)}</strong><span>of {formatMoney(budget.amount)}</span></div></div>
          <div className="budget-progress" role="progressbar" aria-label={`${budget.name} budget used`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span className={percent >= 100 ? 'over-budget' : ''} style={{ width: `${percent}%` }} /></div>
          <div className="budget-row-foot"><span>{percent}% used</span><span>{formatMoney(Math.max(0, budget.amount - budget.spent))} left</span>{expanded && <button className="icon-button delete-button" onClick={() => onDelete(budget.id)} type="button" aria-label={`Delete ${budget.name} budget`}><Trash2 aria-hidden="true" /></button>}</div>
        </article>
      })}
    </div>
  )
}

function GoalList({ goals, onContribute, onCreate, expanded = false }: { goals: FinanceGoal[]; onContribute: (goal: FinanceGoal) => void; onCreate: () => void; expanded?: boolean }) {
  if (!goals.length) return <EmptyState icon={<Target aria-hidden="true" />} title="No savings goals yet" description="Name something you’re saving for and watch your progress grow." action={expanded ? onCreate : undefined} actionLabel="Create a goal" />
  return (
    <div className={`goal-list${expanded ? ' is-expanded' : ''}`}>
      {goals.map((goal) => {
        const percent = Math.min(100, Math.round(goal.currentAmount / goal.targetAmount * 100))
        return <article className="goal-row" key={goal.id}>
          <div className="goal-icon"><Target aria-hidden="true" /></div>
          <div className="goal-content"><div className="goal-heading"><div><strong>{goal.name}</strong>{goal.targetDate && <span>Target {formatDate(goal.targetDate)}</span>}</div><button className="small-action" onClick={() => onContribute(goal)} type="button"><Plus aria-hidden="true" /> Add funds</button></div>
            <div className="goal-progress" role="progressbar" aria-label={`${goal.name} savings progress`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div>
            <div className="goal-row-foot"><strong>{formatMoney(goal.currentAmount)}</strong><span>{percent}% of {formatMoney(goal.targetAmount)}</span></div>
          </div>
        </article>
      })}
    </div>
  )
}

function EmptyState({ icon, title, description, action, actionLabel }: { icon: ReactNode; title: string; description: string; action?: () => void; actionLabel?: string }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><strong>{title}</strong><p>{description}</p>{action && <button className="text-action" onClick={action} type="button">{actionLabel} <ArrowRight aria-hidden="true" /></button>}</div>
}
