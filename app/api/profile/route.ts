import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { spendwiseCategories, spendwiseProfiles } from '@/lib/db/schema'
import { createProfileCookie, normalizeUsername, PROFILE_COOKIE, profileCookieOptions } from '@/lib/spendwise/identity'

const starterCategories = [
  { name: 'Housing', type: 'expense' as const, color: '#8798b8', icon: 'home' },
  { name: 'Groceries', type: 'expense' as const, color: '#80a88c', icon: 'basket' },
  { name: 'Transport', type: 'expense' as const, color: '#d19a69', icon: 'car' },
  { name: 'Dining', type: 'expense' as const, color: '#d78c85', icon: 'utensils' },
  { name: 'Health', type: 'expense' as const, color: '#a186b6', icon: 'heart' },
  { name: 'Shopping', type: 'expense' as const, color: '#c68eaa', icon: 'shopping-bag' },
  { name: 'Utilities', type: 'expense' as const, color: '#8b9da5', icon: 'bolt' },
  { name: 'Other', type: 'expense' as const, color: '#9a9da9', icon: 'circle' },
  { name: 'Salary', type: 'income' as const, color: '#65a98f', icon: 'briefcase' },
  { name: 'Freelance', type: 'income' as const, color: '#7798c1', icon: 'laptop' },
  { name: 'Investment', type: 'income' as const, color: '#9d8bc0', icon: 'chart' },
  { name: 'Other', type: 'income' as const, color: '#9a9da9', icon: 'circle' },
]

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { username?: unknown } | null
  if (!body || typeof body.username !== 'string') {
    return NextResponse.json({ error: 'Enter a name to continue.' }, { status: 400 })
  }

  const identity = normalizeUsername(body.username)
  if (!identity) {
    return NextResponse.json({ error: 'Use 1–32 letters or numbers. Spaces, apostrophes, periods, hyphens, and underscores are allowed.' }, { status: 400 })
  }

  try {
    await db.insert(spendwiseProfiles).values(identity).onConflictDoUpdate({
      target: spendwiseProfiles.usernameKey,
      set: { displayName: identity.displayName, updatedAt: new Date() },
    })

    await db.insert(spendwiseCategories).values(starterCategories.map((category) => ({
      id: randomUUID(),
      usernameKey: identity.usernameKey,
      ...category,
    }))).onConflictDoNothing()

    const response = NextResponse.json({ profile: { displayName: identity.displayName } })
    response.cookies.set(PROFILE_COOKIE, createProfileCookie(identity), profileCookieOptions())
    return response
  } catch {
    return NextResponse.json({ error: 'SpendWise could not start your profile. Please try again.' }, { status: 503 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(PROFILE_COOKIE, '', { ...profileCookieOptions(), maxAge: 0 })
  return response
}
