import { describe, expect, it } from 'vitest'
import { ALL_OPEN } from './closed'
import { UNDO_LIMIT, describeAction, nextUndo, remember, sameWeek, type Step, type WeekState } from './undo'

// 5 – 11 Oct 2026
const [MON, TUE, , , FRI] = ['05', '06', '07', '08', '09'].map((d) => `2026-10-${d}`)
const TUE_CLOSED = [false, true, false, false, false, false, false]

const shift = (id: number, staffId: number, date: string, start: number, end: number) => ({
  id,
  staffId,
  date,
  start,
  end,
  note: null,
})

const EMPTY: WeekState = { closedDays: ALL_OPEN, shifts: [], naNotes: [], leave: [] }
const WEEK: WeekState = {
  closedDays: TUE_CLOSED,
  shifts: [shift(1, 1, MON, 600, 1080), shift(2, 2, MON, 600, 960)],
  naNotes: [{ id: 1, staffId: 2, date: FRI }],
  leave: [{ id: 1, staffId: 3, fromDate: '2026-10-01', toDate: MON }],
}
const with_ = (patch: Partial<WeekState>): WeekState => ({ ...WEEK, ...patch })

const step = (before: WeekState, after: WeekState, label = 'adding a shift'): Step => ({ label, before, after })
const STAFF = new Set([1, 2, 3])

describe('sameWeek', () => {
  it('is the same week however its rows happen to be ordered', () => {
    const shuffled = with_({ shifts: [...WEEK.shifts].reverse() })
    expect(sameWeek(WEEK, shuffled)).toBe(true)
  })

  it('is a different week once a shift is added, removed, retimed or given to someone else', () => {
    expect(sameWeek(WEEK, with_({ shifts: [...WEEK.shifts, shift(3, 1, FRI, 600, 1080)] }))).toBe(false)
    expect(sameWeek(WEEK, with_({ shifts: WEEK.shifts.slice(1) }))).toBe(false)
    expect(sameWeek(WEEK, with_({ shifts: [shift(1, 1, MON, 600, 1020), WEEK.shifts[1]] }))).toBe(false)
    expect(sameWeek(WEEK, with_({ shifts: [shift(1, 3, MON, 600, 1080), WEEK.shifts[1]] }))).toBe(false)
  })

  it('is a different week once a day closes or reopens, or an N/A note goes on or comes off', () => {
    expect(sameWeek(WEEK, with_({ closedDays: ALL_OPEN }))).toBe(false)
    expect(sameWeek(WEEK, with_({ naNotes: [] }))).toBe(false)
    expect(sameWeek(WEEK, with_({ naNotes: [...WEEK.naNotes, { id: 2, staffId: 1, date: TUE }] }))).toBe(false)
  })

  it('is a different week once leave during it is booked or cancelled', () => {
    expect(sameWeek(WEEK, with_({ leave: [] }))).toBe(false)
    expect(sameWeek(WEEK, with_({ leave: [...WEEK.leave, { id: 2, staffId: 1, fromDate: FRI, toDate: FRI }] }))).toBe(
      false,
    )
  })
})

describe('remember', () => {
  it("puts the action on the end of the week's history", () => {
    const first = step(EMPTY, WEEK)
    const second = step(WEEK, with_({ closedDays: ALL_OPEN }), 'reopening Tue')
    expect(remember(remember([], first), second)).toEqual([first, second])
  })

  it('leaves the history alone when the action changed nothing', () => {
    const history = [step(EMPTY, WEEK)]
    expect(remember(history, step(WEEK, WEEK))).toBe(history)
  })

  it('starts again when the week changed in between, somewhere other than the grid', () => {
    const booked = with_({ shifts: WEEK.shifts.slice(1) }) // leave booked on the Staff page took a shift
    const next = step(booked, EMPTY, 'clearing the week')
    expect(remember([step(EMPTY, WEEK)], next)).toEqual([next])
  })

  it(`keeps only the last ${UNDO_LIMIT}`, () => {
    const weeks = Array.from({ length: UNDO_LIMIT + 2 }, (_, i) => with_({ shifts: [shift(i + 1, 1, MON, 600, 1080)] }))
    let history: Step[] = []
    for (let i = 1; i < weeks.length; i++) history = remember(history, step(weeks[i - 1], weeks[i], `step ${i}`))
    expect(history).toHaveLength(UNDO_LIMIT)
    expect(history[0].label).toBe('step 2')
    expect(history.at(-1)!.label).toBe(`step ${UNDO_LIMIT + 1}`)
  })
})

describe('nextUndo', () => {
  const cleared = step(WEEK, with_({ shifts: [] }), 'clearing the week')

  it('is nothing on a week with no history', () => {
    expect(nextUndo([], WEEK, STAFF)).toBeNull()
  })

  it('is the last action while the week is still as that action left it', () => {
    expect(nextUndo([step(EMPTY, WEEK), cleared], cleared.after, STAFF)).toBe(cleared)
  })

  it('is the one before once the last has been taken back', () => {
    const first = step(EMPTY, WEEK)
    expect(nextUndo([first], WEEK, STAFF)).toBe(first)
  })

  it('is nothing once the week has changed since, such as leave booked over it', () => {
    const booked = { ...cleared.after, leave: [...WEEK.leave, { id: 2, staffId: 1, fromDate: MON, toDate: MON }] }
    expect(nextUndo([cleared], booked, STAFF)).toBeNull()
  })

  it('is nothing once someone it would put back has been taken off the staff list', () => {
    expect(nextUndo([cleared], cleared.after, new Set([1, 3]))).toBeNull()
    const unmarked = step(with_({ shifts: [] }), with_({ shifts: [], naNotes: [] }), 'clearing N/A')
    expect(nextUndo([unmarked], unmarked.after, new Set([1, 3]))).toBeNull()
  })
})

describe('describeAction', () => {
  const name = 'John Reyes'
  const times = { date: MON, start: 600, end: 1080 }

  it('names the shift, whose it is and the day', () => {
    expect(describeAction({ kind: 'add', name, shift: times })).toBe('adding 10:00–18:00 for John Reyes on Mon')
    expect(describeAction({ kind: 'remove', name, shift: times })).toBe('removing 10:00–18:00 for John Reyes on Mon')
    expect(describeAction({ kind: 'change', name, shift: times, to: { start: 600, end: 960 } })).toBe(
      "changing John Reyes's Mon 10:00–18:00 to 10:00–16:00",
    )
  })

  it('names the week copied from', () => {
    expect(describeAction({ kind: 'copy', from: '2026-09-28' })).toBe('copying 28 Sep – 4 Oct into this week')
  })

  it('names the day closed or reopened, and whose N/A it is', () => {
    expect(describeAction({ kind: 'close', date: TUE })).toBe('closing Tue')
    expect(describeAction({ kind: 'reopen', date: TUE })).toBe('reopening Tue')
    expect(describeAction({ kind: 'markNa', name, date: FRI })).toBe('marking John Reyes N/A on Fri')
    expect(describeAction({ kind: 'clearNa', name, date: FRI })).toBe("clearing John Reyes's N/A on Fri")
  })

  it('says clearing the week', () => {
    expect(describeAction({ kind: 'clear' })).toBe('clearing the week')
  })

  it('names the version reverted to', () => {
    expect(describeAction({ kind: 'revert', version: 2 })).toBe('reverting to v2')
  })
})
