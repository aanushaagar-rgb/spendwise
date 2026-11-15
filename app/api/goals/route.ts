import { randomUUID } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { spendwiseSavingsGoals } from '@/lib/db/schema'
import { getUsernameIdentity } from '@/lib/spendwise/identity'
import { isValidAmount, isValidIsoDate } from '@/lib/spendwise/validation'

export const dynamic = 'force-dynamic'

const goalInput = z.object({
  name: z.string().trim().min(1).max(64),
  targetAmount: z.number().refine(isValidAmount),
  targetDate: z.union([z.string().refine(isValidIsoDate), z.literal('')]).optional(),
})

const serializeGoal = (row: typeof spendwiseSavingsGoals.$inferSelect) => ({
  id: row.id,
  name: row.name,
  targetAmount: Number(row.targetAmount),
  currentAmount: Number(row.currentAmount),
  targetDate: row.targetDate,
  icon: row.icon,
})

export async function GET() {
  const identity = await getUsernameIdentity()
  if (!identity) return NextResponse.json({ error: 'Choose a name to continue.' }, { status: 401 })

  const rows = await db.select().from(spendwiseSavingsGoals)
    .where(eq(spendwiseSavingsGoals.usernameKey, identity.usernameKey))
    .orderBy(desc(spendwiseSavingsGoals.createdAt))
    .limit(100)
  return NextResponse.json(rows.map(serializeGoal), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const identity = await getUsernameIdentity()
  if (!identity) return NextResponse.json({ error: 'Choose a name to continue.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = goalInput.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Check the goal name and target amount, then try again.' }, { status: 400 })

  const [goal] = await db.insert(spendwiseSavingsGoals).values({
    id: randomUUID(),
    usernameKey: identity.usernameKey,
    name: parsed.data.name,
    targetAmount: parsed.data.targetAmount.toFixed(2),
    currentAmount: '0',
    targetDate: parsed.data.targetDate || null,
    icon: 'target',
  }).returning()
  return NextResponse.json(serializeGoal(goal), { status: 201 })
}
