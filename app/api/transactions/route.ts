import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { spendwiseCategories, spendwiseTransactions } from '@/lib/db/schema'
import { getUsernameIdentity } from '@/lib/spendwise/identity'
import { isValidAmount, isValidIsoDate } from '@/lib/spendwise/validation'

export const dynamic = 'force-dynamic'

const transactionInput = z.object({
  title: z.string().trim().min(1).max(80),
  categoryName: z.string().trim().min(1).max(48),
  amount: z.number().refine(isValidAmount),
  type: z.enum(['income', 'expense']),
  paymentMethod: z.enum(['cash', 'card', 'upi', 'bank', 'other']),
  transactionDate: z.string().refine(isValidIsoDate),
  notes: z.string().trim().max(240).optional(),
})

const serializeTransaction = (row: typeof spendwiseTransactions.$inferSelect) => ({
  id: row.id,
  title: row.title,
  categoryName: row.categoryName,
  amount: Number(row.amount),
  type: row.type,
  paymentMethod: row.paymentMethod,
  transactionDate: row.transactionDate,
  notes: row.notes,
})

export async function GET() {
  const identity = await getUsernameIdentity()
  if (!identity) return NextResponse.json({ error: 'Choose a name to continue.' }, { status: 401 })

  const rows = await db.select().from(spendwiseTransactions)
    .where(eq(spendwiseTransactions.usernameKey, identity.usernameKey))
    .orderBy(desc(spendwiseTransactions.transactionDate), desc(spendwiseTransactions.createdAt))
    .limit(500)
  return NextResponse.json(rows.map(serializeTransaction), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const identity = await getUsernameIdentity()
  if (!identity) return NextResponse.json({ error: 'Choose a name to continue.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = transactionInput.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Check the transaction details and try again.' }, { status: 400 })

  const [category] = await db.select({ id: spendwiseCategories.id }).from(spendwiseCategories)
    .where(and(
      eq(spendwiseCategories.usernameKey, identity.usernameKey),
      eq(spendwiseCategories.name, parsed.data.categoryName),
      eq(spendwiseCategories.type, parsed.data.type),
    )).limit(1)
  if (!category) return NextResponse.json({ error: 'Choose one of your available categories.' }, { status: 400 })

  const [transaction] = await db.insert(spendwiseTransactions).values({
    id: randomUUID(),
    usernameKey: identity.usernameKey,
    ...parsed.data,
    amount: parsed.data.amount.toFixed(2),
    notes: parsed.data.notes || null,
  }).returning()

  return NextResponse.json(serializeTransaction(transaction), { status: 201 })
}

export async function DELETE(request: Request) {
  const identity = await getUsernameIdentity()
  if (!identity) return NextResponse.json({ error: 'Choose a name to continue.' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id || id.length > 64) return NextResponse.json({ error: 'Choose a transaction to remove.' }, { status: 400 })

  const removed = await db.delete(spendwiseTransactions).where(and(
    eq(spendwiseTransactions.id, id),
    eq(spendwiseTransactions.usernameKey, identity.usernameKey),
  )).returning({ id: spendwiseTransactions.id })
  if (!removed.length) return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
