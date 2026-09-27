// Shapes shared between the rules and the database. Types only.

/** A published week, frozen as it was at that moment (ARCHITECTURE §6). */
export type Snapshot = {
  weekStart: string
  publishedAt: string
  version: number
  days: {
    date: string
    closed: boolean
    // Only people actually working. The name is as it was then; the id says
    // who it was, so a later rename can't make the week look changed.
    on: { staffId: number; name: string; times: string[] }[]
  }[]
}
