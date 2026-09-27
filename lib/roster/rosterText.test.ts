import { describe, expect, it } from 'vitest'
import { rosterDays, rosterText } from './rosterText'

// 5 – 11 Oct 2026, with Tuesday closed
const WEEK = '2026-10-05'
const [MON, TUE, WED, THU, FRI, SAT, SUN] = ['05', '06', '07', '08', '09', '10', '11'].map((d) => `2026-10-${d}`)
const TUE_CLOSED = [false, true, false, false, false, false, false]

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

  it('gives the times with plain hyphens, a split shift in time order', () => {
    expect(days[5].on).toEqual([{ name: 'John Reyes', times: ['10:00-14:00', '17:00-21:00'] }])
  })

  it('marks a closed day, with no one on it', () => {
    expect(days[1]).toEqual({ date: TUE, closed: true, on: [] })
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
    expect(mon.on).toEqual([{ name: 'John Reyes', times: ['17:00-24:00'] }])
  })
})

describe('rosterText', () => {
  const text = (shifts = SPEC_WEEK, weekStart = WEEK, closedDays = TUE_CLOSED) =>
    rosterText({ weekStart, days: rosterDays({ weekStart, staff: STAFF, shifts, closedDays }) })

  it("matches SPEC §3's example, and ends as a draft", () => {
    expect(text()).toBe(
      [
        'AH MA — STAFF ROSTER',
        '5 Oct - 11 Oct 2026',
        '',
        'Mon 5 Oct',
        'John 10:00-18:00',
        'Lisa 10:00-18:00',
        '',
        'Tue 6 Oct - CLOSED',
        '',
        'Wed 7 Oct',
        'Sarah 10:00-18:00',
        'Lisa 10:00-16:00',
        '',
        'Thu 8 Oct',
        'Priya 10:00-21:00',
        'Sarah 10:00-16:00',
        'Mike 10:00-18:00',
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

  it('names both years for a week that crosses New Year', () => {
    expect(text([], '2026-12-28', [false, false, false, false, false, false, false]).split('\n')[1]).toBe(
      '28 Dec 2026 - 3 Jan 2027',
    )
  })

  it('names both months for a week that crosses one', () => {
    expect(text([], '2026-09-28').split('\n')[1]).toBe('28 Sep - 4 Oct 2026')
  })
})
