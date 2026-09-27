import 'server-only'
import { eq } from 'drizzle-orm'
import type { IsoDate } from '@/lib/roster/dates'
import { NOTHING_TO_UNDO, nextUndo, remember, type Step, type WeekState } from '@/lib/roster/undo'
import { getDb } from './client'
import type { Db } from './open'
import { closedDaysOf, leaveDuring } from './queries'
import { naNotes, rosters, shifts, staff } from './schema'

// Each week's undo history, kept in the server's memory rather than the
// database: it's for taking back a slip, so it needn't outlast the server.
// On globalThis, like the connection, so hot reload doesn't lose it.
const cached = globalThis as unknown as { xiaopaiUndo?: Map<IsoDate, Step[]> }
const histories = () => (cached.xiaopaiUndo ??= new Map())

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * The week as a grid action finds it and leaves it. Inside a transaction, it's
 * as the transaction has it. Shifts and notes are whole rows, so a column
 * added later comes back with them on Undo.
 */
function weekState(week: IsoDate): WeekState {
  const db = getDb()
  return {
    closedDays: closedDaysOf(week),
    shifts: db.select().from(shifts).where(eq(shifts.weekStart, week)).all(),
    naNotes: db.select().from(naNotes).where(eq(naNotes.weekStart, week)).all(),
    leave: leaveDuring(week).map(({ id, staffId, fromDate, toDate }) => ({ id, staffId, fromDate, toDate })),
  }
}

const staffIds = () => new Set(getDb().select({ id: staff.id }).from(staff).all().map((p) => p.id))

/**
 * Runs a grid action on one week as one transaction, and remembers the week
 * as it was, so Undo can put it back. `label` says what the action did, for
 * the Undo button to name.
 */
export function undoable<T>(week: IsoDate, label: string, run: (tx: Tx) => T): T {
  const { result, before, after } = getDb().transaction((tx) => {
    const before = weekState(week)
    const result = run(tx)
    return { result, before, after: weekState(week) }
  })
  histories().set(week, remember(histories().get(week) ?? [], { label, before, after }))
  return result
}

/** What Undo would take back on the week, as describeAction put it, or null when there's nothing it can. */
export function undoLabel(week: IsoDate): string | null {
  return nextUndo(histories().get(week) ?? [], weekState(week), staffIds())?.label ?? null
}

/**
 * Puts the week back exactly as it was before its last grid action: its
 * shifts and N/A notes, ids and all, and its closed days. Its roster's
 * publishing is left alone. A history Undo can no longer use is dropped.
 */
export function undoLast(week: IsoDate): { error?: string } {
  const history = histories().get(week) ?? []
  const undone = getDb().transaction((tx) => {
    const step = nextUndo(history, weekState(week), staffIds())
    if (!step) return false
    const { closedDays, shifts: before, naNotes: notes } = step.before
    tx.update(rosters).set({ closedDays }).where(eq(rosters.weekStart, week)).run()
    tx.delete(shifts).where(eq(shifts.weekStart, week)).run()
    tx.delete(naNotes).where(eq(naNotes.weekStart, week)).run()
    if (before.length) tx.insert(shifts).values(before.map((s) => ({ ...s, weekStart: week }))).run()
    if (notes.length) tx.insert(naNotes).values(notes.map((n) => ({ ...n, weekStart: week }))).run()
    return true
  })
  if (!undone) {
    histories().delete(week)
    return { error: NOTHING_TO_UNDO }
  }
  histories().set(week, history.slice(0, -1))
  return {}
}
