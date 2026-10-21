# QuickSeat

A concert-ticketing prototype for IDEA9106 (React + TypeScript + Vite, frontend only). It's built around a researched
user journey: **the queue can't be avoided, but it doesn't have to be blind.** Fans set a ticket plan before the sale,
join a fair simulated queue that tracks their sections live, and only get interrupted when their plan changes.

The full design brief and build steps are in [docs/redesign-agent-instructions.md](docs/redesign-agent-instructions.md).

## Run

Requires Node 22.18+ (24 recommended; the tests run TypeScript directly with Node's built-in runner).

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # streak, trivia, colour contrast, email safety, queue wording, game and human check (node:test)
```

Open http://localhost:5173.

### Opening it without a dev server

The root `index.html` is Vite's source entry: it loads `src/main.tsx`, so opening it directly shows a blank page.
Run `npm run build` instead and open **`dist/index.html`**. It's one self-contained file (scripts and styles inlined,
relative paths), so it works by double-clicking and can be sent to anyone. Every push to `main` also publishes it to
GitHub Pages (`.github/workflows/deploy.yml`).

## Demo accounts

| Role     | Username | Password    |
| -------- | -------- | ----------- |
| Customer | customer | customer123 |
| Admin    | admin    | admin123    |

## Demo script

Sale times are relative to page load, so every sale state is always available:

| Show | State |
| --- | --- |
| Taylor Swift · Sydney | Waiting room open, queue opens **2 minutes** after load |
| Taylor Swift · Brisbane | Sold out (waitlist) |
| BTS · Perth | Queue open now |
| BTS · Melbourne | Presale in 3 days. The demo customer is pre-registered here with streak history |
| Charlie Puth · Melbourne | On sale, no queue |
| Charlie Puth · Sydney | Announced (12 days) |

1. Land on the homepage: a slim "New here?" banner offers Log in / Sign up without blocking anything. Dismiss it with ×.
2. Open the palette icon in the navbar and try **Earth Red**, then **Sand**: the navbar text switches to dark automatically.
3. Open **Permission to Dance: Australia** → Perth → **Join queue**. Log in as `customer` when asked (add `?demo=1`
   to the URL to see the demo credentials in the form); the plan opens straight away in three steps:
   2 tickets with **No limit** on budget → rank Floor B, Section 12, Section 34 and choose **Ask me first** →
   review → **Save and join the queue**.
4. Answer **Want an alert if your plan changes?**, tap the record in the bottom-right for an opt-in soundtrack, and
   open **While you wait: the BTS story** below the chart.
5. Add `?demo=1` to the URL (e.g. `#/tour/ptd-australia/show/ptd-per/queue?demo=1`) for demo controls: speed ×1/×10/×50,
   jump to the next event, or restart with the sold-out storyline.
6. Answer the decision pop-up when a section sells out (it compares both options side by side), reach
   **It's your turn**, and check out before the seat hold runs out (8 minutes from when your turn started).
7. Re-run with the sold-out storyline to see the waitlist outcome.

### Note Runner and human check demo

1. Log out, open **Log in**, type `customer` and a wrong password: Log in stays disabled until you tick **Verify you're
   human**. Get the password wrong twice and the check comes back as a picture puzzle; solve it, then use `customer123`.
2. Open BTS → Perth → **Join queue**. Scroll to **Note Runner** and press **Play**: the record starts spinning and
   the soundtrack plays. Jump with Space, tap or click.
3. With `?demo=1`, press **Jump to next event**: the game pauses and names the plan change. Reach your turn and the
   game is gone.

### Presale streak demo

1. Log in as `customer`. A daily nudge appears after a few seconds (top right): **Open question**.
2. Open the account menu → **Pre-sale hub: BTS · Melbourne**, or go to
   `#/tour/ptd-australia/show/ptd-mel/hub?demo=1` for the demo bar.
3. Use the **Days until sale** slider (30 → sale day). It moves only the streak, hub and email clock; the queue demo
   above keeps its real sale times.
4. Buttons: **Send today's nudge**, **Answer correctly**, **Answer wrong**, **Let timer run out**,
   **Fill sample history**, **Reset streak**.
5. Slide to 7 and 1 day(s), and into the last hour (0), to "send" the tips emails, then open **Inbox** from the
   account menu. Admins can also send any template from **Admin → Send a test email**.
6. At 0 days the hub shows the **You're ready** handoff with one **Enter waiting room** button.
7. To pre-register from scratch, open Charlie Puth → Sydney → **Pre-register**.

## Presale streak

For the 30 days before a sale (`PRESALE_WINDOW_DAYS` in `src/streak.ts`), pre-registered fans get one artist question a day.

| Outcome | Day colour | Also shown as | Counts toward streak |
| --- | --- | --- | --- |
| Correct within 20 s | Green | Tick, "Correct" | Yes |
| Wrong answer | Orange | Dot, "Tried" | Yes (for attempting) |
| Time runs out | Orange | Clock, "Time's up" | Yes (`TIMEOUT_COUNTS_AS_ATTEMPT = true`) |
| No attempt that day | Grey | Dash, "Missed" | Breaks the streak |

Rules (all in `src/streak.ts`, covered by `src/streak.test.ts`):
- **The streak never changes queue position.** Nothing in `src/queue/simulator.ts` reads it, and the UI says so.
- The 20-second clock starts when the question is first shown and is saved, so refreshing, closing the pop-up or
  switching tabs doesn't reset it.
- One attempt per day. A served question is consumed even if the fan leaves; an unanswered one becomes "Time's up".
  This is the anti-cheat measure, along with per-fan question order and per-fan option shuffling from a 31+ question
  bank per artist (`src/trivia.ts`). In production the clock and scoring would run on the server.
- Days before a fan registered show as "before you joined", not missed. An unanswered today doesn't break the streak
  until the day ends.
- Skip tokens exist behind `ENABLE_SKIP_TOKEN = false` (one per week, off).
- Streak colours are fixed across themes and tested for contrast and for distinctness from every Desert Chic accent.

Routes: `#/tour/:tourId/show/:showId/hub` (pre-sale hub) and `#/inbox` (simulated email).

### Tips emails

Templates in `src/emails.ts`: **7 days** (stay logged in, save your card, know your local sale time), **1 day**
(final checklist and "don't refresh once in the queue") and **1 hour before** (waiting room opens soon). They use the
fan's name, streak and readiness, give the sale time in the fan's time zone with venue time in brackets, link back
into the app, and always say "We will never ask for card details by email." They never contain a form.

Nothing is sent: emails are stored in the in-app inbox. To use a real provider, move `EmailScheduler`'s checks to a
server job that runs on the same day-7 / day-1 / hour-before rules, render `buildEmail()` there, and send the
`html` and `text` parts through a provider such as Postmark, SendGrid or Amazon SES. Keep links pointing at the app.

## Features

- **Landing page:** hero carousel with live countdowns, poster tour cards with status badges, city filter, search,
  "How QuickSeat works".
- **Login:** a soft, dismissible welcome pop-up, plus login asked for only when an action needs it (then it resumes
  that action). Sign-up has validation and a strength meter.
- **Tour page:** dates in your time zone (plus venue time), ticket plan (quantity, price guardrail, 3 ranked sections on the
  arena map, "ask me first" vs "move on automatically"), ready-to-buy checklist, artist story preview.
- **Waiting room → queue → your turn → outcome**, modelled on the reference screens: people ahead, best-chance sentence,
  one alert at a time, sections-along-the-queue chart, plan table, decision pop-up with a 60s timer, pre-picked best seats,
  checkout timer, success tickets with calendar download, or sold-out waitlist / face-value resale.
- **Note Runner (while waiting only):** a small endless runner in the waiting room and the queue. Your music note hops
  over instruments (drums, guitars, trumpets, pianos, metronomes, maracas) and collects bonus notes; tap again in the
  air for a grace-note hop. Pressing **Play** also starts the record player (toggle: "Play the soundtrack while I play"),
  and with music on, instruments arrive on the beat. A plan change pauses the game with the reason; at your turn the
  game disappears. Best score is kept in this browser. Rules in `src/game/noteRunner.ts`, tested in `src/game.test.ts`.
- **Queue note track:** your note hops along a music staff on top of the queue chart, on the chart's own scale, so it
  reaches the front line exactly when you do. A compact version rides in the floating tracker.
- **Human check at login and sign-up:** "Verify you're human" passes people quickly; scripts, and anyone after two
  wrong passwords, get an instrument picture puzzle ("Select both drums"). Five wrong passwords pause login for 30
  seconds. This is a prototype of the step only: a browser-side check can be bypassed, so production should use a
  server-verified service (Cloudflare Turnstile or hCaptcha). See `src/human.ts`.
- **Record player:** never starts on page load. Tapping it, or pressing Play in Note Runner, plays a generated mood loop for the artist (original tones, not
  recordings), with volume, next, minimise, and a Spotify embed for the real songs. It pauses itself at your turn.
- **Alerts:** soft chime (Web Audio) and optional browser notifications; the tab title shows your progress.
- **Themes:** white base, black navbar by default, switchable to the Desert Chic palette (Orange Rust, Honey Ginger,
  Sand, Earth Red, Sandstone). Text colour is picked automatically for WCAG AA contrast, and colours that can't reach it
  are darkened slightly. Optional "Match the artist" mode.
- **Presale streak:** pre-registration (push, email, quiet hours), a daily 20-second trivia question, a 30-day
  streak strip, a readiness checklist, daily nudges, simulated tips emails and a sale-day handoff (see above).
- **My tickets** and **Admin** (edit tours, posters, sale times, sold-out flags, add/delete shows, bookings, reset demo data).

## Adding real media

- Posters: put licensed images at `public/artists/<artistId>.jpg` and set the poster URL in Admin (or `posterUrl` in
  `src/data.ts`). Without one, a generated poster is used.
- Audio: put licensed or royalty-free clips in `public/audio/<artistId>/` and set `clipUrl` on a milestone in
  `src/data.ts`; the story timeline then offers "Play a snippet" through the record player.

## Structure

- `src/data.ts`: artists (bios, milestones), arenas and sections, tours, shows
- `src/store.tsx`: app state (auth, bookings, plans, waitlists, admin edits) saved to localStorage
- `src/queue/simulator.ts`: deterministic queue simulation and storylines (no React)
- `src/presale.tsx`: registrations, streak records, demo clock, nudges and the simulated inbox
- `src/streak.ts` (pure rules) and `src/trivia.ts` (question bank); `src/emails.ts` (email templates)
- `src/plan.ts`: plain-language plan wording and the budget rule (0 = no limit), shared by every screen
- `src/color.ts`: DOM-free colour maths and streak colours; `src/theme.ts`: theme engine
- `src/audio.ts`: record player, chime and notifications
- `src/sale.ts`: sale status rules; `src/actions.ts`: what each status's button does; `src/router.ts`: hash router
- `src/pages/`: Landing, TourPage, PresaleHub, WaitingRoom, QueuePage, SeatsPage, OutcomePage, MyTickets, InboxPage,
  AdminPage, HelpPage
- `src/components/`: Navbar, ThemePicker, Poster, StatusBadge, Countdown, ArenaMap, PlanModal, QueueChart,
  StoryTimeline, RecordPlayer, LoginModal, Modal, Toasts, TicketCard, ReadinessChecklist, PreRegisterModal,
  TriviaModal, StreakStrip, StreakSummary, Nudge, EmailScheduler, PresaleDemoPanel
- `docs/screenshots/presale/`: laptop (1366×850) and phone (390×844) screenshots of the presale flow

Artist facts in `src/data.ts` and trivia marked `// VERIFY` in `src/trivia.ts` should be double-checked before presenting.
