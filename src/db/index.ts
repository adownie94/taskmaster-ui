import { DATABASE_URL } from "astro:env/server";
import { createDb } from "./client";

// The site is statically built, so this only runs at build time (and in
// `astro dev`). DATABASE_URL is the pooled Neon connection string, loaded
// from `.env.local` locally (`neon env pull`) and from a secret in CI.
export const { db } = createDb(DATABASE_URL);
