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
npm test        # streak, trivia, colour contrast, email safety, queue wording, game, CAPTCHA, device reset (node:test)
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

> **Every login and every logout clears all QuickSeat data in this browser** (tickets, plans, waitlists, streak
> progress, inbox, accounts created with Sign up, theme, preferences and best game score) and starts again from the
> demo defaults. So book and check out within one session, and expect a fresh start each time you log in.

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

### Note Runner and CAPTCHA demo

1. Open **Log in**: under the password is a distorted code to type (**New code** for another, **Listen** to hear it).
   Type it wrong and you get a fresh code; type it right with a wrong password and you need a fresh code too. Then use
   `customer` / `customer123` with the code.
2. Open BTS → Perth → **Join queue** and wait: once the queue has moved about 200 places, a pointer suggests Note
   Runner. **Take me there** scrolls to the game; press **Play** and the record starts spinning with the
   soundtrack. Jump with Space, tap or click.
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
- **Text CAPTCHA at login and sign-up:** type six distorted characters (wavy, mixed fonts, noise and strike lines;
  no look-alikes like 0/O or 1/I; capitals and spaces don't matter). **New code** draws another; **Listen** reads it
  aloud phonetically for people who can't see it. It's checked before the password, every attempt needs a fresh code,
  codes expire after 2 minutes, and five wrong passwords pause login for 30 seconds. This is a prototype of the step:
  the code lives in the page, so production must generate and check it on a server (or use Cloudflare Turnstile or
  hCaptcha). See `src/human.ts` and `src/components/Captcha.tsx`.
- **Queue page layout:** the people-ahead count and your best chance sit side by side, with your music note moving
  along the queue just below; Note Runner comes next so it's in view on arrival, and the artist story is last. The
  "Want an alert if your plan changes?" question is a small pop-up at the top rather than a row in the page.
- **Queue page touches:** tap the moving note track to jump to "Your sections along the queue" (tickets left and
  outlook for choices 1 to 3); every click or tap on the queue page pops a little musical note (off with reduced
  motion); in Note Runner the note has blinking eyes and little legs that run and tuck up mid-jump.
- **Note Runner nudge:** once the queue has moved about 200 places, a "While you wait, play Note Runner" pointer
  pops up above the game. **Take me there** scrolls to it and highlights it. It shows once per session, never during
  a fresh alert or a decision, goes away by itself after 25 seconds, and not once the game has been started.
- **Installable app (PWA):** add QuickSeat to a phone's home screen and it opens full screen like an app, works
  offline once visited, and keeps clear of notches. Chrome/Android/desktop show **Install the QuickSeat app** in the
  footer; on iPhone the footer explains Safari's **Share → Add to Home Screen**. Files: `public/manifest.webmanifest`,
  `public/sw.js`, `public/icons/`, `src/pwa.ts`. Installing needs the hosted (https) site: it doesn't apply to the
  double-click file.
- **Clean device at every login and logout:** all QuickSeat data in the browser (localStorage, sessionStorage and
  Cache Storage, plus everything held in memory: the queue in progress, music, theme) is cleared and reset to the
  demo defaults. Only the account that just logged in is kept, so a new sign-up still works. Other sites' data on the
  same origin is untouched. The browser's own HTTP cache can't be cleared from page code (it needs a server sending
  `Clear-Site-Data`), so it isn't. See `src/reset.ts`, tested in `src/reset.test.ts`.
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
