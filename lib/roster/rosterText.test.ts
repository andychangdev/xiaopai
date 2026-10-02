import { describe, expect, it } from 'vitest'
import { rosterDays, rosterText } from './rosterText'

// 5 – 11 Oct 2026, with Tuesday closed
const WEEK = '2026-10-05'
const [MON, TUE, WED, THU, FRI, SAT, SUN] = ['05', '06', '07', '08', '09', '10', '11'].map((d) => `2026-10-${d}`)
const TUE_CLOSED = [false, true, false, false, false, false, false]
const NAME = 'Your restaurant'

// In roster row order, which isn't alphabetical
const JOHN = { id: 1, name: 'John Reyes' }
const PRIYA = { id: 2, name: 'Priya Naidu' }
const SARAH = { id: 3, name: 'Sarah Dunn' }
const LISA = { id: 4, name: 'Lisa Chen' }
const MIKE = { id: 5, name: 'Mike Tulloch' }
const STAFF = [JOHN, PRIYA, SARAH, LISA, MIKE]

let nextId = 1
const h = (hours: number) => hours * 60
const shift = (who: { id: number }, date: string, start: number, end: number) => ({
  id: nextId++,
  staffId: who.id,
  date,
  start: h(start),
  end: h(end),
})

// SPEC §3's example, then the rest of the week
const SPEC_WEEK = [
  shift(LISA, MON, 10, 18),
  shift(JOHN, MON, 10, 18),
  shift(SARAH, WED, 10, 18),
  shift(LISA, WED, 10, 16),
  shift(MIKE, THU, 10, 18),
  shift(SARAH, THU, 10, 16),
  shift(PRIYA, THU, 10, 21),
  shift(JOHN, SAT, 17, 21),
  shift(JOHN, SAT, 10, 14),
  shift(LISA, SUN, 10, 18),
]

describe('rosterDays', () => {
  const days = rosterDays({ weekStart: WEEK, staff: STAFF, shifts: SPEC_WEEK, closedDays: TUE_CLOSED })

  it('has the seven days, Monday first', () => {
    expect(days.map((d) => d.date)).toEqual([MON, TUE, WED, THU, FRI, SAT, SUN])
  })

  it('lists who is on each day in roster row order, whatever order the shifts were added', () => {
    expect(days[3].on.map((p) => p.name)).toEqual(['Priya Naidu', 'Sarah Dunn', 'Mike Tulloch'])
  })

  it('keeps whose each entry is, as well as their name', () => {
    expect(days[3].on.map((p) => p.staffId)).toEqual([PRIYA.id, SARAH.id, MIKE.id])
  })

  it('gives the times with plain hyphens, a split shift in time order', () => {
    expect(days[5].on).toEqual([{ staffId: JOHN.id, name: 'John Reyes', times: ['10:00-14:00', '17:00-21:00'] }])
  })

  it('marks a closed day, with no one on it', () => {
    expect(days[1]).toEqual({ date: TUE, closed: true, on: [] })
  })

  it('lists no one on a closed day even if shifts are somehow still there', () => {
    const [, tue] = rosterDays({
      weekStart: WEEK,
      staff: STAFF,
      shifts: [shift(JOHN, TUE, 10, 18)],
      closedDays: TUE_CLOSED,
    })
    expect(tue).toEqual({ date: TUE, closed: true, on: [] })
  })

  it('leaves an open day with no shifts empty', () => {
    expect(days[4]).toEqual({ date: FRI, closed: false, on: [] })
  })

  it('shows a shift ending at midnight as 24:00', () => {
    const [mon] = rosterDays({
      weekStart: WEEK,
      staff: STAFF,
      shifts: [shift(JOHN, MON, 17, 24)],
      closedDays: TUE_CLOSED,
    })
    expect(mon.on).toEqual([{ staffId: JOHN.id, name: 'John Reyes', times: ['17:00-24:00'] }])
  })
})

describe('rosterText', () => {
  const text = (shifts = SPEC_WEEK, weekStart = WEEK, closedDays = TUE_CLOSED) =>
    rosterText({ businessName: NAME, weekStart, days: rosterDays({ weekStart, staff: STAFF, shifts, closedDays }) })

  it("matches SPEC §3's example, and ends as a draft", () => {
    expect(text()).toBe(
      [
        'YOUR RESTAURANT — STAFF ROSTER',
        '5 Oct - 11 Oct 2026',
        '',
        'Mon 5 Oct',
        'John 10:00-18:00',
        'Lisa 10:00-18:00',
        '',
        'Tue 6 Oct - CLOSED',
        '',
        'Wed 7 Oct',
        'Lisa 10:00-16:00',
        'Sarah 10:00-18:00',
        '',
        'Thu 8 Oct',
        'Sarah 10:00-16:00',
        'Mike 10:00-18:00',
        'Priya 10:00-21:00',
        '',
        'Fri 9 Oct',
        '(no one rostered)',
        '',
        'Sat 10 Oct',
        'John 10:00-14:00, 17:00-21:00',
        '',
        'Sun 11 Oct',
        'Lisa 10:00-18:00',
        '',
        'DRAFT - not published yet',
      ].join('\n'),
    )
  })

  // The lines under a day's heading
  const dayLines = (text: string, label: string) => {
    const lines = text.split('\n')
    const from = lines.indexOf(label) + 1
    return lines.slice(from, lines.indexOf('', from))
  }

  it('runs each day from the shortest shift to the longest, a tie in roster row order', () => {
    const fri = [
      shift(MIKE, FRI, 10, 18),
      shift(PRIYA, FRI, 17, 21),
      shift(SARAH, FRI, 10, 18),
      shift(JOHN, FRI, 12, 22),
    ]
    expect(dayLines(text(fri), 'Fri 9 Oct')).toEqual([
      'Priya 17:00-21:00',
      'Sarah 10:00-18:00',
      'Mike 10:00-18:00',
      'John 12:00-22:00',
    ])
  })

  it('counts a split shift by its parts added together, not the span of the day', () => {
    // John's 10-14 and 18-22 make 8 hours, though they span 12
    const fri = [shift(JOHN, FRI, 10, 14), shift(JOHN, FRI, 18, 22), shift(PRIYA, FRI, 10, 19)]
    expect(dayLines(text(fri), 'Fri 9 Oct')).toEqual(['John 10:00-14:00, 18:00-22:00', 'Priya 10:00-19:00'])
  })

  it('sorts a week published before, its snapshot still in roster row order', () => {
    const on = [
      { staffId: PRIYA.id, name: 'Priya Naidu', times: ['10:00-21:00'] },
      { staffId: SARAH.id, name: 'Sarah Dunn', times: ['10:00-16:00'] },
    ]
    const days = [{ date: THU, closed: false, on }]
    const out = rosterText({ businessName: NAME, weekStart: WEEK, days, publishedAt: '2026-09-27', version: 1 })
    expect(dayLines(out, 'Thu 8 Oct')).toEqual(['Sarah 10:00-16:00', 'Priya 10:00-21:00'])
  })

  it('ends with the day it was published, once it has been', () => {
    const days = rosterDays({ weekStart: WEEK, staff: STAFF, shifts: SPEC_WEEK, closedDays: TUE_CLOSED })
    const last = (version: number) =>
      rosterText({ businessName: NAME, weekStart: WEEK, days, publishedAt: '2026-09-27', version }).split('\n').at(-1)
    expect(last(1)).toBe('Published 27 Sep 2026')
  })

  it('says Updated from the second version on, with the version', () => {
    const days = rosterDays({ weekStart: WEEK, staff: STAFF, shifts: SPEC_WEEK, closedDays: TUE_CLOSED })
    const text = rosterText({ businessName: NAME, weekStart: WEEK, days, publishedAt: '2026-10-08', version: 2 })
    expect(text.split('\n').at(-1)).toBe('Updated 8 Oct 2026 (v2)')
    expect(text).not.toContain('DRAFT')
  })

  it('names both years for a week that crosses New Year', () => {
    expect(text([], '2026-12-28', [false, false, false, false, false, false, false]).split('\n')[1]).toBe(
      '28 Dec 2026 - 3 Jan 2027',
    )
  })

  it('names both months for a week that crosses one', () => {
    expect(text([], '2026-09-28').split('\n')[1]).toBe('28 Sep - 4 Oct 2026')
  })
})
