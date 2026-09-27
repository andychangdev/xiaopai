// Shapes shared between the rules and the database. Types only.

/** A published week, frozen as it was at that moment (ARCHITECTURE §6). */
export type Snapshot = {
  weekStart: string
  publishedAt: string
  version: number
  days: {
    date: string
    closed: boolean
    on: { name: string; times: string[] }[] // only people actually working
  }[]
}
