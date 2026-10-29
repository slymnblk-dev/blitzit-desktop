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
- 0.228 Phone Home: Settings → Appearance → **On Home show: Spaces / Lists**. Lists view = every list grouped under its space, one tap opens it (`homeSpaces()` in 02-tasks-render.js, `[data-hlopen]` in 09-spaces.js).
- 0.227 Today card (phone) no longer shows "+N more".
- 0.226 Phone tab bar: **Floating** pill (default, coral + on its own) or **With labels** (`navStyle`, 08p-tabs.js + 12-phone.css).
- 0.225 Goal page "Measured by" = calm list rows; KPIs/OKRs can live in **no space** (`space:null`, shown as "No space"; helpers `mxSpOk`, `mxSpEq`, pick value `'none'`); New KPI / New OKR for this goal.
- 0.224 Metrics page: **List** (default, space filter) and **By space** views, one "+ New" (08y-metrics2.js). Desktop sidebar groups Habits, Goals, Metrics under **Modes**.
- 0.223 Task rows show KPI/OKR as icons only; clearer picker; gauge button wears a progress ring that glows and floats "+N" (08x-mx-polish.js).
- 0.222 Goals ↔ KPIs/OKRs: Measured by links, New OKR from goal (milestones → key results), finish lines (`m.fin`), goal mini-tasks can add to a KPI (08w-goal-metrics.js). Desktop Home: **Bento** (default) and **Calm column** (08u-home-desk.js). Metrics page + sidebar item (08v-metrics.js). Mark milestone done button reworked.

## Ideas mentioned, not built
- Pin up to 3 lists to Home (design option A on the canvas, "Phone Home · quicker way into a list").
