import assert from 'node:assert/strict'
import test from 'node:test'

import { Stripe } from 'stripe'

import { liveKeyOnLocalhost } from './local.ts'
import { createStripeCheckout, verifyPaidStripeWebhook } from './stripe.ts'

const stripe = new Stripe('sk_test_local_fixture', {
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = 'whsec_youbid_local_fixture'
const payload = JSON.stringify({
  id: 'evt_youbid_paid',
  object: 'event',
  type: 'checkout.session.completed',
  created: 1_784_710_000,
  data: {
    object: {
      id: 'cs_test_youbid',
      object: 'checkout.session',
      currency: 'usd',
      payment_status: 'paid',
      amount_subtotal: 10_001_00,
      amount_total: 10_001_00,
      payment_intent: 'pi_youbid',
      metadata: { youbid_intent_id: 'intent_youbid' },
    },
  },
})

test('Stripe webhook adapter verifies the raw body and maps only paid Checkout principal', async () => {
  const signature = await stripe.webhooks.generateTestHeaderStringAsync({
    payload,
    secret: webhookSecret,
    cryptoProvider: Stripe.createSubtleCryptoProvider(),
  })
  const result = await verifyPaidStripeWebhook(
    new Request('https://youbid.lol/api/webhooks/stripe', {
      method: 'POST',
      body: payload,
      headers: { 'stripe-signature': signature },
    }),
    { stripeSecretKey: 'sk_test_local_fixture', stripeWebhookSecret: webhookSecret },
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.value.intentId, 'intent_youbid')
  assert.equal(result.value.providerOrderId, 'pi_youbid')
  assert.equal(result.value.principalPaidCents, 10_001_00)
  assert.equal(result.value.principalRefundedCents, 0)
})

test('a live Stripe key on a localhost app URL never opens a real Checkout Session', async () => {
  const localLive = {
    appUrl: 'http://localhost:3000',
    stripeSecretKey: 'sk_live_not_a_real_key',
    stripeWebhookSecret: 'whsec_local',
  }
  assert.equal(liveKeyOnLocalhost(localLive), true)

  const refused = await createStripeCheckout(
    {
      intentId: 'intent_local',
      requestId: 'req_local',
      amountCents: 2_000,
      canonicalIdentity: 'url:example.com',
      takeover: false,
      turnstileToken: '',
    },
    localLive,
  )
  assert.equal(refused.ok, false)
  if (!refused.ok) assert.equal(refused.status, 503)

  // A test key locally, and a live key in production, both stay usable.
  assert.equal(liveKeyOnLocalhost({ ...localLive, stripeSecretKey: 'sk_test_local' }), false)
  assert.equal(liveKeyOnLocalhost({ ...localLive, appUrl: 'https://youbid.lol' }), false)
  assert.equal(liveKeyOnLocalhost({ ...localLive, stripeSecretKey: 'rk_live_restricted' }), true)
})

test('Stripe webhook adapter rejects an altered signature without publishing a payment', async () => {
  const result = await verifyPaidStripeWebhook(
    new Request('https://youbid.lol/api/webhooks/stripe', {
      method: 'POST',
      body: payload,
      headers: { 'stripe-signature': 't=1,v1=invalid' },
    }),
    { stripeSecretKey: 'sk_test_local_fixture', stripeWebhookSecret: webhookSecret },
  )

  assert.deepEqual(result, {
    ok: false,
    status: 401,
    message: 'Invalid Stripe webhook signature.',
  })
})
