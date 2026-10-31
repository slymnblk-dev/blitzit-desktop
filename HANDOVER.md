# Windaday — handover (2026-10-28)

## Who / how
- Owner: **Suly**. Not technical. Windows PC + Samsung Android phone.
- Wants: very short, simple, structured replies; visuals/design options when choosing; minimalist, clean, bold, modern UI; consistent design language.
- **Always fix bugs you find without asking.**
- **Always say at the end whether the tests passed.**
- Testing policy (agreed 2026-10-27): small UI changes → run only the related spec files + a screenshot check; risky changes (data, sync, saving, new features, shared code) → full suite; "go live" → the pipeline runs the full suite anyway. Say which tests you ran.
- Quick small tweaks (a colour, a text, one style): no QA sweep and no full suite — just the related spec file(s) + one screenshot (Suly, 2026-10-29).

## Repo / workflow
- Repo `slymnblk-dev/blitzit-desktop`. Work on **`dev`** only. Never push to `main` directly.
- Build: `src/index.html` + `src/css/*.css` + `src/js/*.js` are concatenated in sorted order into `web/index.html` by `node tools/build.mjs` (one shared scope; later files wrap earlier functions by reassigning them, e.g. `render`, `drawGoal`, `mxSave`, `rhythmSide`).
- After every change: bump `APP_VERSION` in `src/js/01-boot-data.js` **and** `blitzit-vNN` in `web/sw.js` (same number) → build → tests → commit (with the attribution lines) → push `dev`.
- Tests: `(node tests/server.mjs > /dev/null 2>&1 &)` then `PW_CHROMIUM=<chromium path> npm test` (or `npx playwright test tests/<file>.spec.mjs`). Kill the server after: `pgrep -f "node tests/serve[r]" | xargs -r kill`.
- Test copy for Suly: https://slymnblk-dev.github.io/blitzit-desktop/ (from `dev`).
- **Go live** only when Suly says "go live": `gh workflow run pipeline.yml --ref dev -f go_live=true`, watch it (~12 min), then check `git ls-remote origin main dev` shows the same commit. Netlify credits are limited: go live in batches.
- Don't touch the shared `AppData\Local\Blitzit` folder; don't change security settings on Suly's PC; never put secrets in code (GitHub secrets are Suly's).
- Design options go on the Claude Design canvas (artifact "Habits & Goals pages"); re-read `project/canvas.json` from the artifact before publishing, the editor re-saves it.

## State
- **Live = dev = 0.228** (commit `a1eec5e`). All 131 tests pass.

## What landed recently (newest first)
- 0.246 **Wins** mode (Settings → Modes, off by default): `08zp-wins.js`, `20-wins.css`. Auto wins from done tasks (and goal milestone tasks), habit streak milestones (3, 7, 14, 21, 30…), milestones, goals achieved, won days (logged in `S.wins` kind 'day' when the last Today task is ticked); your own wins in `S.wins` kind 'mine' (synced key `w`, backup, undo). Phone: Wins tab (+ adds a win). Computer: sidebar under Modes. Week reel dialog. Tests: `tests/wins.spec.mjs`.
- 0.247 **Task Impact** (Settings → Tasks → Impact: Off / Small · Medium · Big (default) / 1 to 5). Stored as `t.imp` 1–5 (levels map Small 1, Medium 3, Big 5; shown as Small ≤2, Medium 3, Big ≥4). Violet (`--imp`, `21-impact.css`), never coral or priority colours. Detail pill + picker (3 cards with sparks, or 5 circles); rows show sparks or the number, a violet edge for Big, "Quick win" when Big and ≤30m. **Automatic order, no sort UI**: biggest impact first, then priority (`ordRank` in `02-tasks-render.js`, used by `priSorted`, `bySpaceOrder`, Focus queue, drag hint). Big-impact tasks are highlights in Wins. Repeating tasks keep their impact.
- 0.247 **Routines** mode (Settings → Modes, off by default): `08zq-routines.js`, `22-routines.css`. `S.routines` [{id,name,e,steps:[{id,t,m}],days,at,log,created}] synced (key `r`), backed up, undoable. Phone: Routines tab (list → editor view with Back; + makes a new routine). Computer: sidebar under Modes, list left + editor right. Empty state offers 3 templates. Up next card (soft coral, round coral Start). Play: full-screen coral, one step at a time, timer, pause, skip, Done · next step, focus sounds; finishing logs the day (streak, rest days don't break it) and lands in Wins as "Routine: …".
- 0.248 **Phone tab bar: Home + up to 3** (`08zz-tabs-pick.js`, must stay the last tab-bar wrapper). `S.cfg.tabs` = picked keys (unset: first three in order). Settings → Appearance → Tabs (tiles, "2 of 3", a 4th is refused with a toast). Turning a mode on adds its tab while there's room. Modes without a tab: a Modes button (4 squares) on phone Home lists them + "Choose tabs"; their pages show Back (`body.tb-off`).
- 0.248 **Plan** mode (time blocks, Settings → Modes, off by default): `08zs-plan.js`, `23-plan.css`. Task place on the task: `t.pl={d,s}` (minutes); busy blocks `S.blocks` [{id,t,d,s,len,rep}] synced (key `b`), old ones dropped after 14 days unless every day. Auto-plan: unplaced Today tasks, biggest impact first, from now, around busy and placed blocks, within the day's hours (Modes card: Your day 8:00 to 20:00). Phone: tab, "Not placed" tray, tap block (Focus, Earlier/Later 15 min, Open, Take off) or empty hour (place a task / busy time). Computer: To place / Placed lists, drag onto the timeline (chips are divs: Chromium won't drag a button), Focus pill on the current block.
