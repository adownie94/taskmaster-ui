import { asc } from "drizzle-orm";
import type { Task, TaskStatus } from "../types";
import { db } from "../db";
import { tasks as tasksTable } from "../db/schema";

/**
 * Derives a task's status purely from its release/deadline dates, so the
 * status is always consistent with the clock and self-corrects as time
 * passes (e.g. a live task flips to "completed" once its deadline passes)
 * instead of relying on a hardcoded value that can go stale.
 *
 *   now < releaseDate            → "upcoming" (brief still encrypted)
 *   releaseDate <= now < deadline → "live"     (task is open)
 *   now >= deadline              → "completed" (task closed)
 */
export function deriveTaskStatus(
  task: Pick<Task, "releaseDate" | "deadline">,
  now: number = Date.now(),
): TaskStatus {
  const release = new Date(task.releaseDate).getTime();
  const deadline = new Date(task.deadline).getTime();
  if (Number.isNaN(release) || Number.isNaN(deadline) || now < release) {
    return "upcoming";
  }
  return now < deadline ? "live" : "completed";
}

// The weekly schedule, loaded from Postgres once at build time. Status is
// not stored: it is derived from the dates below so it is always
// clock-correct. Timestamps are zone-less wall-clock times, returned as
// "YYYY-MM-DD HH:MM:SS" and normalised to the ISO form the site expects
// ("YYYY-MM-DDTHH:MM:SS", parsed as local time).
const toLocalIso = (timestamp: string) => timestamp.replace(" ", "T");

const rows = await db
  .select()
  .from(tasksTable)
  .orderBy(asc(tasksTable.weekNumber));

export const tasks: Task[] = rows.map((row) => {
  const task = {
    id: row.id,
    weekNumber: row.weekNumber,
    title: row.title,
    description: row.description,
    ...(row.brief !== null && { brief: row.brief }),
    releaseDate: toLocalIso(row.releaseDate),
    deadline: toLocalIso(row.deadline),
    format: row.format,
  };
  return { ...task, status: deriveTaskStatus(task) };
});

export function getTaskById(id: string): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function getCurrentTask(): Task | undefined {
  return (
    tasks.find((t) => t.status === "live") ??
    tasks.find((t) => t.status === "upcoming")
  );
}

/** Team-format tasks on the schedule, ascending by week number. */
export function getTeamTasks(): Task[] {
  return tasks
    .filter((t) => t.format === "team")
    .sort((a, b) => a.weekNumber - b.weekNumber);
}
