# sumptus

**Shared expenses. Simply.**

A local-first expense-splitting app for trips, flatshares, sports groups and
couples. Create a group, log what you spent, and the app answers the only two
questions that matter: who owes whom, and how few payments it takes to be square.

React · TypeScript · Vite · Tailwind · Zustand · Recharts · installable PWA.
No backend, no accounts — everything lives in the browser.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # the money math
npm run lint
npm run build      # type-checks, then builds to dist/
```

The dev server runs at the root (`http://localhost:5173/`). Only production
builds carry the `/sumpt.us/` sub-path that GitHub Pages needs — a dev server
under that prefix answers 404 for every plain URL, which looks exactly like a
missing `index.html`.

`npm run build` also writes `dist/404.html` as a copy of `index.html`, which is
how deep links survive GitHub Pages (it has no SPA rewrite, so it serves the
404 document and the router takes over from there).

## Deploying

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every
push to `main`. Enable Pages with **Source: GitHub Actions** once, and the site
appears at `https://<user>.github.io/<repo>/`.

The workflow passes `BASE_PATH=/<repo>/` so Vite emits the right asset URLs. On
a custom domain the site is served from the root, so set `BASE_PATH=/` — the
built asset URLs are absolute and will 404 otherwise. The router is more
forgiving: it reads the address bar and falls back to no prefix if the page
isn't under the path it was built for.

To check a production build the way Pages actually serves it, use a static
server without an SPA rewrite. `npm run preview` falls back to `index.html` for
unknown paths, which hides exactly the bugs this setup is meant to catch.

## How the money works

Everything financial obeys three rules, and the test suite exists to keep them
true:

**1. Integers only.** Every amount is an integer in the currency's minor unit —
`€84.00` is `8400`, `¥1200` is `1200`. Floats never touch a balance, and a
formatted string is never parsed back into a calculation. Currency precision is
metadata (`src/lib/currency`), so a zero-decimal currency needs no special cases.

**2. Splits reconcile exactly.** `allocate()` distributes a total across weights
using largest-remainder allocation: floor everything, then hand out the leftover
units to the biggest fractional remainders, ties broken by index. €100 across
three people is 33.34 / 33.33 / 33.33 — never 33.33 × 3 with a cent evaporating.
It is deterministic, so the same expense produces the same cents on every device.

**3. One debt graph.** Balances are net positions per group, and the payments
the app suggests come from `settleBalances()`: whoever is down pays whoever is
up, largest against largest. That graph is acyclic by construction, so recording
every payment it lists really does bring everyone to zero.

That last rule is the subtle one. A pairwise ledger — "you owe Alex because of
the taxi" — cannot absorb a simplified payment: if A owes B and B owes C, the
simplification is A pays C, and booking that against the A–C pair leaves A–B and
B–C untouched. The group would still show open debts after everyone was square.
Net positions have no such blind spot.

Pairwise obligations are still computed, by
`calculatePairwiseObligations()`, but only as the *descriptive* figure Smart
Settlement compares against: "your expenses created 19 direct obligations; 10
payments settle all of them."

**Settlements stay inside a group.** Two ledgers have different members, so a
Japan Trip debt is never netted against a Padel Crew one. When you settle with
someone you share several groups with, the payment is apportioned back across
those group ledgers (`allocateAcrossGroups`) and recorded as one settlement per
group — which is what keeps the group screens and the overview agreeing about
who is square.

## Structure

```
src/
  lib/calculations/   allocate, shares, balances, debt graph  ← all the money logic
  lib/currency/       precision, parsing, minor-unit helpers
  store/              Zustand state + the persistence seam
  hooks/useLedger     every derived figure the UI reads
  components/         ui, navigation, balance, expenses, groups, settlements, charts
  pages/              one folder per screen
```

Visual components never do arithmetic on money. They read derived values from
`useLedger` and render them; the calculations live in `src/lib/calculations` and
are covered by `src/lib/calculations/calculations.test.ts`.

## Swapping in a backend

`src/store/persistence/types.ts` defines the only contract the app has with
storage. Components never import it — they call actions on the Zustand store,
which updates memory first and forwards the intent to the adapter. The mutation
methods map one-to-one onto row operations, so a `SupabaseAdapter` implements the
same interface, `src/store/appStore.ts` changes one binding, and no UI file moves.

The local adapter collapses every mutation into a debounced snapshot write to
`localStorage`. Ids and timestamps are minted in the store, before persistence,
which keeps both implementations optimistic and offline-tolerant.

## Brand assets

The wordmark lives at `public/brand/wordmark.png` and is built from the source
artwork in `brand/` by `node scripts/build-wordmark.mjs`. It ships as a
greyscale+alpha mask, not a picture: `<Wordmark />` paints it with
`currentColor` and sizes it in `em`, so it inherits the surrounding text colour
and scales like type instead of needing a pixel height per breakpoint. Replacing
the logo means dropping new artwork in `brand/` and re-running the script.

## Images

Group header photos and profile pictures are stored as compressed JPEG data
URLs inside the same localStorage entry as everything else, and that entry has
a browser budget of roughly 5 MB in total.

So nothing reaches the store as picked. `src/lib/images` redraws every upload at
a bounded size and re-encodes it, stepping the quality down until it fits a hard
ceiling — 400 KB for a cover, 60 KB for an avatar. A 6 MB phone photo lands at
roughly 150 KB. Anything that still will not fit is rejected with a message,
because an upload that silently does nothing is worse than one that says no.

That leaves room for around 25 group covers. A real backend removes the ceiling;
until then it is the honest limit.

## Typography

The brief specifies **Coterie** for brand moments. It is a licensed commercial
typeface and cannot be redistributed here, so the build ships **Fraunces** in
that role — editorial, high-contrast, used sparingly on page titles and large
figures. **Raleway** carries all UI text.

Swapping in the real Coterie is a three-line change in `src/styles/tokens.css`:
drop the woff2 files into `public/fonts/coterie/`, uncomment the `@font-face`
blocks, done. `--font-display` already lists Coterie first, and no component
names a font family directly.

## What this version does not do

Worth being explicit, since the UI is complete enough to hide it:

- **No accounts.** "Continue with Apple / Google" on the welcome screen loads the
  demo data. There is no auth to hook them to yet.
- **No sync or sharing.** Friends are local records, not real users. Nobody else
  sees your groups, and the data lives in one browser on one device — clearing
  site data deletes it. Profile → Export data writes the whole store to JSON.
- **One currency per group.** Groups store their own currency, but there is no
  FX conversion, so mixed-currency groups are not supported.
- **Greedy simplification.** `settleBalances` is optimal whenever no subgroup
  happens to net to zero on its own, and never worse than n−1 payments for n
  people. The provably minimal set is NP-hard (subset-sum); every person's final
  position is identical either way.
