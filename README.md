# Bloub Board

A public board you pay to be on: [bloub-board.alan996.workers.dev](https://bloub-board.alan996.workers.dev).

Bid a dollar or more for a product URL or `@handle`. Rank is the **current**
value of your bid, and every amount falls 3% a day, so nothing stays on top for
free. Anyone can add money to a listing; only its owner can change the text.
A three-hour first-page takeover starts at 4× the leader and falls to 1.2× over
a day. No votes, no ads, no API keys, no revenue share.

The mascot and every per-listing face are [bloub](https://github.com/jeremy-prt/bloub)
(MIT, Jérémy Perret) through [bloub-react](https://github.com/comedianhhh/bloub-react);
the faces are driven by board state, not images.

This is a fork of [Go7hic/youbid](https://github.com/Go7hic/youbid) (MIT):
same contract (3% decay, owner-only raises, falling takeover, refunds in
`/rules`), redesigned as a warm-dark serif column with the mascot.

## Stack

TanStack Start on Cloudflare Workers, D1 as the store, Stripe Checkout with
dynamic `price_data.unit_amount` (no Product/Price catalog). pnpm.

## Local

```bash
git clone https://github.com/comedianhhh/bloub-react ../bloub-react   # linked via file:
pnpm install
cp .dev.vars.example .dev.vars
pnpm exec wrangler d1 migrations apply bloub-board --local
pnpm exec vite dev --port 3010        # http://localhost:3010
pnpm typecheck && pnpm test
```

Mock checkout and `POST /api/mock/settle` run only when `APP_URL` is localhost.
For real Stripe events locally: `stripe listen --forward-to localhost:3010/api/webhooks/stripe`
and put its `whsec_` in `.dev.vars`.

## Deploy

```bash
pnpm exec wrangler d1 migrations apply bloub-board --remote
pnpm run deploy
```

Secrets go through `pnpm exec wrangler secret put`: `OWNER_COOKIE_SECRET`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Never commit `.dev.vars`.
Workers Builds notes (build/deploy commands, why secrets are not build vars)
are in upstream youbid's README and still apply; the Worker name here is
`bloub-board`.

## License

MIT, same as youbid and bloub.
