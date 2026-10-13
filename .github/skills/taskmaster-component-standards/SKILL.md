---
name: taskmaster-component-standards
description: >-
  Coding standards and architecture conventions for EAYL Taskmaster Astro UI.
  Use when creating or editing Astro components, pages, TypeScript types, or
  the data layer so new code matches the established patterns: typed
  `Props`, the data-layer separation (schema → data → derived queries → UI),
  build-time Neon Postgres data rules, prop-driven reusable components, client
  scripts, and accessibility. Triggers: "add a component", "create a page",
  "add data", "wire up data", "new type", "follow the project conventions".
---

# Taskmaster Component & Code Standards

The UI is **Astro + TypeScript + Tailwind v4**, static-first, **no React**.
Competition data lives in **Neon Postgres** (Drizzle ORM) and is read **at
build time only** — the deployed site is static, with no runtime backend. The
goal is a clean, prop-driven component set backed by a database-agnostic data
layer.

## Architecture: strict data-layer separation
Data flows one direction. Keep every layer in its place:

```
src/db/schema.ts        ← Drizzle tables (raw facts only)
src/types/index.ts      ← shape definitions (interfaces, unions)
src/data/*.ts           ← load rows at build time → raw records (types)
src/data/queries.ts     ← derived selectors / view models
pages (.astro)          ← call selectors, pass plain props to components
components (.astro)      ← render props only; NO data imports of raw records
```

Rules:
- **Never hard-code player/task/score data inside a component.** Components
  receive everything through typed `Props`.
- Pages import from `src/data/*` (ideally the `queries.ts` selectors), then
  hand ready-to-render data to components.
- All cross-record computation (leaderboard ranking, stats, recent results,
  initials) lives in `queries.ts` as pure functions — not in components or
  page markup.
- This separation keeps the database out of the UI: only `src/data/*.ts`
  imports `src/db`, and **no component, page or client script may import
  `src/db`**. Preserve it.

## Types (`src/types/index.ts`)
- Define a shared `interface` / union for every domain concept and reuse it;
  don't inline object shapes.
- Separate **raw records** (`Player`, `Task`, `Score`) from **derived view
  models** (`LeaderboardRow`, `TaskResult`, `CompetitionStats`).
- Dates are ISO 8601 strings on the record; format them at the page level.
- Status is a string-literal union (`"upcoming" | "live" | "completed"`),
  exported as `TaskStatus`.

## Data (`src/db/*`, `src/data/*.ts`)
- The schema lives in `src/db/schema.ts`. Change it, then
  `npm run db:generate`; never hand-edit or ad-hoc migrate the database.
  Test migrations on a Neon branch (`neon checkout dev --create`) first.
- Store **facts only** (points, dates, membership). Derive positions, status
  and totals in `src/data/*` / `queries.ts` so they can't drift.
- One file per entity: `players.ts`, `teams.ts`, `tasks.ts`, `scores.ts`. Each
  loads its rows once with a top-level `await db.select()…` and maps them to
  the `src/types` shape (omit `null` columns rather than passing `null`).
- Export a typed array plus small `getXById` / `getCurrent*` lookup helpers,
  keeping selectors synchronous.
- New initial/demo rows go in `db/seed-data.ts` (seeded with `npm run db:seed`,
  insert-only). Editorial copy (`recaps.ts`, `changelog.ts`) stays in TS.

## Astro component conventions
- **Typed props:** every component declares `interface Props { ... }` and
  destructures from `Astro.props`, with sensible defaults.
- **Pass-through styling:** accept an optional `class?: string` prop and merge
  it last so callers can extend layout (e.g. `class="shrink-0"`).
- Use `class:list={[...]}` for conditional/variant classes, not string
  concatenation.
- Keep components **small, single-purpose, and reusable**. Prefer composing
  (e.g. `TerminalWindow` wrapping content) over duplicating markup.
- Map variants with a typed config object keyed by the union
  (see `TaskStatusBadge.astro`'s `config: Record<TaskStatus, {...}>`), rather
  than chains of `if`/ternaries in markup.
- Comment only where it adds context (e.g. explaining the build-time
  countdown fallback); don't narrate obvious markup.

## Client-side JavaScript
- Default to static output. Add a `<script>` only when behaviour needs the
  browser (e.g. `Countdown.astro`, mobile nav toggle).
- Scripts are TypeScript, type the DOM queries (`querySelector<HTMLElement>`),
  and must **degrade gracefully**: render a correct server-side value first,
  then enhance (the countdown prints a valid time before JS runs).
- Drive scripts off `data-*` attributes rather than hard-coded values.

## Accessibility (required)
- Semantic HTML and correct heading hierarchy (`h1` once per page, sections
  use `h2`).
- Decorative chrome (traffic lights, `●`, medals used only as decoration) is
  `aria-hidden="true"`; meaningful state is also conveyed in text.
- Interactive elements are real `<a>`/`<button>` with visible focus (global
  `:focus-visible` outline) and proper `aria-*` (`aria-current="page"` for
  active nav, `aria-expanded`/`aria-controls` for the menu toggle).
- Provide a skip-to-content link (in `Layout.astro`); don't remove it.

## Responsive
- Mobile-first: base styles target small screens, scale up with `sm:`/`lg:`.
- Don't just shrink desktop — collapse multi-column grids
  (`grid lg:grid-cols-2`) and swap the desktop nav for the mobile menu.

## Validation before finishing
Always run and keep clean:
```
npx astro check   # 0 errors / 0 warnings
npx astro build
```
Also confirm nav links and dynamic routes resolve, and that no section looks
unfinished or contains placeholder content.

## Don't
- ❌ Add React or UI libraries without a strong technical reason.
- ❌ Add a runtime backend, auth, or query the database from the browser
  (the site is static; data is read at build time).
- ❌ Import raw data arrays into components or compute standings in markup.
- ❌ Leave untyped props or inline one-off object shapes.
