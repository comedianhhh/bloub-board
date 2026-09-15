# Launch copy

Every post leads with the mascot moving. The board is the mechanic; the face is the hook.

## Checklist before any of this goes out

- [ ] `STRIPE_SECRET_KEY` set on the Worker (`wrangler secret put`), live key once Stripe approves the account
- [ ] Stripe business verification approved (otherwise visitors cannot pay)
- [ ] 5–6 of your own listings on the board, paid for real ($1–3 each)
- [ ] Footer / README credit: "Forked from youbid (MIT)"
- [ ] 15-second clip: paste URL → three dots → face appears → Pay → Stripe → receipt wink → row on the board

## 1. Message to Jérémy (bloub author) — GitHub issue on jeremy-prt/bloub

**Title:** bloub is the mascot of a live site now — thank you

**Body:**

Hi Jérémy — I ported `src/bot/` to React (`bloub-react`, engine copied verbatim, MIT attribution kept) and used it as the mascot of a small paid leaderboard: https://bloub-board.alan996.workers.dev

The face reacts to what the board is doing: three dots while it reads your URL, wide eyes when you raise the bid, the notify pastille while Stripe Checkout is open, a wink on the receipt. Each listing gets its own shape/ink/expression from a hash of its URL, and rows about to drop off go `somnolent`.

Two things I ran into that might interest you:
- `orbit` is a one-shot (rings settle after ~3.4 s), so for a "busy" state I loop a small montage `[orbit, thinking, play]` instead.
- The engine runs fine in a Cloudflare Worker with no DOM — I render the favicon/og image from `sample(t)` at build time.

If you'd ever want `src/bot/` published as a standalone package I'd happily send a PR; for now bloub-react vendors it. Feel free to close this, just wanted you to see it.

## 2. X / Twitter

**Post (with the clip attached):**

I gave a paid leaderboard a face.

Every listing on Bloub Board costs $1+, and every amount falls 3% a day — so the board shows what people are paying *now*, not what they once paid.

The mascot is @worlz_'s bloub: it thinks while reading your URL, goes wide-eyed when you raise, and winks when Stripe settles.

bloub-board.alan996.workers.dev

**Reply to self:**

Stack: TanStack Start on Cloudflare Workers + D1, Stripe Checkout with per-bid line items, zero fixed cost. Forked from youbid (MIT) — the redesign and the mascot wiring are mine. Code: [repo link once pushed]

## 3. Show HN

**Title:** Show HN: A paid leaderboard whose mascot shows what the board is doing

**Text:**

Bloub Board is a public leaderboard you pay to be on: $1 minimum for a product URL, rank follows your current balance, and every balance decays 3% a day. Nothing appears until Stripe's webhook confirms the payment; a refund removes the row.

The part I actually enjoyed building is the mascot. It's bloub (github.com/jeremy-prt/bloub), an SVG recreation of the x.ai bot avatar measured frame-by-frame off the reference video. The engine is a pure function of time, so I could drive it from page state: thinking while /api/resolve scrapes your URL, wide eyes on each "+", the notification pastille while Checkout is open in another tab, a wink on the receipt. Listings get a deterministic face from a hash of their URL; rows under $2 doze off.

Because the engine has no DOM dependency it also renders the favicon and og image inside the build on Cloudflare Workers.

Stack: TanStack Start, Workers, D1, Stripe Checkout with dynamic price_data. Forked from youbid (MIT, itself inspired by outbid.lol); the redesign and mascot integration are new. Fixed cost is $0.

Happy to answer questions about the decay math, the webhook-only settlement rule, or the React port of the engine.

## 4. Reddit (r/SideProject, r/indiehackers, r/webdev — one per day)

**Title:** I gave a paid leaderboard a mascot that reacts to what you're doing

**Body:**

Weekend project. Bloub Board is a public board where a listing costs $1+ and every amount falls 3% a day, so it's always showing who's paying now.

The mascot is the open-source bloub avatar — it thinks while the site reads your URL, gets wide-eyed when you raise your bid, and winks when payment settles. Each listing gets its own little face too.

Runs on Cloudflare's free tier + Stripe, so it costs nothing to keep up.

Link: https://bloub-board.alan996.workers.dev — would love feedback on the decay mechanic.

## 5. 中文圈（即刻 / V2EX 分享创造）

**标题：** 给一个付费榜单做了个会变脸的吉祥物

**正文：**

周末做的小站：Bloub Board。上榜 $1 起，排名按你出价的"当前价值"，每天掉 3%，所以榜上永远是现在还在付钱的人。

吉祥物是开源的 bloub（x.ai 那个球的 SVG 复刻）：读你的 URL 时变三个点，加价时瞪眼，Stripe 付完眨眼。每个条目也有自己的小脸。

Cloudflare 免费层 + Stripe，零固定成本。规则全在 /rules。

https://bloub-board.alan996.workers.dev
