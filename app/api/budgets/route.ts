import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { spendwiseBudgets, spendwiseCategories } from '@/lib/db/schema'
import { getUsernameIdentity } from '@/lib/spendwise/identity'
import { isValidAmount, isValidIsoDate } from '@/lib/spendwise/validation'

export const dynamic = 'force-dynamic'

const budgetInput = z.object({
  name: z.string().trim().min(1).max(64),
  categoryName: z.string().trim().min(1).max(48),
  amount: z.number().refine(isValidAmount),
  startDate: z.string().refine(isValidIsoDate),
  endDate: z.string().refine(isValidIsoDate),
})

const serializeBudget = (row: typeof spendwiseBudgets.$inferSelect) => ({
  id: row.id,
  name: row.name,
  categoryName: row.categoryName,
  amount: Number(row.amount),
  startDate: row.startDate,
  endDate: row.endDate,
})

export async function GET() {
  const identity = await getUsernameIdentity()
  if (!identity) return NextResponse.json({ error: 'Choose a name to continue.' }, { status: 401 })

  const rows = await db.select().from(spendwiseBudgets)
    .where(eq(spendwiseBudgets.usernameKey, identity.usernameKey))
    .orderBy(desc(spendwiseBudgets.startDate))
    .limit(100)
  return NextResponse.json(rows.map(serializeBudget), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const identity = await getUsernameIdentity()
  if (!identity) return NextResponse.json({ error: 'Choose a name to continue.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = budgetInput.safeParse(body)
  if (!parsed.success || !parsed.data || parsed.data.endDate < parsed.data.startDate) {
    return NextResponse.json({ error: 'Check the budget dates and amount, then try again.' }, { status: 400 })
  }

  const [category] = await db.select({ id: spendwiseCategories.id }).from(spendwiseCategories)
    .where(and(
      eq(spendwiseCategories.usernameKey, identity.usernameKey),
      eq(spendwiseCategories.name, parsed.data.categoryName),
      eq(spendwiseCategories.type, 'expense'),
    )).limit(1)
  if (!category) return NextResponse.json({ error: 'Choose one of your expense categories.' }, { status: 400 })

  const [budget] = await db.insert(spendwiseBudgets).values({
    id: randomUUID(),
    usernameKey: identity.usernameKey,
    ...parsed.data,
    amount: parsed.data.amount.toFixed(2),
  }).returning()
  return NextResponse.json(serializeBudget(budget), { status: 201 })
}

export async function DELETE(request: Request) {
  const identity = await getUsernameIdentity()
  if (!identity) return NextResponse.json({ error: 'Choose a name to continue.' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id || id.length > 64) return NextResponse.json({ error: 'Choose a budget to remove.' }, { status: 400 })

  const removed = await db.delete(spendwiseBudgets).where(and(
    eq(spendwiseBudgets.id, id),
    eq(spendwiseBudgets.usernameKey, identity.usernameKey),
  )).returning({ id: spendwiseBudgets.id })
  if (!removed.length) return NextResponse.json({ error: 'Budget not found.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
