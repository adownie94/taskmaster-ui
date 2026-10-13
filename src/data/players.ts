import { asc } from "drizzle-orm";
import type { Player } from "../types";
import { db } from "../db";
import { players as playersTable } from "../db/schema";

// The academy roster, loaded from Postgres once at build time in roster order
// (which also breaks ties on equal points). Nullable columns are omitted
// rather than set to `null` so the `Player` shape is unchanged.
const rows = await db
  .select()
  .from(playersTable)
  .orderBy(asc(playersTable.sortOrder));

export const players: Player[] = rows.map((row) => ({
  id: row.id,
  name: row.name,
  ...(row.bio !== null && { bio: row.bio }),
  ...(row.avatarUrl !== null && { avatarUrl: row.avatarUrl }),
}));

export function getPlayerById(id: string): Player | undefined {
  return players.find((p) => p.id === id);
}
