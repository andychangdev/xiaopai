import { describe, expect, it } from 'vitest'
import {
  describeLeave,
  leaveTimeline,
  daySpan,
  shortSpan,
  isPast,
  leaveDays,
  leaveOn,
  leaveSpan,
  onLeaveError,
  onLeaveNote,
  onLeaveSummary,
  overlapError,
  parseLeave,
} from './leave'

let nextId = 1
const booking = (staffId: number, fromDate: string, toDate: string, note: string | null = null) => ({
  id: nextId++,
  staffId,
  fromDate,
  toDate,
  note,
})

// Lisa away Thursday and Friday, 8 – 9 Oct 2026
const FAMILY = booking(4, '2026-10-08', '2026-10-09', 'Family')
const MEDICAL = booking(7, '2026-10-07', '2026-10-07', 'Medical')

describe('leaveOn', () => {
  it('finds the booking covering the day, first and last days included', () => {
    expect(leaveOn([FAMILY], 4, '2026-10-08')).toBe(FAMILY)
    expect(leaveOn([FAMILY], 4, '2026-10-09')).toBe(FAMILY)
  })

  it('finds a one-day booking on its day', () => {
    expect(leaveOn([MEDICAL], 7, '2026-10-07')).toBe(MEDICAL)
  })

  it('finds nothing the day before or after', () => {
    expect(leaveOn([FAMILY], 4, '2026-10-07')).toBeUndefined()
    expect(leaveOn([FAMILY], 4, '2026-10-10')).toBeUndefined()
  })

  it("finds only the person's own leave", () => {
    expect(leaveOn([FAMILY, MEDICAL], 7, '2026-10-08')).toBeUndefined()
    expect(leaveOn([FAMILY, MEDICAL], 7, '2026-10-07')).toBe(MEDICAL)
  })

  it('covers the days of every week it spans', () => {
    const away = booking(4, '2026-10-10', '2026-10-13')
    expect(leaveOn([away], 4, '2026-10-11')).toBe(away)
    expect(leaveOn([away], 4, '2026-10-12')).toBe(away)
  })

  it('goes by the calendar across a month and a year', () => {
    const away = booking(4, '2026-12-28', '2027-01-04')
    expect(leaveOn([away], 4, '2026-12-31')).toBe(away)
    expect(leaveOn([away], 4, '2027-01-01')).toBe(away)
    expect(leaveOn([away], 4, '2027-01-05')).toBeUndefined()
  })
})

describe('leaveDays', () => {
  it('counts both ends', () => {
    expect(leaveDays(FAMILY)).toBe(2)
    expect(leaveDays(MEDICAL)).toBe(1)
  })

  it('counts across a month end and a change of clocks', () => {
    // Clocks go forward in Sydney on Sun 4 Oct 2026
    expect(leaveDays(booking(4, '2026-09-28', '2026-10-18'))).toBe(21)
  })
})

describe('leaveSpan', () => {
  it('names the first and last days', () => {
    expect(leaveSpan(FAMILY)).toBe('Thu 8 Oct – Fri 9 Oct')
  })

  it('names the one day of a one-day booking', () => {
    expect(leaveSpan(MEDICAL)).toBe('Wed 7 Oct')
  })
})

describe('describeLeave', () => {
  it('names the days and the reason', () => {
    expect(describeLeave(FAMILY)).toBe('Thu 8 Oct – Fri 9 Oct · Family')
  })

  it('is just the days when there is no reason', () => {
    expect(describeLeave(booking(4, '2026-10-07', '2026-10-07'))).toBe('Wed 7 Oct')
  })
})

describe('onLeaveSummary', () => {
  it("says it's leave, when, and why", () => {
    expect(onLeaveSummary(FAMILY)).toBe('On leave — Thu 8 Oct – Fri 9 Oct · Family')
  })

  it('leaves out the reason when there is none', () => {
    expect(onLeaveSummary(booking(4, '2026-10-07', '2026-10-07'))).toBe('On leave — Wed 7 Oct')
  })
})

describe('onLeaveNote', () => {
  it('says who is away and when, by first name, for the cell', () => {
    expect(onLeaveNote('Lisa Chen', FAMILY)).toBe('Lisa — on leave Thu 8 Oct – Fri 9 Oct')
  })
})

describe('onLeaveError', () => {
  it('says why the day takes nothing, and where leave is booked', () => {
    expect(onLeaveError('Lisa Chen', FAMILY)).toBe(
      'Lisa is on leave Thu 8 Oct – Fri 9 Oct. Leave is booked on the Staff page.',
    )
  })
})

describe('parseLeave', () => {
  it('takes the first and last days and the reason', () => {
    expect(parseLeave({ from: '2026-10-08', to: '2026-10-09', note: 'Family' })).toEqual({
      fromDate: '2026-10-08',
      toDate: '2026-10-09',
      note: 'Family',
    })
  })

  it('makes it one day when there is no last day', () => {
    expect(parseLeave({ from: '2026-10-07', to: '', note: '' })).toEqual({
      fromDate: '2026-10-07',
      toDate: '2026-10-07',
      note: null,
    })
  })

  it('trims the reason, and treats a blank one as none', () => {
    expect(parseLeave({ from: '2026-10-07', to: '', note: '  Medical ' })).toMatchObject({ note: 'Medical' })
    expect(parseLeave({ from: '2026-10-07', to: '', note: '   ' })).toMatchObject({ note: null })
  })

  it('needs a real first day', () => {
    expect(parseLeave({ from: '', to: '2026-10-09', note: '' })).toEqual({ error: 'Pick the first day of the leave.' })
    expect(parseLeave({ from: '2026-02-30', to: '', note: '' })).toEqual({ error: 'Pick the first day of the leave.' })
  })

  it('refuses a last day that is no date', () => {
    expect(parseLeave({ from: '2026-10-07', to: 'soon', note: '' })).toEqual({
      error: 'The last day of the leave is not a date.',
    })
  })

  it('refuses leave that ends before it starts', () => {
    expect(parseLeave({ from: '2026-10-09', to: '2026-10-08', note: '' })).toEqual({
      error: "Leave can't end before it starts.",
    })
  })
})

describe('overlapError', () => {
  const theirs = [FAMILY]

  it('refuses leave that shares a day with a booking they already have', () => {
    const msg = 'Lisa already has leave booked Thu 8 Oct – Fri 9 Oct. Change that booking instead.'
    expect(overlapError('Lisa Chen', { fromDate: '2026-10-09', toDate: '2026-10-12' }, theirs)).toBe(msg)
    expect(overlapError('Lisa Chen', { fromDate: '2026-10-05', toDate: '2026-10-08' }, theirs)).toBe(msg)
    expect(overlapError('Lisa Chen', { fromDate: '2026-10-05', toDate: '2026-10-11' }, theirs)).toBe(msg)
  })

  it('takes leave that ends the day before, or starts the day after', () => {
    expect(overlapError('Lisa Chen', { fromDate: '2026-10-05', toDate: '2026-10-07' }, theirs)).toBeNull()
    expect(overlapError('Lisa Chen', { fromDate: '2026-10-10', toDate: '2026-10-10' }, theirs)).toBeNull()
  })
})

describe('isPast', () => {
  it('is past once its last day has gone', () => {
    expect(isPast(FAMILY, '2026-10-10')).toBe(true)
  })

  it('is not past on its last day, or before', () => {
    expect(isPast(FAMILY, '2026-10-09')).toBe(false)
    expect(isPast(FAMILY, '2026-10-01')).toBe(false)
  })
})

describe('shortSpan', () => {
  it('gives the month once when it can', () => {
    expect(shortSpan({ fromDate: '2026-10-05', toDate: '2026-10-05' })).toBe('5 Oct')
    expect(shortSpan({ fromDate: '2026-10-11', toDate: '2026-10-13' })).toBe('11–13 Oct')
    expect(shortSpan({ fromDate: '2026-10-23', toDate: '2026-11-09' })).toBe('23 Oct – 9 Nov')
  })
})

describe('daySpan', () => {
  it('gives the days alone, across a month end too', () => {
    expect(daySpan({ fromDate: '2026-10-05', toDate: '2026-10-05' })).toBe('5')
    expect(daySpan({ fromDate: '2026-10-11', toDate: '2026-10-13' })).toBe('11–13')
    expect(daySpan({ fromDate: '2026-09-30', toDate: '2026-10-02' })).toBe('30–2')
  })
})

describe('leaveTimeline', () => {
  // Thursday, so the timeline starts on Monday 28 Sep and its seventh week ends Sunday 15 Nov
  const today = '2026-10-01'
  const at = (staffId: number, fromDate: string, toDate: string) => booking(staffId, fromDate, toDate)

  it("runs seven weeks from this week's Monday, with today's place in it", () => {
    const t = leaveTimeline([], [], today)
    expect(t.weeks).toEqual(['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'])
    expect([t.days, t.today]).toEqual([49, 3])
  })

  it('gives a row to each person with leave in it, in roster order', () => {
    const t = leaveTimeline([at(1, '2026-10-11', '2026-10-13'), at(2, '2026-10-05', '2026-10-05'), at(3, '2027-01-04', '2027-01-08')], [2, 3, 1], today)
    expect(t.rows.map((r) => r.staffId)).toEqual([2, 1])
  })

  it('places a bar from its first day to its last', () => {
    const [row] = leaveTimeline([at(1, '2026-10-11', '2026-10-13')], [1], today).rows
    expect(row.bars[0]).toMatchObject({ from: 13, length: 3, cutStart: false, cutEnd: false })
  })

  it('cuts leave that started before this week at the start', () => {
    const [row] = leaveTimeline([at(1, '2026-09-20', '2026-10-02')], [1], today).rows
    expect(row.bars[0]).toMatchObject({ from: 0, length: 5, cutStart: true, cutEnd: false })
  })

  it("draws no leave that's over, even earlier this week, and lists it as past instead", () => {
    const t = leaveTimeline([at(1, '2026-09-28', '2026-09-29')], [1], today)
    expect(t.rows).toEqual([])
    expect(t.past).toHaveLength(1)
  })

  it('cuts leave that ends after the last week at the end', () => {
    const [row] = leaveTimeline([at(1, '2026-11-10', '2026-12-01')], [1], today).rows
    expect(row.bars[0]).toMatchObject({ from: 43, length: 6, cutStart: false, cutEnd: true })
  })

  it("keeps a single day, even on the timeline's last day", () => {
    const [row] = leaveTimeline([at(1, '2026-10-05', '2026-10-05'), at(1, '2026-11-15', '2026-11-15')], [1], today).rows
    expect(row.bars.map((b) => [b.from, b.length])).toEqual([
      [7, 1],
      [48, 1],
    ])
  })

  it('lists leave over, newest first, and leave beyond the seven weeks, soonest first', () => {
    const leave = [at(1, '2026-08-01', '2026-08-02'), at(1, '2026-09-10', '2026-09-12'), at(1, '2026-12-01', '2026-12-02'), at(1, '2026-11-16', '2026-11-16')]
    const t = leaveTimeline(leave, [1], today)
    expect(t.past.map((l) => l.fromDate)).toEqual(['2026-09-10', '2026-08-01'])
    expect(t.later.map((l) => l.fromDate)).toEqual(['2026-11-16', '2026-12-01'])
  })
})
