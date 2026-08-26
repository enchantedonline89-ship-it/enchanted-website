'use client'

import { useState, type FormEvent } from 'react'
import { setAnalyticsConsent } from '@/components/analytics/consent'
import {
  LEBANON_GOVERNORATES,
  MAX_ACTIVE_ADDRESSES,
  type CustomerAddress,
  type CustomerAddressInput,
  type CustomerProfile,
  type CustomerProfileInput,
} from '@/lib/customer-data'

type ApiFailure = Error & { fieldErrors?: Record<string, string> }

function newAddress(profile: CustomerProfile): CustomerAddressInput {
  return {
    label: 'Home',
    recipientName: profile.name,
    phone: profile.defaultPhone ?? '',
    countryCode: 'LB',
    governorate: 'Beirut',
    city: '',
    area: '',
    street: '',
    building: null,
    floor: null,
    landmark: null,
    deliveryNotes: null,
    isDefault: false,
  }
}

function addressPayload(address: CustomerAddress, isDefault = address.isDefault): CustomerAddressInput {
  return {
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    countryCode: 'LB',
    governorate: address.governorate,
    city: address.city,
    area: address.area,
    street: address.street,
    building: address.building,
    floor: address.floor,
    landmark: address.landmark,
    deliveryNotes: address.deliveryNotes,
    isDefault,
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  const data = (await response.json().catch(() => ({}))) as {
    error?: string
    fieldErrors?: Record<string, string>
  }
  if (!response.ok) {
    const error = new Error(data.error ?? 'That request could not be completed.') as ApiFailure
    error.fieldErrors = data.fieldErrors
    throw error
  }
  return data as T
}

function FieldError({ name, errors }: { name: string; errors: Record<string, string> }) {
  const message = errors[name]
  return message ? <span className="mt-1 block text-sm text-signal-error">{message}</span> : null
}

function textValue(value: string | null) {
  return value ?? ''
}

export default function AddressManager({
  initialProfile,
  initialAddresses,
}: {
  initialProfile: CustomerProfile
  initialAddresses: CustomerAddress[]
}) {
  const [profile, setProfile] = useState(initialProfile)
  const [profileDraft, setProfileDraft] = useState<CustomerProfileInput>({
    name: initialProfile.name,
    defaultPhone: initialProfile.defaultPhone,
    marketingConsent: initialProfile.marketingConsent,
    analyticsConsent: initialProfile.analyticsConsent,
  })
  const [addresses, setAddresses] = useState(initialAddresses)
  const [draft, setDraft] = useState<CustomerAddressInput>(() => newAddress(initialProfile))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddressForm, setShowAddressForm] = useState(initialAddresses.length === 0)
  const [busy, setBusy] = useState<string | null>(null)
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const updateDraft = <K extends keyof CustomerAddressInput>(
    field: K,
    value: CustomerAddressInput[K],
  ) => setDraft((current) => ({ ...current, [field]: value }))

  const updateAddressInList = (saved: CustomerAddress) => {
    setAddresses((current) => {
      const normalized = saved.isDefault
        ? current.map((item) => ({ ...item, isDefault: false }))
        : current
      const exists = normalized.some((item) => item.id === saved.id)
      const next = exists
        ? normalized.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...normalized]
      return [...next].sort(
        (a, b) => Number(b.isDefault) - Number(a.isDefault) || b.updatedAt.localeCompare(a.updatedAt),
      )
    })
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy('profile')
    setError('')
    setNotice('')
    setProfileErrors({})
    try {
      const result = await requestJson<{ profile: CustomerProfile }>('/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify(profileDraft),
      })
      setProfile(result.profile)
      setProfileDraft({
        name: result.profile.name,
        defaultPhone: result.profile.defaultPhone,
        marketingConsent: result.profile.marketingConsent,
        analyticsConsent: result.profile.analyticsConsent,
      })
      setAnalyticsConsent(result.profile.analyticsConsent)
      setNotice('Account details saved.')
    } catch (caught) {
      const failure = caught as ApiFailure
      setProfileErrors(failure.fieldErrors ?? {})
      setError(failure.message)
    } finally {
      setBusy(null)
    }
  }

  const saveAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(editingId ?? 'new')
    setError('')
    setNotice('')
    setAddressErrors({})
    try {
      const url = editingId ? `/api/account/addresses/${editingId}` : '/api/account/addresses'
      const result = await requestJson<{ address: CustomerAddress }>(url, {
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify(draft),
      })
      updateAddressInList(result.address)
      setDraft(newAddress(profile))
      setEditingId(null)
      setShowAddressForm(false)
      setNotice(editingId ? 'Address updated.' : 'Address saved.')
    } catch (caught) {
      const failure = caught as ApiFailure
      setAddressErrors(failure.fieldErrors ?? {})
      setError(failure.message)
    } finally {
      setBusy(null)
    }
  }

  const beginNewAddress = () => {
    setDraft(newAddress(profile))
    setEditingId(null)
    setAddressErrors({})
    setError('')
    setNotice('')
    setShowAddressForm(true)
  }

  const beginEdit = (address: CustomerAddress) => {
    setDraft(addressPayload(address))
    setEditingId(address.id)
    setAddressErrors({})
    setError('')
    setNotice('')
    setShowAddressForm(true)
    document.getElementById('address-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const makeDefault = async (address: CustomerAddress) => {
    setBusy(address.id)
    setError('')
    setNotice('')
    try {
      const result = await requestJson<{ address: CustomerAddress }>(
        `/api/account/addresses/${address.id}`,
        { method: 'PATCH', body: JSON.stringify(addressPayload(address, true)) },
      )
      updateAddressInList(result.address)
      setNotice(`${result.address.label} is now your default address.`)
    } catch (caught) {
      setError((caught as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const removeAddress = async (address: CustomerAddress) => {
    if (!window.confirm(`Remove the saved address “${address.label}”?`)) return
    setBusy(address.id)
    setError('')
    setNotice('')
    try {
      const result = await requestJson<{ deletedId: string; defaultAddressId: string | null }>(
        `/api/account/addresses/${address.id}`,
        { method: 'DELETE' },
      )
      setAddresses((current) =>
        current
          .filter((item) => item.id !== result.deletedId)
          .map((item) => ({ ...item, isDefault: item.id === result.defaultAddressId })),
      )
      if (editingId === address.id) {
        setEditingId(null)
        setDraft(newAddress(profile))
        setShowAddressForm(false)
      }
      setNotice('Address removed.')
    } catch (caught) {
      setError((caught as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid items-start gap-12 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)] xl:gap-16">
      <section aria-labelledby="profile-heading" className="border-t border-line pt-7">
        <p className="t-meta">Account</p>
        <h2 id="profile-heading" className="mt-2 text-2xl text-ink">Your details</h2>
        <p className="mt-3 max-w-[56ch] text-sm text-ink-dim">
          Your email is managed by sign-in. The phone below is used to prefill new delivery addresses.
        </p>

        <form className="mt-7 grid gap-5" onSubmit={saveProfile}>
          <label>
            <span className="t-meta mb-2 block">Name</span>
            <input
              className="field"
              value={profileDraft.name}
              onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))}
              autoComplete="name"
              maxLength={100}
              aria-invalid={Boolean(profileErrors.name)}
              required
            />
            <FieldError name="name" errors={profileErrors} />
          </label>

          <label>
            <span className="t-meta mb-2 block">Email</span>
            <input className="field opacity-70" value={profile.email} type="email" disabled />
          </label>

          <label>
            <span className="t-meta mb-2 block">Default phone</span>
            <input
              className="field"
              value={profileDraft.defaultPhone ?? ''}
              onChange={(event) => setProfileDraft((current) => ({ ...current, defaultPhone: event.target.value }))}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+961 81 492 994"
              aria-invalid={Boolean(profileErrors.defaultPhone)}
            />
            <FieldError name="defaultPhone" errors={profileErrors} />
          </label>

          <label className="flex items-start gap-3 text-sm text-ink-dim">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-ink"
              checked={profileDraft.marketingConsent}
              onChange={(event) => setProfileDraft((current) => ({ ...current, marketingConsent: event.target.checked }))}
            />
            <span>Email me about new arrivals and offers. You can change this anytime.</span>
          </label>

          <label className="flex items-start gap-3 text-sm text-ink-dim">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-ink"
              checked={profileDraft.analyticsConsent}
              onChange={(event) => setProfileDraft((current) => ({ ...current, analyticsConsent: event.target.checked }))}
            />
            <span>Allow optional analytics that help us improve shopping and recommendations.</span>
          </label>

          <button className="btn btn-primary w-full sm:w-auto" disabled={busy !== null}>
            {busy === 'profile' ? 'Saving…' : 'Save account details'}
          </button>
        </form>
      </section>

      <section aria-labelledby="addresses-heading" className="border-t border-line pt-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="t-meta">Delivery</p>
            <h2 id="addresses-heading" className="mt-2 text-2xl text-ink">Saved addresses</h2>
            <p className="mt-3 text-sm text-ink-dim">
              Lebanon only · {addresses.length} of {MAX_ACTIVE_ADDRESSES} saved
            </p>
          </div>
          {!showAddressForm && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={beginNewAddress}
              disabled={addresses.length >= MAX_ACTIVE_ADDRESSES || busy !== null}
            >
              Add address
            </button>
          )}
        </div>

        {(notice || error) && (
          <div className="mt-6" aria-live="polite">
            {notice && <p className="border border-signal-ok/40 px-4 py-3 text-sm text-signal-ok">{notice}</p>}
            {error && <p className="border border-signal-error/40 px-4 py-3 text-sm text-signal-error">{error}</p>}
          </div>
        )}

        {addresses.length > 0 && (
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <article key={address.id} className="flex min-h-64 flex-col border border-line p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg text-ink">{address.label}</h3>
                    <p className="mt-1 text-sm text-ink-dim">{address.recipientName}</p>
                  </div>
                  {address.isDefault && (
                    <span className="t-meta shrink-0 border border-line-strong px-2 py-1 text-ink">Default</span>
                  )}
                </div>
                <address className="mt-5 not-italic text-sm leading-6 text-ink-dim">
                  {address.street}
                  {address.building ? `, ${address.building}` : ''}
                  {address.floor ? `, floor ${address.floor}` : ''}
                  <br />
                  {address.area}, {address.city}
                  <br />
                  {address.governorate}, Lebanon
                  <br />
                  <span className="tnum">{address.phone}</span>
                </address>
                <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5">
                  <button type="button" className="t-meta link-grow text-ink" onClick={() => beginEdit(address)} disabled={busy !== null}>
                    Edit
                  </button>
                  {!address.isDefault && (
                    <button type="button" className="t-meta link-grow text-ink-dim" onClick={() => makeDefault(address)} disabled={busy !== null}>
                      Make default
                    </button>
                  )}
                  <button type="button" className="t-meta text-signal-error" onClick={() => removeAddress(address)} disabled={busy !== null}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {addresses.length === 0 && !showAddressForm && (
          <p className="mt-7 border border-line p-6 text-ink-dim">No delivery addresses saved yet.</p>
        )}

        {showAddressForm && (
          <form id="address-form" className="mt-8 scroll-mt-24 border border-line p-5 sm:p-7" onSubmit={saveAddress}>
            <div className="flex flex-col gap-2 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="t-meta">{editingId ? 'Edit address' : 'New address'}</p>
                <h3 className="mt-2 text-xl text-ink">Lebanon delivery details</h3>
              </div>
              <p className="text-sm text-ink-faint">* Required</p>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label>
                <span className="t-meta mb-2 block">Label *</span>
                <input className="field" value={draft.label} onChange={(event) => updateDraft('label', event.target.value)} maxLength={40} placeholder="Home" aria-invalid={Boolean(addressErrors.label)} required />
                <FieldError name="label" errors={addressErrors} />
              </label>
              <label>
                <span className="t-meta mb-2 block">Recipient name *</span>
                <input className="field" value={draft.recipientName} onChange={(event) => updateDraft('recipientName', event.target.value)} maxLength={100} autoComplete="name" aria-invalid={Boolean(addressErrors.recipientName)} required />
                <FieldError name="recipientName" errors={addressErrors} />
              </label>
              <label>
                <span className="t-meta mb-2 block">Phone *</span>
                <input className="field" value={draft.phone} onChange={(event) => updateDraft('phone', event.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="+961 81 492 994" aria-invalid={Boolean(addressErrors.phone)} required />
                <FieldError name="phone" errors={addressErrors} />
              </label>
              <label>
                <span className="t-meta mb-2 block">Country</span>
                <input className="field opacity-70" value="Lebanon" disabled />
              </label>
              <label>
                <span className="t-meta mb-2 block">Governorate *</span>
                <select className="field" value={draft.governorate} onChange={(event) => updateDraft('governorate', event.target.value as CustomerAddressInput['governorate'])} aria-invalid={Boolean(addressErrors.governorate)} required>
                  {LEBANON_GOVERNORATES.map((governorate) => <option key={governorate}>{governorate}</option>)}
                </select>
                <FieldError name="governorate" errors={addressErrors} />
              </label>
              <label>
                <span className="t-meta mb-2 block">City or town *</span>
                <input className="field" value={draft.city} onChange={(event) => updateDraft('city', event.target.value)} maxLength={100} autoComplete="address-level2" aria-invalid={Boolean(addressErrors.city)} required />
                <FieldError name="city" errors={addressErrors} />
              </label>
              <label>
                <span className="t-meta mb-2 block">Area *</span>
                <input className="field" value={draft.area} onChange={(event) => updateDraft('area', event.target.value)} maxLength={120} autoComplete="address-level3" aria-invalid={Boolean(addressErrors.area)} required />
                <FieldError name="area" errors={addressErrors} />
              </label>
              <label>
                <span className="t-meta mb-2 block">Street *</span>
                <input className="field" value={draft.street} onChange={(event) => updateDraft('street', event.target.value)} maxLength={200} autoComplete="street-address" aria-invalid={Boolean(addressErrors.street)} required />
                <FieldError name="street" errors={addressErrors} />
              </label>
              <label>
                <span className="t-meta mb-2 block">Building</span>
                <input className="field" value={textValue(draft.building)} onChange={(event) => updateDraft('building', event.target.value)} maxLength={100} />
                <FieldError name="building" errors={addressErrors} />
              </label>
              <label>
                <span className="t-meta mb-2 block">Floor</span>
                <input className="field" value={textValue(draft.floor)} onChange={(event) => updateDraft('floor', event.target.value)} maxLength={40} />
                <FieldError name="floor" errors={addressErrors} />
              </label>
              <label className="sm:col-span-2">
                <span className="t-meta mb-2 block">Nearby landmark</span>
                <input className="field" value={textValue(draft.landmark)} onChange={(event) => updateDraft('landmark', event.target.value)} maxLength={200} />
                <FieldError name="landmark" errors={addressErrors} />
              </label>
              <label className="sm:col-span-2">
                <span className="t-meta mb-2 block">Delivery notes</span>
                <textarea className="field min-h-28 resize-y" value={textValue(draft.deliveryNotes)} onChange={(event) => updateDraft('deliveryNotes', event.target.value)} maxLength={500} aria-invalid={Boolean(addressErrors.deliveryNotes)} />
                <FieldError name="deliveryNotes" errors={addressErrors} />
              </label>
            </div>

            <label className="mt-6 flex items-start gap-3 text-sm text-ink-dim">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-ink" checked={draft.isDefault} onChange={(event) => updateDraft('isDefault', event.target.checked)} />
              <span>Use this as my default delivery address.</span>
            </label>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-ghost" onClick={() => { setShowAddressForm(false); setEditingId(null); setAddressErrors({}); setDraft(newAddress(profile)) }} disabled={busy !== null}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={busy !== null}>
                {busy === (editingId ?? 'new') ? 'Saving…' : editingId ? 'Save changes' : 'Save address'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
