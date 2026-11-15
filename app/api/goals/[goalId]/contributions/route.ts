import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { spendwiseSavingsContributions, spendwiseSavingsGoals } from '@/lib/db/schema'
import { getUsernameIdentity } from '@/lib/spendwise/identity'
import { isValidAmount } from '@/lib/spendwise/validation'

const contributionInput = z.object({
  amount: z.number().refine(isValidAmount),
  note: z.string().trim().max(160).optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ goalId: string }> }) {
  const identity = await getUsernameIdentity()
  if (!identity) return NextResponse.json({ error: 'Choose a name to continue.' }, { status: 401 })

  const { goalId } = await params
  if (!goalId || goalId.length > 64) return NextResponse.json({ error: 'Choose a savings goal.' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const parsed = contributionInput.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid contribution amount.' }, { status: 400 })

  const saved = await db.transaction(async (transaction) => {
    const [goal] = await transaction.select().from(spendwiseSavingsGoals).where(and(
      eq(spendwiseSavingsGoals.id, goalId),
      eq(spendwiseSavingsGoals.usernameKey, identity.usernameKey),
    )).for('update')
    if (!goal) return false

    await transaction.insert(spendwiseSavingsContributions).values({
      id: randomUUID(),
      usernameKey: identity.usernameKey,
      goalId,
      amount: parsed.data.amount.toFixed(2),
      note: parsed.data.note || null,
    })
    await transaction.update(spendwiseSavingsGoals).set({
      currentAmount: (Number(goal.currentAmount) + parsed.data.amount).toFixed(2),
    }).where(and(
      eq(spendwiseSavingsGoals.id, goalId),
      eq(spendwiseSavingsGoals.usernameKey, identity.usernameKey),
    ))
    return true
  })

  if (!saved) return NextResponse.json({ error: 'Savings goal not found.' }, { status: 404 })
  return NextResponse.json({ ok: true }, { status: 201 })
}
