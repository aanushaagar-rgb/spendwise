import { index, numeric, pgTable, text, timestamp, date } from 'drizzle-orm/pg-core'

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

export const spendwiseProfiles = pgTable('spendwise_profiles', {
  usernameKey: text('username_key').primaryKey(),
  displayName: text('display_name').notNull(),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const spendwiseCategories = pgTable('spendwise_categories', {
  id: text('id').primaryKey(),
  usernameKey: text('username_key').notNull(),
  name: text('name').notNull(),
  type: text('type').$type<'income' | 'expense'>().notNull(),
  color: text('color').notNull().default('#7890b8'),
  icon: text('icon').notNull().default('circle'),
  createdAt: createdAt(),
}, (table) => [index('spendwise_categories_user_idx').on(table.usernameKey, table.type)])

export const spendwiseTransactions = pgTable('spendwise_transactions', {
  id: text('id').primaryKey(),
  usernameKey: text('username_key').notNull(),
  title: text('title').notNull(),
  categoryName: text('category_name').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  type: text('type').$type<'income' | 'expense'>().notNull(),
  paymentMethod: text('payment_method').$type<'cash' | 'card' | 'upi' | 'bank' | 'other'>().notNull(),
  transactionDate: date('transaction_date', { mode: 'string' }).notNull(),
  notes: text('notes'),
  createdAt: createdAt(),
}, (table) => [index('spendwise_transactions_user_date_idx').on(table.usernameKey, table.transactionDate)])

export const spendwiseBudgets = pgTable('spendwise_budgets', {
  id: text('id').primaryKey(),
  usernameKey: text('username_key').notNull(),
  name: text('name').notNull(),
  categoryName: text('category_name').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  startDate: date('start_date', { mode: 'string' }).notNull(),
  endDate: date('end_date', { mode: 'string' }).notNull(),
  createdAt: createdAt(),
}, (table) => [index('spendwise_budgets_user_dates_idx').on(table.usernameKey, table.startDate, table.endDate)])

export const spendwiseSavingsGoals = pgTable('spendwise_savings_goals', {
  id: text('id').primaryKey(),
  usernameKey: text('username_key').notNull(),
  name: text('name').notNull(),
  targetAmount: numeric('target_amount', { precision: 14, scale: 2 }).notNull(),
  currentAmount: numeric('current_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  targetDate: date('target_date', { mode: 'string' }),
  icon: text('icon').notNull().default('target'),
  createdAt: createdAt(),
}, (table) => [index('spendwise_goals_user_idx').on(table.usernameKey, table.targetDate)])

export const spendwiseSavingsContributions = pgTable('spendwise_savings_contributions', {
  id: text('id').primaryKey(),
  usernameKey: text('username_key').notNull(),
  goalId: text('goal_id').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  note: text('note'),
  contributionDate: date('contribution_date', { mode: 'string' }).notNull().defaultNow(),
  createdAt: createdAt(),
}, (table) => [index('spendwise_contributions_user_goal_date_idx').on(table.usernameKey, table.goalId, table.contributionDate)])
