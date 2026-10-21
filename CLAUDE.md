# CLAUDE.md

Context and working rules for **QuickSeat**, a concert-ticketing prototype for the design-thinking course
IDEA9106 (Tutorial 28, Group 4). Read this first, then the files it points to.

## What this project is

QuickSeat answers a researched fan journey: **the queue can't be avoided, but it doesn't have to be blind.**
Fans set a ticket plan before the sale (quantity, price guardrail, 3 ranked sections, "ask me first" or
"move on automatically"), join a fair simulated queue that tracks their sections live, and are only interrupted
when their plan changes. A presale streak (daily artist trivia, readiness checklist, tips emails) keeps
pre-registered fans engaged in the 30 days before a sale.

It is a **frontend-only prototype for usability testing**. There is no real backend, payment, queue or email.

**Current state:** the fixes from the UX audit in [Knowledge/QuickSeat UX audit.pdf](Knowledge/QuickSeat%20UX%20audit.pdf)
are in (see "UX audit: status" below). Next step is the next round of usability testing.

## Key documents

| File | What it holds |
| --- | --- |
| [Knowledge/QuickSeat UX audit.pdf](Knowledge/QuickSeat%20UX%20audit.pdf) | UX audit (12 Oct 2026, @sudhamshu): 50+ findings with IDs (J, L, T, W, H, Q, D, O, P), severity and a 4-round fix plan. **The source of truth for current work.** |
| [docs/redesign-agent-instructions.md](docs/redesign-agent-instructions.md) | Original design brief: journey → pain point → feature table, ground rules, design system (tokens, Desert Chic themes), the 17 build steps, out-of-scope list. |
| [README.md](README.md) | Run commands, demo accounts, demo script, presale streak rules, file structure. |
| [docs/screenshots/presale/](docs/screenshots/presale/) | Laptop (1366×850) and phone (390×844) screenshots of the presale flow. |

The PDF is binary. To read it: `pdftotext -layout "Knowledge/QuickSeat UX audit.pdf" -` (the Read tool can't render it here).

## Commands

Node 22.18+ (24 recommended). Tests run TypeScript directly with Node's built-in runner.

```bash
npm install
npm run dev     # Vite dev server, http://localhost:5173
npm run build   # tsc -b && vite build — must pass with zero TS errors after every change
npm run lint    # oxlint
npm test        # node --test "src/**/*.test.ts" (streak rules, trivia bank, colour contrast, email safety)
```

`package.json` also has `dev:server`, `start:server` and `dev:full` scripts pointing at `server/index.ts`, and
`vite.config.ts` proxies `/api` to port 3001, but **no `server/` folder exists**. Those scripts won't run; the
app needs only `npm run dev`. Don't build a backend unless asked (it's out of scope in the brief).

Demo accounts: `customer` / `customer123`, `admin` / `admin123`.
Add `?demo=1` to a queue or hub URL for demo controls (speed, jump to next event, sold-out storyline, days-until-sale slider).

## Stack and architecture

React 19 + TypeScript + Vite 8. No router library, no state library, no CSS framework.

- **Routing:** hash router in [src/router.ts](src/router.ts) (`useRoute`, `navigate`, `isDemo`). Route switch is in
  [src/App.tsx](src/App.tsx). Routes: `#/`, `#/tour/:tourId`, `#/tour/:tourId/show/:showId/{hub|waiting|queue|seats|outcome}`,
  `#/tickets`, `#/inbox`, `#/admin`, `#/help`.
- **State:** [src/store.tsx](src/store.tsx) (auth, bookings, plans, waitlists, toasts, admin edits) and
  [src/presale.tsx](src/presale.tsx) (registrations, streaks, demo clock, nudges, inbox). Both persist to
  `localStorage` through [src/storage.ts](src/storage.ts) under the `quickseat:v2:` prefix. Bump the prefix if you
  change a stored shape.
- **Pure logic (no React, unit-testable):** [src/plan.ts](src/plan.ts) (plan wording, budget), [src/queue/simulator.ts](src/queue/simulator.ts) (deterministic,
  seeded queue + scripted storylines), [src/streak.ts](src/streak.ts), [src/trivia.ts](src/trivia.ts),
  [src/emails.ts](src/emails.ts), [src/color.ts](src/color.ts), [src/sale.ts](src/sale.ts) (sale status from
  `saleOpensAt`), [src/seats.ts](src/seats.ts).
- **Data:** [src/data.ts](src/data.ts) holds artists, arenas/sections, tours and shows. Sale times are relative to page
  load so every sale state is always demoable. [src/types.ts](src/types.ts) holds the shared types.
- **Theme:** [src/theme.ts](src/theme.ts) + [src/components/ThemePicker.tsx](src/components/ThemePicker.tsx). Tokens are
  CSS custom properties in [src/index.css](src/index.css); text colour is picked automatically for WCAG AA.
- **Global overlays** (all mounted in `App.tsx`): `LoginModal`, `RecordPlayer`, `PreRegisterModal`, `TriviaModal`,
  `Nudge` + `NudgeScheduler`, `EmailScheduler`, `Toasts`, plus `PresaleDemoPanel` on demo pages. Nudges and toasts
  must stay off the focus routes (`isFocusRoute` in `src/router.ts`); don't add new floating layers (J2).
- Pages are in [src/pages/](src/pages/), components in [src/components/](src/components/).
  [src/pages/shared.tsx](src/pages/shared.tsx) holds pieces shared between pages (e.g. notification settings).

## Ground rules (from the brief, still apply)

1. Keep the stack: React + TS + Vite, plain CSS with custom properties, no new runtime dependencies or state libraries.
2. `npm run build` and `npm test` must pass after every change.
3. Exactly three artists: Taylor Swift, BTS, Charlie Puth.
4. **Never autoplay audio.** Sound only after an explicit press.
5. Product name is QuickSeat. No Ticketmaster / Live Nation names, logos or URLs.
6. No copyrighted media in the repo (generated posters and tones only; licensed files go in `public/artists/` and `public/audio/`).
7. Accessibility is required: WCAG 2.2 AA contrast in every theme, full keyboard use, visible focus,
   `prefers-reduced-motion` respected, labelled icons. Never rely on colour alone.
8. Responsive from 360px to 1440px with no horizontal page scroll **and nothing cut off** (see P4).
9. **The streak never affects queue position.** Nothing in the simulator may read it.
10. One shared status vocabulary via `StatusBadge`; one primary action per view.
11. Match the code style: function components, small files, short comments only where the *why* isn't obvious.
12. Honest copy: never state something happened unless the system did it (audit O1, O2).

## UX audit: status

All four rounds of the audit (Oct 2026) have been worked through in code. Finding IDs are cited in code comments
(search for e.g. `(Q1` or `(D5`). Keep these fixes intact when changing screens.

| Area | What changed | Where |
| --- | --- | --- |
| Queue answer (Q1, Q2, J1) | Every section starts "Likely", so "No changes to your plan" is true. The headline names its section ("Your best chance: Section 34, choice 3, Likely") and says how the first choice is doing. The chart marks the same row. | `summarise()` in [src/queue/simulator.ts](src/queue/simulator.ts), [src/pages/QueuePage.tsx](src/pages/QueuePage.tsx) |
| One progress visual (Q3, Q4, Q5, J4, Q7) | Music-note track and plan table removed. Chart bars coloured and labelled by meaning (should last / close call / runs out before you / gone), "N left" in each row. Banner shows only changes; the headline shows only current state. | [src/components/QueueChart.tsx](src/components/QueueChart.tsx) |
| Freshness and layout (Q6, Q8, Q9, J7) | "Updated just now" / stale warning; Leave queue next to the number; the artist story is collapsed below the queue. | `Freshness` in QueuePage |
| Your turn and checkout (D3, D4, D5, D7, D8, P4) | Hold timer counts from `turnAt` (when your turn started), shown as "Seats held for" instead of "At risk". It sits next to Pay, with a sticky timer and Pay bar on phones. Picked seats are labelled in the grid. Ticket count can be changed. The map fits a 390px screen. | `HOLD_SECONDS` in [src/sale.ts](src/sale.ts), [src/pages/SeatsPage.tsx](src/pages/SeatsPage.tsx) |
| Map states (T2, J3, D6, T5) | Each block has a kind (`sold-out`, `cant-seat`, `over-budget`, `swap`, `outside`) with its own look and visible label. The arena is drawn as tiers around the stage. | [src/components/ArenaMap.tsx](src/components/ArenaMap.tsx) |
| Plan setup (T3, T4, T6, T7) | Three steps: tickets and budget (no limit by default, price range shown), then sections with "If my first choice sells out…" beside the list, then a review screen ending in "Save and join the queue". | [src/components/PlanModal.tsx](src/components/PlanModal.tsx), [src/plan.ts](src/plan.ts) (`maxPricePerTicket: 0` means no limit) |
| Decision pop-up (D1, D2) | Both options side by side with status, price and tickets left; the safer pick is highlighted; leaving needs a confirm. | `DecisionModal` in QueuePage |
| Overlays (T1, W1, O3, P1, P6, J2, P2, P5) | No nudges or toasts on waiting / queue / seats / outcome routes (`isFocusRoute` in [src/router.ts](src/router.ts)). The record player has no floating tooltip and tucks away while scrolling on phones. Toasts show one at a time at the top on phones. The demo panel collapses. | Nudge, Toasts, RecordPlayer |
| Honest outcomes (O1, O2, O4, O5, O6, O7) | The waitlist is offered ("You can hold…") until it's held. "Tell your group" is an action, not a claim. The summary says what sold out and where you were in line (`lossStory()`). Headline and next steps come before the map. QR codes are marked "Sample". | [src/pages/OutcomePage.tsx](src/pages/OutcomePage.tsx), [src/components/TicketCard.tsx](src/components/TicketCard.tsx) |
| Alerts (W2, W3) | "Want an alert if your plan changes?" is asked once, then becomes a small Alerts control. The plan card lists each section with its price. | `AlertsControl`, `PlanCard` in [src/pages/shared.tsx](src/pages/shared.tsx) |
| Landing and login (L1–L6) | A slim dismissible banner replaces the login modal on arrival. The modal close button is top right, there is an equal-weight "Not now" button, and demo credentials show only with `?demo=1`. The carousel opens on the most urgent sale and never rotates away from a live countdown. Cards don't repeat poster text. | [src/pages/Landing.tsx](src/pages/Landing.tsx), [src/components/LoginModal.tsx](src/components/LoginModal.tsx) |
| Tour, hub, streak (T8, T9, H1, H2, W4) | One primary button per show, with the plan as a link. The card step is optional and doesn't count toward "ready". The checklist lives in the hub for registered fans and is linked from the tour page. The streak is a week grid with day numbers. The story is a labelled timeline, not a waveform. | TourPage, ReadinessChecklist, StreakStrip, StoryTimeline |
| Identity (J6) | Per-artist poster motifs (era bands, seven stage lights, piano keys), ticket-stub tour cards, stage-light hero. | [src/components/Poster.tsx](src/components/Poster.tsx), end of [src/index.css](src/index.css) |

Rules for these are tested in [src/queue.test.ts](src/queue.test.ts). Partly addressed and worth revisiting in Figma: J6 (the
identity is lighter-touch than a full rebrand), T5 (tiers are CSS shapes, not a true curved venue), and O1 (there is
no squad model, so the app never claims a group was told).

**Keep (the audit says these work):** honest, plain-language copy; the decision pop-up's 60-second default;
"Your place is random and fair"; the never-a-dead-end sold-out concept; the "How QuickSeat works" strip.

## How to work on this

- Before changing a screen, run the demo journey for it (README "Demo script") at **1440px and 390px**. The audit
  was done at both, and many findings are phone-only.
- Exercise both queue storylines (`?demo=1` → "Use sold-out storyline") and every event, since several bugs only
  appear mid-queue.
- Keep queue logic in the simulator and copy/presentation in pages. If a status rule changes, change it in
  `simulator.ts` (pure, testable) rather than patching text in the page.
- Add or extend `node:test` tests in `src/*.test.ts` for any rule change to pure modules. Modules that tests import
  use `.ts` on value imports (e.g. `import { seeded } from './seats.ts'`).
- A visually hidden `<table>` must sit inside a `div.visually-hidden`; on the table itself it widens the page on phones.
- When a fix changes the demo flow, update [README.md](README.md) so the script still works.
- Artist facts in `src/data.ts` and trivia marked `// VERIFY` in `src/trivia.ts` need checking before presenting.
