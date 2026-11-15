import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const PROFILE_COOKIE = 'spendwise_profile'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180

type IdentityPayload = {
  usernameKey: string
  displayName: string
  expiresAt: number
}

export type UsernameIdentity = Pick<IdentityPayload, 'usernameKey' | 'displayName'>

export function normalizeUsername(value: string): UsernameIdentity | null {
  const displayName = value.normalize('NFKC').trim().replace(/\s+/g, ' ')
  const validName = /^[\p{L}\p{N}](?:[\p{L}\p{N} ._'’-]{0,30}[\p{L}\p{N}])?$/u

  if (displayName.length < 1 || displayName.length > 32 || !validName.test(displayName)) {
    return null
  }

  return {
    displayName,
    usernameKey: displayName.toLocaleLowerCase('en-US'),
  }
}

function getSigningSecret() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('The SpendWise session signing secret is not configured.')
  }
  return secret
}

function sign(payload: string) {
  return createHmac('sha256', getSigningSecret()).update(payload).digest('base64url')
}

export function createProfileCookie(identity: UsernameIdentity) {
  const payload: IdentityPayload = {
    ...identity,
    expiresAt: Date.now() + COOKIE_MAX_AGE * 1000,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

export function profileCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  }
}

export async function getUsernameIdentity(): Promise<UsernameIdentity | null> {
  const value = (await cookies()).get(PROFILE_COOKIE)?.value
  if (!value) return null

  const [encoded, signature, extra] = value.split('.')
  if (!encoded || !signature || extra) return null

  try {
    const expected = Buffer.from(sign(encoded))
    const actual = Buffer.from(signature)
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as IdentityPayload
    const identity = normalizeUsername(payload.displayName)
    if (
      !identity ||
      identity.usernameKey !== payload.usernameKey ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= Date.now()
    ) {
      return null
    }

    return identity
  } catch {
    return null
  }
}
