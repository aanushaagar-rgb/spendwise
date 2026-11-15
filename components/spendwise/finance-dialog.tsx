'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import type { FinanceCategory } from '@/lib/spendwise/types'
import type { DialogRequest } from '@/components/spendwise/finance-dashboard'

function localDate(offsetDays = 0) {
  const value = new Date()
  value.setDate(value.getDate() + offsetDays)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function monthStart() {
  const value = new Date()
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-01`
}

function monthEnd() {
  const value = new Date()
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
}

type FinanceDialogProps = {
  request: DialogRequest
  categories: FinanceCategory[]
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}

export function FinanceDialog({ request, categories, onClose, onSubmit }: FinanceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'income' | 'expense'>('expense')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    return () => dialog.close()
  }, [])

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.type === (request.kind === 'budget' ? 'expense' : type)),
    [categories, request.kind, type],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const formData = new FormData(event.currentTarget)
    const payload: Record<string, unknown> = Object.fromEntries(formData.entries())
    if (typeof payload.amount === 'string') payload.amount = Number(payload.amount)
    if (typeof payload.targetAmount === 'string') payload.targetAmount = Number(payload.targetAmount)

    try {
      await onSubmit(payload)
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not save that yet. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const title = request.kind === 'transaction' ? 'Add a transaction' : request.kind === 'budget' ? 'Create a budget' : request.kind === 'goal' ? 'Create a savings goal' : `Add to ${request.goalName}`

  return (
    <dialog
      className="finance-dialog"
      ref={dialogRef}
      aria-labelledby="dialog-title"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <header className="dialog-header">
        <div><p className="card-kicker">SPENDWISE / YOUR FINANCES</p><h2 id="dialog-title">{title}</h2></div>
        <button className="icon-button" onClick={onClose} type="button" aria-label="Close dialog"><X aria-hidden="true" /></button>
      </header>
      <form onSubmit={handleSubmit}>
        <FieldGroup className="finance-form">
          {request.kind === 'transaction' && <>
            <Field className="form-field"><FieldLabel htmlFor="transaction-type">Type</FieldLabel><select id="transaction-type" name="type" value={type} onChange={(event) => setType(event.target.value as 'income' | 'expense')}><option value="expense">Expense</option><option value="income">Income</option></select></Field>
            <Field className="form-field"><FieldLabel htmlFor="transaction-title">Description</FieldLabel><input autoFocus id="transaction-title" maxLength={80} name="title" placeholder="e.g. Weekly groceries" required /></Field>
            <div className="form-grid"><Field className="form-field"><FieldLabel htmlFor="transaction-amount">Amount</FieldLabel><input id="transaction-amount" inputMode="decimal" min="0.01" name="amount" placeholder="0.00" required step="0.01" type="number" /></Field><Field className="form-field"><FieldLabel htmlFor="transaction-category">Category</FieldLabel><select id="transaction-category" name="categoryName" required>{categoryOptions.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></Field></div>
            <div className="form-grid"><Field className="form-field"><FieldLabel htmlFor="transaction-date">Date</FieldLabel><input defaultValue={localDate()} id="transaction-date" name="transactionDate" required type="date" /></Field><Field className="form-field"><FieldLabel htmlFor="transaction-payment">Paid with</FieldLabel><select defaultValue="upi" id="transaction-payment" name="paymentMethod"><option value="upi">UPI</option><option value="card">Card</option><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="other">Other</option></select></Field></div>
            <Field className="form-field"><FieldLabel htmlFor="transaction-note">Note <span className="optional-label">(optional)</span></FieldLabel><input id="transaction-note" maxLength={240} name="notes" placeholder="Add a little context" /></Field>
          </>}
          {request.kind === 'budget' && <>
            <Field className="form-field"><FieldLabel htmlFor="budget-name">Budget name</FieldLabel><input autoFocus id="budget-name" maxLength={64} name="name" placeholder="e.g. Food this month" required /></Field>
            <div className="form-grid"><Field className="form-field"><FieldLabel htmlFor="budget-category">Category</FieldLabel><select id="budget-category" name="categoryName" required>{categoryOptions.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></Field><Field className="form-field"><FieldLabel htmlFor="budget-amount">Monthly limit</FieldLabel><input id="budget-amount" inputMode="decimal" min="0.01" name="amount" placeholder="0.00" required step="0.01" type="number" /></Field></div>
            <div className="form-grid"><Field className="form-field"><FieldLabel htmlFor="budget-start">Starts</FieldLabel><input defaultValue={monthStart()} id="budget-start" name="startDate" required type="date" /></Field><Field className="form-field"><FieldLabel htmlFor="budget-end">Ends</FieldLabel><input defaultValue={monthEnd()} id="budget-end" name="endDate" required type="date" /></Field></div>
          </>}
          {request.kind === 'goal' && <>
            <Field className="form-field"><FieldLabel htmlFor="goal-name">What are you saving for?</FieldLabel><input autoFocus id="goal-name" maxLength={64} name="name" placeholder="e.g. A weekend away" required /></Field>
            <div className="form-grid"><Field className="form-field"><FieldLabel htmlFor="goal-target">Target amount</FieldLabel><input id="goal-target" inputMode="decimal" min="0.01" name="targetAmount" placeholder="0.00" required step="0.01" type="number" /></Field><Field className="form-field"><FieldLabel htmlFor="goal-date">Target date <span className="optional-label">(optional)</span></FieldLabel><input id="goal-date" name="targetDate" type="date" /></Field></div>
          </>}
          {request.kind === 'contribution' && <>
            <p className="dialog-description">Add a little more toward {request.goalName}.</p>
            <Field className="form-field"><FieldLabel htmlFor="contribution-amount">Amount</FieldLabel><input autoFocus id="contribution-amount" inputMode="decimal" min="0.01" name="amount" placeholder="0.00" required step="0.01" type="number" /></Field>
            <Field className="form-field"><FieldLabel htmlFor="contribution-note">Note <span className="optional-label">(optional)</span></FieldLabel><input id="contribution-note" maxLength={160} name="note" placeholder="A small win worth remembering" /></Field>
          </>}
          {error && <FieldError className="form-error">{error}</FieldError>}
          <div className="dialog-actions"><Button className="secondary-button" onClick={onClose} type="button" variant="outline">Cancel</Button><Button className="primary-button" disabled={pending} type="submit">{pending ? 'Saving…' : request.kind === 'contribution' ? 'Add funds' : 'Save'}</Button></div>
        </FieldGroup>
      </form>
    </dialog>
  )
}
