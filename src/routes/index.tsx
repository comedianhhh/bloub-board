import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'

import type { Listing } from '../data/listings.ts'
import { boardPage } from '../domain/board.ts'
import { daysUntilDropOff, decayedBalanceFromDropOff } from '../domain/decay.ts'
import { faviconUrlForTarget } from '../domain/favicon.ts'
import { normalizeIdentity } from '../domain/identity.ts'
import {
  BID_STEP_CENTS,
  MINIMUM_BID_CENTS,
  amountToClaim,
  formatUsd,
  msUntilNextTakeoverDrop,
  takeoverIdleMs,
  takeoverPrice,
} from '../domain/money.ts'
import { projectedRank, rankListings } from '../domain/ranking.ts'
import { database, publicCheckoutConfig } from '../server/env.ts'
import { loadPublicBoard, loadPublicStats, recordTraffic } from '../server/db.ts'
import { localeHtmlLang, useLocale } from '../i18n/context.tsx'
import { formatCount, formatDaysLeft, formatDurationShort, formatRelativeAge, localizeError } from '../i18n/format.ts'
import { interpolate } from '../i18n/locale.ts'
import { en } from '../i18n/locales/en.ts'
import { resolveRequestLocale } from '../server/locale.ts'
import { resolveVisitorKey } from '../server/visitor-cookie.ts'
import { ListingFace, Mascot, type MascotMood, useRaisePulse } from '../ui/bloub.tsx'
import { SiteFooter, SiteHeader } from '../ui/site-chrome.tsx'

const loadHome = createServerFn({ method: 'GET' }).handler(async () => {
  resolveRequestLocale()
  const db = database()
  const now = new Date()
  await recordTraffic(db, {
    kind: 'board',
    countryCode: getRequestHeader('CF-IPCountry') ?? null,
    visitorKey: resolveVisitorKey(),
  })
  const board = await loadPublicBoard(db, now)
  const stats = await loadPublicStats(db, now)
  return {
    listings: board.listings,
    takeover: board.takeover,
    lastEndedTakeoverAt: board.lastEndedTakeoverAt,
    nowIso: now.toISOString(),
    checkout: publicCheckoutConfig(),
    visitorsOnline: stats.visitorsOnline,
    visitorsLast24h: stats.visitorsLast24h,
  }
})

export const Route = createFileRoute('/')({
  loader: () => loadHome(),
  component: Home,
})

function listingRunway(listing: Listing, nowIso: string): { daysLeft: number; fraction: number; fading: boolean } {
  const daysLeft = daysUntilDropOff(listing.dropsOffAt, nowIso)
  const span = daysUntilDropOff(listing.dropsOffAt, listing.settledAt)
  const fraction = span > 0 ? Math.min(1, Math.max(0, daysLeft / span)) : 0
  return { daysLeft, fraction, fading: daysLeft <= 14 && fraction < 0.35 }
}

function Home() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const { copy, locale } = useLocale()
  const htmlLang = localeHtmlLang(locale)
  const bidFormRef = useRef<HTMLElement>(null)
  const listings = data.listings
  const [clockIso, setClockIso] = useState(data.nowIso)
  const rankedListings = useMemo(
    () =>
      rankListings(
        listings
          .map((listing) => ({
            ...listing,
            amountCents: decayedBalanceFromDropOff(listing.dropsOffAt, clockIso),
          }))
          .filter((listing) => listing.amountCents > 0 && listing.dropsOffAt > clockIso),
      ),
    [listings, clockIso],
  )
  const leaderAmount = rankedListings[0]?.amountCents ?? MINIMUM_BID_CENTS
  const [amountCents, setAmountCents] = useState(() => amountToClaim(leaderAmount))
  const [identityInput, setIdentityInput] = useState('')
  const [identityError, setIdentityError] = useState('')
  const [listingTitle, setListingTitle] = useState('')
  const [listingDescription, setListingDescription] = useState('')
  const [listingImageUrl, setListingImageUrl] = useState('')
  const [resolving, setResolving] = useState(false)
  const [resolvedKey, setResolvedKey] = useState('')
  const lastCanonical = useRef('')
  const resolveSeq = useRef(0)
  const [takeover, setTakeover] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [pendingIntentId, setPendingIntentId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [takeoverTick, setTakeoverTick] = useState(() => Date.now())
  const [passTarget, setPassTarget] = useState<{ rank: number; amountCents: number } | null>(null)
  const [raising, pulseRaise] = useRaisePulse()
  const [liveFace, setLiveFace] = useState<string | null>(null)

  const board = boardPage({ listings: rankedListings, takeover: data.takeover, requestedPage: page })
  const previewRank = projectedRank(amountCents, rankedListings)
  const normalizedIdentity = normalizeIdentity(identityInput)
  const matchedLiveListing = useMemo(() => {
    if (!normalizedIdentity.ok) return null
    const key = normalizedIdentity.identity.canonicalKey
    return (
      rankedListings.find((listing) => {
        const parsed = normalizeIdentity(listing.identityInput)
        return parsed.ok && parsed.identity.canonicalKey === key
      }) ?? null
    )
  }, [normalizedIdentity, rankedListings])
  const sponsoring = Boolean(matchedLiveListing)
  const canCheckout =
    data.checkout.mode !== 'unavailable' &&
    normalizedIdentity.ok &&
    (sponsoring || (listingTitle.trim() !== '' && listingDescription.trim() !== '')) &&
    amountCents >= MINIMUM_BID_CENTS &&
    !busy
  const showListingMeta = normalizedIdentity.ok && !sponsoring
  const identityLogo = normalizedIdentity.ok ? faviconUrlForTarget(normalizedIdentity.identity.targetUrl) : null
  const previewLogo = listingImageUrl || identityLogo
  const resolveFailed =
    showListingMeta &&
    resolvedKey === normalizedIdentity.identity.canonicalKey &&
    !resolving &&
    (!listingTitle.trim() || !listingDescription.trim())

  function applyIdentityInput(value: string) {
    setIdentityInput(value)
    setIdentityError('')
    const next = normalizeIdentity(value)
    const key = next.ok ? next.identity.canonicalKey : ''
    if (key !== lastCanonical.current) {
      lastCanonical.current = key
      setResolvedKey('')
      setListingTitle('')
      setListingDescription('')
      setListingImageUrl('')
    }
  }

  function clearComposerFields() {
    lastCanonical.current = ''
    setResolvedKey('')
    setIdentityInput('')
    setListingTitle('')
    setListingDescription('')
    setListingImageUrl('')
  }

  function passListing(listing: Listing, rank: number) {
    setTakeover(false)
    const passCents = amountToClaim(listing.amountCents)
    setAmountCents(passCents)
    setPassTarget({ rank, amountCents: passCents })
    setIdentityError('')
    clearComposerFields()
    scrollToBidForm()
  }

  function sponsorListing(listing: Listing) {
    setTakeover(false)
    setPassTarget(null)
    setAmountCents(amountToClaim(listing.amountCents))
    setIdentityError('')
    const parsed = normalizeIdentity(listing.identityInput)
    if (parsed.ok) {
      lastCanonical.current = parsed.identity.canonicalKey
      setResolvedKey(parsed.identity.canonicalKey)
    }
    setIdentityInput(listing.identityInput)
    setListingTitle(listing.domain)
    setListingDescription(
      listing.description === en.defaultDescription ? copy.defaultDescription : listing.description,
    )
    setListingImageUrl('')
    scrollToBidForm()
  }

  useEffect(() => {
    setClockIso(new Date().toISOString())
    const timer = window.setInterval(() => {
      setClockIso(new Date().toISOString())
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setTakeoverTick(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const result = normalizeIdentity(identityInput)
    if (!result.ok) return
    const timer = window.setTimeout(() => {
      void resolveIdentityFields(identityInput)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [identityInput])

  async function resolveIdentityFields(value: string) {
    const result = normalizeIdentity(value)
    if (!result.ok) return
    const seq = ++resolveSeq.current
    setResolving(true)
    try {
      const response = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identity: value }),
      })
      if (seq !== resolveSeq.current) return
      const payload = (await response.json()) as {
        metadata?: { title?: string; description?: string; imageUrl?: string | null }
      }
      setResolvedKey(result.identity.canonicalKey)
      if (!response.ok || !payload.metadata) return
      setListingTitle((current) => current || payload.metadata?.title || '')
      setListingDescription((current) => current || payload.metadata?.description || '')
      setListingImageUrl((current) => current || payload.metadata?.imageUrl || '')
    } catch {
      if (seq === resolveSeq.current) setResolvedKey(result.identity.canonicalKey)
    } finally {
      if (seq === resolveSeq.current) setResolving(false)
    }
  }
  const activeTakeover = data.takeover
  const takeoverNowIso = new Date(takeoverTick).toISOString()
  const takeoverIdle = takeoverIdleMs(takeoverNowIso, data.lastEndedTakeoverAt)
  const takeoverAmountLive = takeoverPrice(leaderAmount, takeoverIdle)
  const nextTakeoverDropMs = msUntilNextTakeoverDrop(leaderAmount, takeoverIdle)
  const payLabel = busy ? copy.working : takeover ? copy.takeOver : sponsoring ? copy.sponsor : copy.bid
  // The mascot shows what the board is doing, in order of what matters most.
  const mascotMood: MascotMood = identityError
    ? 'error'
    : checkoutOpen
      ? 'waiting'
      : busy || resolving
        ? 'thinking'
        : raising
          ? 'raising'
          : takeover
            ? 'takeover'
            : 'idle'
  const listingIdentity = (listing: Listing) => {
    const parsed = normalizeIdentity(listing.identityInput)
    return parsed.ok ? parsed.identity.canonicalKey : listing.identityInput
  }

  function scrollToBidForm() {
    bidFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function chooseTakeover() {
    setTakeover(true)
    setPassTarget(null)
    setAmountCents(takeoverAmountLive)
    setIdentityError('')
    scrollToBidForm()
  }

  async function openCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = normalizeIdentity(identityInput)
    if (!result.ok) {
      setIdentityError(localizeError(result.message, copy))
      return
    }
    setBusy(true)
    setIdentityError('')
    try {
      const turnstileInput = event.currentTarget.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          amountCents,
          identity: identityInput,
          title: sponsoring ? matchedLiveListing!.domain : listingTitle,
          description: sponsoring
            ? (matchedLiveListing!.description === en.defaultDescription
                ? copy.defaultDescription
                : matchedLiveListing!.description)
            : listingDescription,
          imageUrl: sponsoring ? matchedLiveListing!.image : listingImageUrl || null,
          takeover,
          turnstileToken: turnstileInput?.value ?? '',
        }),
      })
      const payload = (await response.json()) as {
        message?: string
        mode?: 'mock' | 'stripe' | 'settled' | 'unavailable'
        intentId?: string
        checkoutUrl?: string
      }
      if (!response.ok || !payload.intentId) {
        setIdentityError(localizeError(payload.message ?? copy.errorCheckoutStart, copy))
        return
      }
      if ((payload.mode === 'stripe' || payload.mode === 'settled') && payload.checkoutUrl) {
        window.location.assign(payload.checkoutUrl)
        return
      }
      setPendingIntentId(payload.intentId)
      setCheckoutOpen(true)
    } finally {
      setBusy(false)
    }
  }

  async function confirmMockPayment() {
    if (!pendingIntentId) return
    setBusy(true)
    try {
      const response = await fetch('/api/mock/settle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ intentId: pendingIntentId }),
      })
      const payload = (await response.json()) as { message?: string; receipt?: string }
      if (!response.ok) {
        setIdentityError(localizeError(payload.message ?? copy.errorMockSettle, copy))
        return
      }
      window.location.assign(`/receipts/${pendingIntentId}`)
    } finally {
      setBusy(false)
    }
  }

  function closeCheckout() {
    setCheckoutOpen(false)
  }

  return (
    <main className="site-shell">
      <SiteHeader />

      <section className="hero" id="top">
        <Mascot mood={mascotMood} />
        <h1 className="hero-title">{copy.heroTitle ?? en.heroTitle}</h1>
        <p className="hero-lead">
          {copy.heroLead ?? en.heroLead} <span className="decay">{copy.heroLeadEmphasis ?? en.heroLeadEmphasis}</span>. {copy.tagline}
        </p>
      </section>

      <section className="bid-panel" ref={bidFormRef} aria-labelledby="bid-heading">
        <div className="bid-title-row">
          <h2 id="bid-heading">
            {takeover ? copy.takePageOneFor : interpolate(copy.claimRankFor, { rank: previewRank })}
          </h2>
          <div className="bid-stepper">
            <button
              className="step-button"
              type="button"
              aria-label={copy.decreaseBid}
              onClick={() => setAmountCents((amount) => Math.max(MINIMUM_BID_CENTS, amount - BID_STEP_CENTS))}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 8h9" /></svg>
            </button>
            <strong className="bid-amount num">{formatUsd(amountCents)}</strong>
            <button
              className="step-button"
              type="button"
              aria-label={copy.increaseBid}
              onClick={() => {
                setAmountCents((amount) => amount + BID_STEP_CENTS)
                pulseRaise()
              }}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 8h9M8 3.5v9" /></svg>
            </button>
          </div>
        </div>

        <form className="bid-form" onSubmit={openCheckout} noValidate>
          <div className="bid-row">
            <label className="identity-field">
              <span className="sr-only">{copy.identityLabel}</span>
              <input
                value={identityInput}
                onChange={(event) => applyIdentityInput(event.target.value)}
                onBlur={(event) => void resolveIdentityFields(event.target.value)}
                placeholder={copy.identityPlaceholder}
                aria-invalid={Boolean(identityError)}
                aria-describedby="identity-help identity-error"
                autoComplete="url"
              />
            </label>
            <button className="primary-button" type="submit" disabled={!canCheckout}>
              {payLabel} {busy ? null : <span className="num">{formatUsd(amountCents)}</span>}
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
            </button>
          </div>
          <p className="identity-help" id="identity-help">
            {data.checkout.mode === 'unavailable'
              ? copy.helpUnavailable
              : resolving
                ? copy.helpResolving
                : resolveFailed
                  ? copy.helpResolveFailed
                  : sponsoring
                    ? copy.helpSponsor
                    : passTarget
                      ? interpolate(copy.helpPass, {
                          amount: formatUsd(passTarget.amountCents),
                          rank: passTarget.rank,
                        })
                      : takeover
                        ? copy.explainerTakeover
                        : copy.explainerBid}
          </p>
          {data.checkout.turnstileSiteKey ? (
            <div className="cf-turnstile" data-sitekey={data.checkout.turnstileSiteKey} />
          ) : null}
          {showListingMeta ? (
            <div className="listing-meta">
              <div className="resolved-identity">
                <ListingFace
                  identity={normalizedIdentity.ok ? normalizedIdentity.identity.canonicalKey : identityInput}
                  size={44}
                  rank={previewRank}
                  settledAgoMs={0}
                  daysLeft={90}
                  fading={false}
                  live
                />
                <div>
                  <strong>{listingTitle || (normalizedIdentity.ok ? normalizedIdentity.identity.display : '')}</strong>
                  {listingDescription ? <p>{listingDescription}</p> : null}
                </div>
                {previewLogo ? (
                  <img
                    src={previewLogo}
                    alt=""
                    width="20"
                    height="20"
                    className="resolved-favicon"
                    onError={(event) => {
                      event.currentTarget.hidden = true
                    }}
                  />
                ) : null}
              </div>
              <label>
                <span>{copy.title}</span>
                <input
                  value={listingTitle}
                  onChange={(event) => setListingTitle(event.target.value)}
                  placeholder={copy.titlePlaceholder}
                  maxLength={80}
                  required
                />
              </label>
              <label>
                <span>{copy.description}</span>
                <textarea
                  value={listingDescription}
                  onChange={(event) => setListingDescription(event.target.value)}
                  placeholder={copy.descriptionPlaceholder}
                  maxLength={240}
                  rows={2}
                  required
                />
              </label>
              <label>
                <span>{copy.imageUrl} <em>{copy.optional}</em></span>
                <input
                  value={listingImageUrl}
                  onChange={(event) => setListingImageUrl(event.target.value)}
                  placeholder="https://…"
                  inputMode="url"
                />
              </label>
            </div>
          ) : null}
          <p className="field-error" id="identity-error" role="alert">{identityError}</p>
        </form>
      </section>

      <section className="takeover-offer" aria-label={copy.takeoverAria}>
        <Mascot mood="takeover" size={56} follow={false} frozenAt={0.6} />
        <div className="takeover-copy">
          <strong>{copy.takeoverTitle ?? en.takeoverTitle}</strong>
          <p>
            {copy.takeoverLead ?? en.takeoverLead}{' '}
            <span className="takeover-price num">{interpolate(copy.takeoverNow ?? en.takeoverNow!, { amount: formatUsd(takeoverAmountLive) })}</span>{' '}
            <span className="takeover-countdown">
              {nextTakeoverDropMs != null
                ? interpolate(copy.takeoverNextDrop, { time: formatDurationShort(nextTakeoverDropMs) })
                : copy.takeoverAtFloor}
            </span>
          </p>
        </div>
        <button className="pill-button" type="button" onClick={chooseTakeover} disabled={Boolean(activeTakeover)}>
          {activeTakeover ? copy.takeoverActive : copy.takeOver}
        </button>
      </section>

      <section className="leaderboard" aria-labelledby="leaderboard-heading">
        <div className="board-head">
          <h2 id="leaderboard-heading">{copy.boardTitle ?? en.boardTitle}</h2>
          <div className="board-meta">
            <span className="num">{interpolate(copy.liveCount ?? en.liveCount!, { count: rankedListings.length })}</span>
            <button className="text-button" type="button" onClick={() => void router.invalidate()}>
              {copy.refresh}
            </button>
          </div>
        </div>

        {board.takeover ? (
          <article className="takeover-live">
            <span className="takeover-kicker">{copy.takeoverLiveKicker}</span>
            <a href={board.takeover.href} target="_blank" rel="sponsored noopener noreferrer">
              {board.takeover.display}
            </a>
            <p>
              {interpolate(copy.takeoverOwnsUntil, {
                time: new Date(board.takeover.endsAt).toLocaleTimeString(htmlLang, { hour: '2-digit', minute: '2-digit' }),
              })}
            </p>
            <strong className="num">{formatUsd(board.takeover.amountCents)}</strong>
            <button className="pill-button" type="button" onClick={() => setPage(2)}>{copy.browseRegular}</button>
          </article>
        ) : (
          <div className="listing-stack">
            {board.listings.length === 0 ? (
              <p className="empty-note">{copy.emptyBoard}</p>
            ) : null}
            {board.listings.map((listing, index) => {
              const rank = board.firstRank + index
              const passCents = amountToClaim(listing.amountCents)
              const runway = listingRunway(listing, clockIso)
              const settledAgoMs = Math.max(0, Date.parse(clockIso) - Date.parse(listing.settledAt))
              return (
                <article
                  className={`listing-row${runway.fading ? ' listing-row--fading' : ''}`}
                  key={listing.id}
                  onMouseEnter={() => setLiveFace(listing.id)}
                  onMouseLeave={() => setLiveFace((current) => (current === listing.id ? null : current))}
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest('a, button')) return
                    passListing(listing, rank)
                  }}
                >
                  <span className="listing-rank num">{rank}</span>
                  <ListingFace
                    identity={listingIdentity(listing)}
                    size={44}
                    rank={rank}
                    settledAgoMs={settledAgoMs}
                    daysLeft={runway.daysLeft}
                    fading={runway.fading}
                    live={liveFace === listing.id}
                  />
                  <div className="listing-copy">
                    <a href={listing.href} target="_blank" rel="sponsored noopener noreferrer">
                      {listing.domain}
                    </a>
                    <p>{listing.description === en.defaultDescription ? copy.defaultDescription : listing.description}</p>
                    <small>
                      <span className="num">{formatDaysLeft(runway.daysLeft, copy)}</span>
                      <span className="num">{interpolate(copy.clicks, { count: formatCount(listing.clicks, htmlLang) })}</span>
                      <span>{formatRelativeAge(listing.settledAt, clockIso, copy)}</span>
                      {runway.fading ? <span className="decay">{copy.droppingSoon ?? en.droppingSoon}</span> : null}
                    </small>
                  </div>
                  <div className="listing-amounts">
                    <p className="listing-amount num" aria-label={interpolate(copy.currentAmountAria, { amount: formatUsd(listing.amountCents) })}>
                      {formatUsd(listing.amountCents)}
                    </p>
                    {listing.contributionCents > listing.amountCents ? (
                      <p className="listing-amount-initial num" aria-label={interpolate(copy.initialAmountAria, { amount: formatUsd(listing.contributionCents) })}>
                        {formatUsd(listing.contributionCents)}
                      </p>
                    ) : null}
                    <div className="listing-hover-actions">
                      <button
                        className="claim-pill num"
                        type="button"
                        onClick={() => passListing(listing, rank)}
                        aria-label={interpolate(copy.passForAria, { amount: formatUsd(passCents) })}
                      >
                        {interpolate(copy.claimRank ?? en.claimRank!, { rank, amount: formatUsd(passCents) })}
                      </button>
                      <button className="text-button" type="button" onClick={() => sponsorListing(listing)} aria-label={copy.sponsorForAria}>
                        {copy.sponsor}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {board.pageCount > 1 ? (
          <nav className="pagination" aria-label={copy.pagesAria}>
            <button className="text-button" type="button" onClick={() => setPage(board.page - 1)} disabled={board.page === 1}>{copy.prev}</button>
            {Array.from({ length: board.pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`text-button num${pageNumber === board.page ? ' current-page' : ''}`}
                aria-current={pageNumber === board.page ? 'page' : undefined}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button className="text-button" type="button" onClick={() => setPage(board.page + 1)} disabled={board.page === board.pageCount}>{copy.next}</button>
          </nav>
        ) : null}
      </section>

      <SiteFooter />

      {checkoutOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) closeCheckout()
        }}>
          <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <span className="modal-kicker">{copy.checkoutKicker}</span>
            <h2 id="checkout-title">{takeover ? copy.reviewTakeover : sponsoring ? copy.reviewSponsor : copy.reviewBid}</h2>
            <dl>
              <div><dt>{copy.listing}</dt><dd>{listingTitle || (normalizedIdentity.ok ? normalizedIdentity.identity.display : identityInput)}</dd></div>
              <div><dt>{copy.placement}</dt><dd>{takeover ? copy.placementTakeover : interpolate(copy.projectedRank, { rank: previewRank })}</dd></div>
              <div><dt>{copy.total}</dt><dd className="num">{formatUsd(amountCents)}</dd></div>
            </dl>
            <p className="payment-note">{copy.paymentNote}</p>
            <button className="primary-button modal-primary" type="button" disabled={busy} onClick={() => void confirmMockPayment()}>
              {copy.confirmMock}
            </button>
            <button className="text-button" type="button" onClick={closeCheckout}>{copy.cancel}</button>
          </section>
        </div>
      ) : null}
    </main>
  )
}
