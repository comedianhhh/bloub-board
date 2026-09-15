export function isLocalAppUrl(appUrl: string | undefined): boolean {
  if (!appUrl) return false
  try {
    const hostname = new URL(appUrl).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/** Live and restricted-live Stripe keys both carry the `_live_` marker. */
export function isLiveStripeKey(secretKey: string | undefined): boolean {
  return Boolean(secretKey && secretKey.includes('_live_'))
}

// A localhost app URL cannot receive a real customer, so a live key here is
// always a misconfiguration. Refusing it turns a chargeable mistake into a
// mock checkout instead of a real Stripe session.
export function liveKeyOnLocalhost(config: {
  appUrl?: string | undefined
  stripeSecretKey?: string | undefined
}): boolean {
  return isLocalAppUrl(config.appUrl) && isLiveStripeKey(config.stripeSecretKey)
}
