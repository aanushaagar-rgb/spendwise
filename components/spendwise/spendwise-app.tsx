'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ArrowRight, Wallet } from 'lucide-react'
import { EntryScreen } from '@/components/spendwise/entry-screen'
import { FinanceDashboard, type DashboardSection, type DialogRequest } from '@/components/spendwise/finance-dashboard'
import { FinanceDialog } from '@/components/spendwise/finance-dialog'
import type { DashboardData } from '@/lib/spendwise/types'

type ApiError = Error & { status?: number }

async function fetchDashboard(url: string): Promise<DashboardData> {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.error || 'SpendWise could not load your data.') as ApiError
    error.status = response.status
    throw error
  }
  return body as DashboardData
}

export function SpendWiseApp() {
  const { data, error, isLoading, mutate } = useSWR<DashboardData, ApiError>('/api/dashboard', fetchDashboard, {
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  })
  const [section, setSection] = useState<DashboardSection>('overview')
  const [dialog, setDialog] = useState<DialogRequest | null>(null)
  const [entryError, setEntryError] = useState<string | null>(null)
  const [entryPending, setEntryPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [forceEntry, setForceEntry] = useState(false)

  async function startProfile(username: string) {
    setEntryPending(true)
    setEntryError(null)
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'SpendWise could not start your profile.')
      setForceEntry(false)
      setSection('overview')
      await mutate()
    } catch (startError) {
      setEntryError(startError instanceof Error ? startError.message : 'SpendWise could not start your profile.')
    } finally {
      setEntryPending(false)
    }
  }

  async function saveDialog(payload: Record<string, unknown>) {
    if (!dialog) return
    setActionError(null)
    const endpoint = dialog.kind === 'transaction'
      ? '/api/transactions'
      : dialog.kind === 'budget'
        ? '/api/budgets'
        : dialog.kind === 'goal'
          ? '/api/goals'
          : `/api/goals/${encodeURIComponent(dialog.goalId)}/contributions`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'We could not save that yet. Please try again.')
    await mutate()
  }

  async function removeRecord(endpoint: string, id: string) {
    setActionError(null)
    const response = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setActionError(result.error || 'We could not remove that item.')
      return
    }
    await mutate()
  }

  async function switchName() {
    await fetch('/api/profile', { method: 'DELETE' })
    setForceEntry(true)
    setActionError(null)
    setEntryError(null)
    await mutate(undefined, { revalidate: false })
  }

  if (forceEntry) return <EntryScreen onStart={startProfile} error={entryError} loading={entryPending} />
  if (isLoading && !data && !error) {
    return <main className="loading-page"><div className="loading-mark"><Wallet aria-hidden="true" /></div><p>Opening your money space…</p></main>
  }
  if (error?.status === 401 || (!data && !error)) {
    return <EntryScreen onStart={startProfile} error={entryError} loading={entryPending} />
  }
  if (!data) {
    return <main className="loading-page"><div className="loading-mark"><Wallet aria-hidden="true" /></div><p className="load-error">{error?.message || 'SpendWise could not reach your data.'}</p><button className="text-action" onClick={() => void mutate()} type="button">Try again <ArrowRight aria-hidden="true" /></button></main>
  }

  return <>
    <FinanceDashboard
      actionError={actionError}
      data={data}
      onDeleteBudget={(id) => void removeRecord('/api/budgets', id)}
      onDeleteTransaction={(id) => void removeRecord('/api/transactions', id)}
      onOpenDialog={setDialog}
      onSectionChange={setSection}
      onSwitchName={() => void switchName()}
      section={section}
    />
    {dialog && <FinanceDialog request={dialog} categories={data.categories} onClose={() => setDialog(null)} onSubmit={saveDialog} />}
  </>
}
