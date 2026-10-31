# Windaday — handover (2026-10-31)

## Who / how
- Owner: **Suly**. Not technical. Windows PC + Samsung Android phone.
- Wants: very short, simple, structured replies; visuals/design options when choosing; minimalist, clean, bold, modern UI; consistent design language.
- **Always fix bugs you find without asking.**
- **Always say at the end whether the tests passed.**
- Suly answers in chat and can't see artifact comments. Screenshots from the phone are the main bug reports.
- Testing policy (agreed 2026-10-27): small UI changes → run only the related spec files + a screenshot check; risky changes (data, sync, saving, new features, shared code) → full suite; "go live" → the pipeline runs the full suite anyway. Say which tests you ran.
- Quick small tweaks (a colour, a text, one style): no QA sweep and no full suite — just the related spec file(s) + one screenshot (Suly, 2026-10-29).

## Repo / workflow
- Repo `slymnblk-dev/blitzit-desktop`. Work on **`dev`** only. Never push to `main` directly.
- Build: `src/index.html` + `src/css/*.css` + `src/js/*.js` are concatenated in sorted order into `web/index.html` by `node tools/build.mjs` (one shared scope; later files wrap earlier functions by reassigning them, e.g. `render`, `drawGoal`, `mxSave`, `rhythmSide`).
- After every change: bump `APP_VERSION` in `src/js/01-boot-data.js` **and** `blitzit-vNN` in `web/sw.js` (same number) → build → tests → commit (with the attribution lines) → push `dev`.
- Tests: `(node tests/server.mjs > /dev/null 2>&1 &)` then `PW_CHROMIUM=<chromium path> npm test` (or `npx playwright test tests/<file>.spec.mjs`). Kill the server after: `pgrep -f "node tests/serve[r]" | xargs -r kill`.
- Test copy for Suly: https://slymnblk-dev.github.io/blitzit-desktop/ (from `dev`).
- **Go live** only when Suly says "go live": `gh workflow run pipeline.yml --ref dev -f go_live=true` (in a cloud session without `gh`: the GitHub Actions tool, workflow `pipeline.yml`, ref `dev`, input `go_live=true`), watch it (~12 min), then check `git ls-remote origin main dev` shows the same commit. Netlify charges credits **per deploy**: batch changes into one go-live (two steps would cost more, not less). The desktop app builds only when `src-tauri/` or `RELEASE_NOTES.md` changed (~8 min, publishes a GitHub release that installed apps pick up).
- Don't touch the shared `AppData\Local\Blitzit` folder; don't change security settings on Suly's PC; never put secrets in code (GitHub secrets are Suly's).
- Design options go on the Claude Design canvas (artifact "Habits & Goals pages"); re-read `project/canvas.json` from the artifact before publishing, the editor re-saves it.

## State
- **Live = dev = 0.253** (commit `e1d1299`, gone live 2026-10-31). Desktop app **0.6.7** live (opens full screen the first time). Full suite: 149 + new specs, all passing at the last full run; every go-live re-runs it.
- Preview artifact for Suly (built from `web/index.html`): https://claude.ai/artifact/BYn4rb2GZxgnG8WSTwUR8R — rebuild with `python3 <scratchpad>/tools/preview.py web/index.html <out>.html` (scratchpad tools don't survive a new session; the test copy on GitHub Pages does).

## What landed recently (newest first)
- 0.253 **Beta** (`08zw-beta.js`): Settings → Modes folds KPIs & OKRs, Wins, Routines, Plan and Journal into a "Beta · Try new modes" group, folded each time Settings opens (stays open while you toggle). Their page titles show a Beta badge (CSS ::after in 19-consistency.css). Tests that click inside a beta card open the group first (`[data-btgrp]`).
- 0.252 Focus (classic, phone and computer): the task, steps and timer sit as one centred block (`justify-content:safe center` in 19-consistency.css). The old auto margins needed "Up next" shown last; with steps it was hidden and everything sank to the bottom. Ticking steps never moves the timer; switching to three-at-a-time settles the block once.
- 0.251 Fix: the reminder card's bottom edge peeked out under the phone status bar on every page (now fully hidden until it shows). The phone status bar takes the colour of Focus, Tide and a playing routine (`08zv-statusbar.js`).
- 0.250 **Mode extras.** Plan: Today | Tomorrow switch (tomorrow offers Today + This week tasks, starts at the day's start; a This week task placed for a day moves to Today when the day comes, `pnRoll`); "Move to tomorrow" in a block's menu; **Import a calendar** = an .ics file (Google/Outlook/Apple export): today's and tomorrow's timed events, daily/weekly repeats, become busy blocks with `cal:1`, re-import replaces; all-day skipped; TZID times read as local. Not a live calendar sync (that needs Google sign-in set up with keys Suly manages). Resize: drag a block's bottom edge (`.pn-rs`, 15-min steps); a task's length is its estimate. Routines: Reminder Off/At time, Counts as a habit (creates a habit `r.habit`, ticked when the routine finishes), next routine card on Home from 30 min before (Settings → Modes → Routines → Next routine on Home, `rtHome`). Journal: link the morning line to a Today task (tick when done), search (highlights), Evening reminder (`jRem`, `jRemAt`). **Reminders** `08zu-reminders.js`: in-app card + system notification when allowed and in the background; once a day per device (localStorage `wd-rem`), Later = 10 min. Only while the app is open (phones) or running/in the tray (computers); real push needs a push server.
- 0.249 **Journal** mode (Settings → Modes, off by default): `08zt-journal.js`, `24-journal.css`. One entry per day in `S.journal` [{id,d,am,pm,mood 1–5,en:[{at,v 1–3}]}] synced (key `j`; boot repair merges two entries for the same day), backed up, undoable (Clear this day). Typing saves quietly (no Undo toast). Mood colours coral (Great/Good/OK) to lavender (Meh/Low), class prefix `jm-` (plain `.ok` is taken). **Energy** is an optional part (`S.cfg.jEnergy`, a sub-toggle in the Journal card): Low/OK/High check-ins, "Your usual day" line chart, best two hours (needs 3+ check-ins in the window) and the afternoon dip. Phone: tab, + jumps to today's line. Computer: month calendar + energy left, the day + Earlier right; click a day to edit it.
- 0.248 **Phone tab bar: Home + up to 3** (`08zz-tabs-pick.js`, must stay the last tab-bar wrapper). `S.cfg.tabs` = picked keys (unset: first three in order). Settings → Appearance → Tabs (tiles, "2 of 3", a 4th is refused with a toast). Turning a mode on adds its tab while there's room. Modes without a tab: a Modes button (4 squares) on phone Home lists them + "Choose tabs"; their pages show Back (`body.tb-off`).
- 0.248 **Plan** mode (time blocks, Settings → Modes, off by default): `08zs-plan.js`, `23-plan.css`. Task place on the task: `t.pl={d,s}` (minutes); busy blocks `S.blocks` [{id,t,d,s,len,rep}] synced (key `b`), old ones dropped after 14 days unless every day. Auto-plan: unplaced Today tasks, biggest impact first, from now, around busy and placed blocks, within the day's hours (Modes card: Your day 8:00 to 20:00). Phone: tab, "Not placed" tray, tap block (Focus, Earlier/Later 15 min, Open, Take off) or empty hour (place a task / busy time). Computer: To place / Placed lists, drag onto the timeline (chips are divs: Chromium won't drag a button), Focus pill on the current block.
- 0.247 **Task Impact** (Settings → Tasks → Impact: Off / Small · Medium · Big (default) / 1 to 5). Stored as `t.imp` 1–5 (levels map Small 1, Medium 3, Big 5; shown as Small ≤2, Medium 3, Big ≥4). Violet (`--imp`, `21-impact.css`), never coral or priority colours. Detail pill + picker (3 cards with sparks, or 5 circles); rows show sparks or the number, a violet edge for Big, "Quick win" when Big and ≤30m. **Automatic order, no sort UI**: biggest impact first, then priority (`ordRank` in `02-tasks-render.js`, used by `priSorted`, `bySpaceOrder`, Focus queue, drag hint). Big-impact tasks are highlights in Wins. Repeating tasks keep their impact.
- 0.247 **Routines** mode (Settings → Modes, off by default): `08zq-routines.js`, `22-routines.css`. `S.routines` [{id,name,e,steps:[{id,t,m}],days,at,log,created}] synced (key `r`), backed up, undoable. Phone: Routines tab (list → editor view with Back; + makes a new routine). Computer: sidebar under Modes, list left + editor right. Empty state offers 3 templates. Up next card (soft coral, round coral Start). Play: full-screen coral, one step at a time, timer, pause, skip, Done · next step, focus sounds; finishing logs the day (streak, rest days don't break it) and lands in Wins as "Routine: …".
- 0.246 **Wins** mode (Settings → Modes, off by default): `08zp-wins.js`, `20-wins.css`. Auto wins from done tasks (and goal milestone tasks), habit streak milestones (3, 7, 14, 21, 30…), milestones, goals achieved, won days (logged in `S.wins` kind 'day' when the last Today task is ticked); your own wins in `S.wins` kind 'mine' (synced key `w`, backup, undo). Phone: Wins tab (+ adds a win). Computer: sidebar under Modes. Week reel dialog. Tests: `tests/wins.spec.mjs`.
- 0.241–0.245: consistency pass (design system below), desktop Habits grid, Inbox sort + redesign (capture first), calmer Home hero, ink + button.
- 0.228 Phone Home: Settings → Appearance → **On Home show: Spaces / Lists**. Lists view = every list grouped under its space, one tap opens it (`homeSpaces()` in 02-tasks-render.js, `[data-hlopen]` in 09-spaces.js).
- 0.227 Today card (phone) no longer shows "+N more".
- 0.226 Phone tab bar: **Floating** pill (default, coral + on its own) or **With labels** (`navStyle`, 08p-tabs.js + 12-phone.css).
- 0.225 Goal page "Measured by" = calm list rows; KPIs/OKRs can live in **no space** (`space:null`, shown as "No space"; helpers `mxSpOk`, `mxSpEq`, pick value `'none'`); New KPI / New OKR for this goal.
- 0.224 Metrics page: **List** (default, space filter) and **By space** views, one "+ New" (08y-metrics2.js). Desktop sidebar groups Habits, Goals, Metrics under **Modes**.
- 0.223 Task rows show KPI/OKR as icons only; clearer picker; gauge button wears a progress ring that glows and floats "+N" (08x-mx-polish.js).
- 0.222 Goals ↔ KPIs/OKRs: Measured by links, New OKR from goal (milestones → key results), finish lines (`m.fin`), goal mini-tasks can add to a KPI (08w-goal-metrics.js). Desktop Home: **Bento** (default) and **Calm column** (08u-home-desk.js). Metrics page + sidebar item (08v-metrics.js). Mark milestone done button reworked.

## Design system (agreed with Suly, 0.241 — keep new work on it)
- Overrides live in `src/css/19-consistency.css` and `src/js/08zn-consistency.js`.
- Text sizes: 12 label · 13 meta · 15 body · 17 row title · 20 · 24 card title · 28 · 34 · 44 · 56 page name (computers) + big display titles. No half sizes.
- Weights: 500 regular, 600 semibold, 800 heavy (the font only loads these three; 700 renders as 800).
- Corners: 8 chips · 14 rows/fields · 20 cards · 28 hero/sheets · round for pills and circles. Tiny bars/dots keep 2–6.
- Buttons: large 56 (bottom actions, hero action) · medium 44 (actions in a card) · small 36 (row/empty-card actions) · round icon buttons 40.
- Completing: the main "finish" action is a coral pill with a tick (`var(--win-today)`); quick inline "Done" on rows is ink. Every tick you make is coral; green is only for switches and the Done stage's label.
- Page header: small uppercase label (`.pg-eye`) + big name + one summary line. Home's summary reads like a list's ("6 tasks today  3h 40m planned").
- Adding: in a list, a "+ Add …" row with a light ring around the +; on an empty card, one soft pill (`--surface2`). Typing fields keep their field.
- Round buttons: Back top-left, close and ⋯ top-right, 40px, filled. Tab pages (Inbox, Habits, Goals) have no Back on phones while the tab bar shows; pages you drill into always do.
- Phone header inside a space: Back · space switcher · search · ⋯ (KPIs & OKRs, Profile & settings).
- Colours with a job: coral = completing, Focus and the one main action; violet (`--imp`) = Impact only; mood calendar coral → lavender; green only for switches in Settings. Beta badge = soft coral pill.
- Options/mockups first for any visual decision (Suly picks), then build. Protect the hero designs (The climb, Path, Poster).



## How the newer pieces fit (read before touching them)
- Modes are optional (`S.cfg.<mode>`), each one file that wraps shared functions: `rhythmSide` (desktop sidebar), `tabsList`/`tabNow`/`tbGo` (phone tabs), `modesPage` (Settings → Modes card), `render`/`renderDesk`, `applySettings`, plus `ESC_PAGES.<pageId>`. Copy the Wins/Routines/Plan/Journal pattern for a new one.
- Order matters (files concatenate by name): `08zp-wins` → `08zq-routines` → `08zs-plan` → `08zt-journal` → `08zu-reminders` → `08zv-statusbar` → `08zw-beta` (moves beta cards into the folded group; must come after every `modesPage` wrapper) → `08zz-tabs-pick` (picks Home + 3 tabs; must stay the last tab wrapper).
- New synced collections need the same plumbing everywhere: `01-boot-data.js` (repair, `trackChanges` key, `undoCore`), `03-undo-gestures.js` (snapshot/restore), `08-toast-desktop-board.js` (`backupData`), `11-profile.js` (restore, reset), `12-cloud-sync-signin.js` (`hashOf`, `localDoc`, `coreOf`, `mergeArr` key, `applyDoc`). Keys in use: t l s a h c g k o w r b j.
- Name clashes: one shared script scope and one stylesheet. Grep before adding a name. Bitten before: `hgT`, `.mo-in`, `moRise`, `.week`, `.ok` (Journal moods use `jm-`), and a global `const top` breaks a page (browsers reserve `top`).
- `[hidden]` loses to any `display:` rule in this app: add `.x[hidden]{display:none}` when hiding a flex/grid element.
- Chromium won't start an HTML5 drag from a `<button>`: draggable things are `div role=button` (Plan chips). Playwright's `dragTo` doesn't trigger it either; tests use `mouse.down/move/up`.
- Tests that depend on the weekday or the clock: set the data so it doesn't matter (e.g. routines due every day, `planFrom=0`).

## What's left / ideas
- Beta modes (KPIs & OKRs, Wins, Routines, Plan, Journal) are live behind the folded Beta group; polish them from Suly's feedback before taking the badge off (remove the key from `BETA_MD` in `08zw-beta.js` and its selector in the badge CSS).
- Needs keys/services Suly manages (not built): a live calendar connection (Google/Outlook sign-in) instead of the .ics import; push reminders when the app is closed (needs a push server).
- Pin up to 3 lists to Home (design option A on the canvas, "Phone Home · quicker way into a list").
