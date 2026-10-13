# EAYL Taskmaster

The frontend for a **Taskmaster-style competition** run by the Engineering
Academy. Every Friday a new task is released; players have one week to complete
it, earn points, and climb the leaderboard. ~25 players, 16 weeks, one winner.

The UI has a deliberate **terminal / CRT aesthetic** — monospace, green-on-black,
window chrome — and is built static-first with **Astro + TypeScript + Tailwind v4**.

> Competition data (players, teams, tasks, scores, bonus points) lives in
> **Neon Postgres** and is read **at build time** — the deployed site is still
> fully static. Editorial copy (weekly recaps, changelog) stays in TypeScript.

## 🚀 Tech stack

- [Astro](https://astro.build) (static output, no UI framework)
- TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`), with design tokens in
  [`src/styles/global.css`](src/styles/global.css)
- [`@astrojs/sitemap`](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
  for an auto-generated sitemap (+ `public/robots.txt`)
- [Neon](https://neon.com) Postgres + [Drizzle ORM](https://orm.drizzle.team)
  over `pg` (node-postgres), with migrations via `drizzle-kit`
- Prettier (with `prettier-plugin-astro`)

## 📁 Project structure

```text
db/
├── seed.ts            # `npm run db:seed` — inserts missing initial rows
└── seed-data.ts       # initial data (generated from the original mock data)
drizzle/               # generated SQL migrations (`npm run db:generate`)
src/
├── components/        # Reusable, prop-driven .astro components
├── layouts/
│   └── Layout.astro   # <head>, nav, footer, skip link
├── db/
│   ├── schema.ts      # Drizzle table definitions (the database schema)
│   ├── client.ts      # createDb(url) — Drizzle over a node-postgres pool
│   └── index.ts       # build-time `db`, configured from DATABASE_URL
├── data/              # The data-access layer
│   ├── players.ts     # raw records ─┐
│   ├── teams.ts       # raw records  ├─ loaded from Postgres at build time
│   ├── tasks.ts       # raw records  │  (status derived from dates)
│   ├── scores.ts      # raw records ─┘  (points → positions; bonus points)
│   ├── recaps.ts      # editorial recap copy (TypeScript)
│   └── queries.ts     # derived selectors / view models (the UI's single API)
├── pages/
│   ├── index.astro            # homepage
│   ├── tasks/                 # /tasks and /tasks/[id]
│   ├── players/               # /players and /players/[id]
│   ├── leaderboard.astro      # full standings (with rank movement)
│   ├── recaps/                # /recaps and /recaps/[id] weekly episode recaps
│   ├── compare/               # /compare head-to-head (+ /compare/[a]/[b])
│   ├── stats.astro            # stats & Hall of Fame awards
│   └── 404.astro
├── styles/
│   └── global.css     # design tokens (@theme) + terminal helper classes
└── types/
    └── index.ts       # shared domain + view-model types
```

### Data flow (keep this separation)

```
db/schema.ts  →  data/*.ts          →   data/queries.ts   →   pages      →   components
(Postgres)       (rows → types/ shapes)  (derived selectors)   (fetch data)   (render props)
```

- **Components never import raw records** and never compute standings — they
  render typed `Props` only.
- **Pages** call selectors from [`src/data/queries.ts`](src/data/queries.ts)
  and pass ready-to-render data down.
- All cross-record computation (leaderboard ranking, rank movement, awards,
  head-to-head) lives in `queries.ts` as pure functions.

The database stores **facts only** (points, dates, membership). Finishing
positions, task status and totals are always derived, so they can't drift.
Each `data/*.ts` module loads its rows once with a top-level `await`, which
keeps every selector synchronous and the components unaware of the database.

## 🗄️ Database (Neon)

The workspace is linked to the Neon project `eayl-taskmaster` (see the
git-ignored `.neon` file). `neon env pull` writes the connection strings to the
git-ignored `.env.local`:

- `DATABASE_URL` — **pooled**; used by the site build and `npm run dev`.
- `DATABASE_URL_UNPOOLED` — **direct**; used for migrations and seeding.

First-time setup on a new machine:

```sh
neon link            # pick the project; also pulls .env.local
npm run db:check     # prove the connection works
```

Changing the schema:

1. Edit [`src/db/schema.ts`](src/db/schema.ts), then `npm run db:generate`.
2. Try it on a branch first: `neon checkout dev --create`, then
   `npm run db:migrate` (and `npm run db:seed` for a fresh database) and
   `npm run build`.
3. Switch back with `neon checkout production` and run `npm run db:migrate`.

**Recording results:** insert the week's rows into `task_scores` (or
`team_scores` for team tasks) and any `bonus_points` — e.g. with
`npm run db:studio` — then re-run the **Deploy** workflow so the static site is
rebuilt. CI builds read the `DATABASE_URL` repository secret.

## 🎨 Styling

All colours, fonts and effects come from design tokens defined in the
`@theme` block of [`src/styles/global.css`](src/styles/global.css), which
Tailwind turns into utilities (`text-acid`, `bg-term-panel`, `border-grid`, …).
**Never hard-code hex values in components** — use the tokens. Helper classes
(`.prompt`, `.text-glow`, `.caret`, `.live-dot`) and all motion respect
`prefers-reduced-motion`.

## 🧞 Commands

Run from the project root:

| Command                | Action                                   |
| :--------------------- | :--------------------------------------- |
| `npm install`          | Install dependencies                     |
| `npm run dev`          | Start the dev server at `localhost:4321` |
| `npm run build`        | Build the production site to `./dist/`   |
| `npm run preview`      | Preview the production build locally     |
| `npm run check`        | Type-check + diagnostics (`astro check`) |
| `npm run format`       | Format the codebase with Prettier        |
| `npm run format:check` | Check formatting without writing changes |
| `npm run db:check`     | Run a test query against `DATABASE_URL`  |
| `npm run db:generate`  | Generate a SQL migration from the schema |
| `npm run db:migrate`   | Apply pending migrations (direct URL)    |
| `npm run db:seed`      | Insert missing initial data (idempotent) |
| `npm run db:studio`    | Browse and edit data in Drizzle Studio   |

Before committing, keep `npm run check` and `npm run format:check` clean.

## 🔭 Roadmap

Competition data now lives in Neon Postgres. Next steps toward live data:
recaps in the database, a lightweight admin flow for recording scores, and
auth + submissions (e.g. Neon Auth).
