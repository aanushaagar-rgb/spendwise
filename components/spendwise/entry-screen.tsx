'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, ShieldAlert, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'

type EntryScreenProps = {
  onStart: (username: string) => Promise<void>
  error: string | null
  loading: boolean
}

export function EntryScreen({ onStart, error, loading }: EntryScreenProps) {
  const [username, setUsername] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onStart(username)
  }

  return (
    <main className="entry-page">
      <div className="entry-orbit entry-orbit-one" aria-hidden="true" />
      <div className="entry-orbit entry-orbit-two" aria-hidden="true" />
      <section className="entry-card" aria-labelledby="entry-title">
        <a className="app-brand entry-brand" href="/" aria-label="SpendWise home">
          <span className="brand-symbol"><Wallet aria-hidden="true" /></span>
          <span>spend<span>wise</span></span>
        </a>
        <p className="entry-kicker">YOUR MONEY, IN FOCUS</p>
        <h1 id="entry-title">A clearer view starts with your name.</h1>
        <p className="entry-copy">Choose the name you want attached to your finances. Enter that same name on any visit to return to the same SpendWise profile.</p>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="entry-form">
            <Field>
              <FieldLabel htmlFor="profile-name">Your name</FieldLabel>
              <input
                autoComplete="nickname"
                id="profile-name"
                maxLength={32}
                name="username"
                onChange={(event) => setUsername(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault()
                }}
                placeholder="e.g. Alex Morgan"
                required
                value={username}
              />
              <FieldDescription className="entry-hint">1–32 characters. Your name is not verified and no password is needed.</FieldDescription>
            </Field>
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button className="primary-button entry-submit" disabled={loading} type="submit">
              {loading ? 'Opening your space…' : 'Continue'} <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Button>
          </FieldGroup>
        </form>
        <div className="identity-notice" role="note">
          <ShieldAlert aria-hidden="true" />
          <p><strong>Name-only profiles are shared by name.</strong> Anyone who enters the same name can view and change that profile&apos;s financial data. Don&apos;t use this for sensitive records.</p>
        </div>
      </section>
      <p className="entry-footer">A simple money workspace, ready when you are.</p>
    </main>
  )
}
