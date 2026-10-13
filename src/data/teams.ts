import { asc } from "drizzle-orm";
import type { Team } from "../types";
import { db } from "../db";
import {
  teamMembers as teamMembersTable,
  teams as teamsTable,
} from "../db/schema";

// The squads for team-format tasks, loaded from Postgres once at build time
// in team order. `memberIds` (from `team_members`, in member order) is the
// single source of truth for membership — resolve members via
// `getPlayerById` where needed.
const [teamRows, memberRows] = await Promise.all([
  db.select().from(teamsTable).orderBy(asc(teamsTable.sortOrder)),
  db
    .select()
    .from(teamMembersTable)
    .orderBy(asc(teamMembersTable.teamId), asc(teamMembersTable.sortOrder)),
]);

export const teams: Team[] = teamRows.map((row) => ({
  id: row.id,
  name: row.name,
  ...(row.tagline !== null && { tagline: row.tagline }),
  memberIds: memberRows
    .filter((member) => member.teamId === row.id)
    .map((member) => member.playerId),
}));

export function getTeamById(id: string): Team | undefined {
  return teams.find((t) => t.id === id);
}

// Reverse lookup so any player id resolves to its squad. Built once from the
// membership lists above so it stays in sync with the single source of truth.
const teamByPlayerId = new Map<string, Team>(
  teams.flatMap((team) => team.memberIds.map((id) => [id, team] as const)),
);

export function getTeamForPlayer(playerId: string): Team | undefined {
  return teamByPlayerId.get(playerId);
}
