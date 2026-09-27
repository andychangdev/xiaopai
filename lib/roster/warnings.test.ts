import { describe, expect, it } from 'vitest'
import type { Leave } from './leave'
import type { NaNote } from './notAvailable'
import { EVERY_DAY } from './staff'
import { buildWarnings, overlappingShifts } from './warnings'

// 5 – 11 Oct 2026
const WEEK = '2026-10-05'
const [MON, TUE, WED, THU, FRI, SAT, SUN] = ['05', '06', '07', '08', '09', '10', '11'].map((d) => `2026-10-${d}`)

let nextId = 1
const shift = (staffId: number, date: string, start: number, end: number) => ({
  id: nextId++,
  staffId,
  date,
  start,
  end,
})

const h = (hours: number) => hours * 60

const JOHN = { id: 7, name: 'John Reyes', expectedHours: null, available: EVERY_DAY }
const LISA = { id: 8, name: 'Lisa Chen', expectedHours: 20, available: EVERY_DAY }

const warnings = (
  staff: (typeof JOHN | typeof LISA)[],
  shifts: ReturnType<typeof shift>[],
  naNotes: NaNote[] = [],
  leave: Leave[] = [],
) => buildWarnings({ staff, shifts, naNotes, leave, weekStart: WEEK })

const texts = (...args: Parameters<typeof warnings>) => warnings(...args).map((w) => w.text)

describe('overlappingShifts', () => {
  it('picks out both of two shifts that overlap on the same day', () => {
    const a = shift(7, MON, h(10), h(18))
    const b = shift(7, MON, h(12), h(16))
    expect(overlappingShifts([a, b])).toEqual(new Set([a.id, b.id]))
  })

  it("doesn't count one shift ending as the next starts", () => {
    expect(overlappingShifts([shift(7, MON, h(10), h(14)), shift(7, MON, h(14), h(18))]).size).toBe(0)
  })

  it('leaves out a third shift that overlaps neither', () => {
    const a = shift(7, MON, h(10), h(14))
    const b = shift(7, MON, h(13), h(16))
    const c = shift(7, MON, h(17), h(21))
    expect(overlappingShifts([a, b, c])).toEqual(new Set([a.id, b.id]))
  })

  it('only compares shifts on the same day for the same person', () => {
    expect(
      overlappingShifts([shift(7, MON, h(10), h(18)), shift(7, TUE, h(10), h(18)), shift(8, MON, h(10), h(18))]).size,
    ).toBe(0)
  })
})

describe('buildWarnings', () => {
  it('has nothing to flag on an ordinary week', () => {
    const shifts = [shift(7, MON, h(10), h(18)), shift(8, MON, h(10), h(20)), shift(8, TUE, h(10), h(20))]
    expect(texts([JOHN, LISA], shifts)).toEqual([])
  })

  it('names the person each time', () => {
    const [warning] = warnings([JOHN], [shift(7, MON, h(10), h(18)), shift(7, MON, h(12), h(16))])
    expect(warning.who).toBe('John Reyes')
  })

  describe('overlapping shifts', () => {
    it('warns once for the person, however many overlap', () => {
      const shifts = [
        shift(7, MON, h(10), h(18)),
        shift(7, MON, h(12), h(16)),
        shift(7, THU, h(10), h(18)),
        shift(7, THU, h(17), h(21)),
      ]
      expect(texts([JOHN], shifts)).toEqual(['Two shifts overlap on the same day.'])
    })

    it('is serious', () => {
      const [w] = warnings([JOHN], [shift(7, MON, h(10), h(18)), shift(7, MON, h(12), h(16))])
      expect(w.level).toBe('high')
    })
  })

  describe('over 38 hours', () => {
    const days = [MON, TUE, THU, FRI]

    it('warns past 38 hours in the week', () => {
      const shifts = [...days.map((d) => shift(7, d, h(10), h(20))), shift(7, SAT, h(10), h(11))]
      expect(texts([JOHN], shifts)).toEqual(['41h rostered — over the 38h week.'])
    })

    it('keeps part hours in the text', () => {
      const shifts = [...days.map((d) => shift(7, d, h(10), h(19))), shift(7, SAT, h(10), h(12.5))]
      expect(texts([JOHN], shifts)).toEqual(['38.5h rostered — over the 38h week.'])
    })

    it('is serious', () => {
      const shifts = [...days.map((d) => shift(7, d, h(10), h(20))), shift(7, SAT, h(10), h(11))]
      const [w] = warnings([JOHN], shifts)
      expect(w.level).toBe('high')
    })

    it("doesn't warn at exactly 38 hours", () => {
      const shifts = [...days.map((d) => shift(7, d, h(10), h(19))), shift(7, SAT, h(10), h(12))]
      expect(texts([JOHN], shifts)).toEqual([])
    })
  })

  describe('rest between days', () => {
    it('warns when there are under 10 hours from finishing one day to starting the next', () => {
      expect(texts([JOHN], [shift(7, THU, h(12), h(23)), shift(7, FRI, h(7), h(15))])).toEqual([
        'Only 8h between Thu close and Fri start.',
      ])
    })

    it('keeps part hours in the text', () => {
      expect(texts([JOHN], [shift(7, THU, h(12), h(22.5)), shift(7, FRI, h(8), h(15))])).toEqual([
        'Only 9.5h between Thu close and Fri start.',
      ])
    })

    it("doesn't warn at exactly 10 hours", () => {
      expect(texts([JOHN], [shift(7, THU, h(10), h(21)), shift(7, FRI, h(7), h(15))])).toEqual([])
    })

    it("goes from the day's last finish to the next day's first start, across split shifts", () => {
      const shifts = [
        shift(7, THU, h(17), h(23)),
        shift(7, THU, h(10), h(14)),
        shift(7, FRI, h(15), h(20)),
        shift(7, FRI, h(8), h(12)),
      ]
      expect(texts([JOHN], shifts)).toEqual(['Only 9h between Thu close and Fri start.'])
    })

    it('only compares days next to each other', () => {
      expect(texts([JOHN], [shift(7, THU, h(12), h(24)), shift(7, SAT, h(7), h(15))])).toEqual([])
    })

    it('stays within the week, so Sunday has no next day', () => {
      expect(texts([JOHN], [shift(7, SUN, h(12), h(24)), shift(7, MON, h(7), h(15))])).toEqual([])
    })

    it('warns for each short gap', () => {
      const shifts = [shift(7, MON, h(14), h(23)), shift(7, TUE, h(7), h(23)), shift(7, SAT, h(7), h(12))]
      expect(texts([JOHN], shifts)).toEqual(['Only 8h between Mon close and Tue start.'])
      expect(texts([JOHN], [...shifts, shift(7, FRI, h(15), h(22))])).toEqual([
        'Only 8h between Mon close and Tue start.',
        'Only 9h between Fri close and Sat start.',
      ])
    })

    it('is only a caution', () => {
      const [w] = warnings([JOHN], [shift(7, THU, h(12), h(23)), shift(7, FRI, h(7), h(15))])
      expect(w.level).toBe('low')
    })
  })

  describe('not usually available', () => {
    const WEEKDAYS_ONLY = { ...JOHN, available: [true, true, true, true, true, false, false] }

    it('warns for a shift on a weekday outside their pattern', () => {
      expect(texts([WEEKDAYS_ONLY], [shift(7, SUN, h(10), h(18))])).toEqual(['Rostered on Sun — not usually available.'])
    })

    it('warns once a day, however many shifts are on it', () => {
      const shifts = [shift(7, SAT, h(10), h(14)), shift(7, SAT, h(17), h(21)), shift(7, SUN, h(10), h(18))]
      expect(texts([WEEKDAYS_ONLY], shifts)).toEqual([
        'Rostered on Sat — not usually available.',
        'Rostered on Sun — not usually available.',
      ])
    })

    it("doesn't warn on a day they're usually available, or a day off outside it", () => {
      expect(texts([WEEKDAYS_ONLY], [shift(7, MON, h(10), h(18))])).toEqual([])
    })

    it('is serious', () => {
      const [w] = warnings([WEEKDAYS_ONLY], [shift(7, SUN, h(10), h(18))])
      expect(w.level).toBe('high')
    })

    it("comes after the person's overlap and 38h warnings", () => {
      const shifts = [
        ...[MON, TUE, WED, THU].map((d) => shift(7, d, h(10), h(20))),
        shift(7, SAT, h(10), h(12)),
        shift(7, SAT, h(11), h(13)),
      ]
      expect(texts([WEEKDAYS_ONLY], shifts)).toEqual([
        'Two shifts overlap on the same day.',
        '44h rostered — over the 38h week.',
        'Rostered on Sat — not usually available.',
      ])
    })
  })

  describe('marked not available this week', () => {
    const FRI_NOTE = { staffId: 7, date: FRI }

    it('warns for a shift on a day marked not available', () => {
      expect(texts([JOHN], [shift(7, FRI, h(10), h(18))], [FRI_NOTE])).toEqual([
        'Rostered on Fri, marked not available this week.',
      ])
    })

    it('warns once a day, however many shifts are on it', () => {
      const shifts = [shift(7, FRI, h(10), h(14)), shift(7, FRI, h(17), h(21))]
      expect(texts([JOHN], shifts, [FRI_NOTE])).toEqual(['Rostered on Fri, marked not available this week.'])
    })

    it('replaces the availability warning when both apply', () => {
      const weekdaysOnly = { ...JOHN, available: [true, true, true, true, true, false, false] }
      const shifts = [shift(7, SAT, h(10), h(18)), shift(7, SUN, h(10), h(18))]
      expect(texts([weekdaysOnly], shifts, [{ staffId: 7, date: SUN }])).toEqual([
        'Rostered on Sat — not usually available.',
        'Rostered on Sun, marked not available this week.',
      ])
    })

    it("doesn't warn for a marked day left off, or someone else's note", () => {
      expect(texts([JOHN], [shift(7, THU, h(10), h(18))], [FRI_NOTE])).toEqual([])
      expect(texts([LISA], [shift(8, FRI, h(10), h(20)), shift(8, SAT, h(10), h(20))], [FRI_NOTE])).toEqual([])
    })

    it('is serious', () => {
      const [w] = warnings([JOHN], [shift(7, FRI, h(10), h(18))], [FRI_NOTE])
      expect(w.level).toBe('high')
    })
  })

  describe('rostered during booked leave', () => {
    // John away Wednesday to Friday, kept on shifts when it was booked
    const AWAY = { id: 1, staffId: 7, fromDate: WED, toDate: FRI, note: null }

    it('warns for a shift kept on a leave day', () => {
      expect(texts([JOHN], [shift(7, WED, h(10), h(18))], [], [AWAY])).toEqual([
        'Rostered on Wed, which is booked as leave.',
      ])
    })

    it('warns once a day, however many shifts are on it', () => {
      const shifts = [shift(7, THU, h(10), h(14)), shift(7, THU, h(17), h(21)), shift(7, FRI, h(10), h(18))]
      expect(texts([JOHN], shifts, [], [AWAY])).toEqual([
        'Rostered on Thu, which is booked as leave.',
        'Rostered on Fri, which is booked as leave.',
      ])
    })

    it('takes the place of an N/A warning for the same day', () => {
      const weekdaysOnly = { ...JOHN, available: [true, true, true, true, false, false, false] }
      const shifts = [shift(7, THU, h(10), h(18)), shift(7, FRI, h(10), h(18))]
      expect(texts([weekdaysOnly], shifts, [{ staffId: 7, date: THU }], [AWAY])).toEqual([
        'Rostered on Thu, which is booked as leave.',
        'Rostered on Fri, which is booked as leave.',
      ])
    })

    it("doesn't warn for days either side, or someone else's leave", () => {
      expect(texts([JOHN], [shift(7, TUE, h(10), h(18)), shift(7, SAT, h(10), h(18))], [], [AWAY])).toEqual([])
      expect(texts([LISA], [shift(8, WED, h(10), h(20)), shift(8, THU, h(10), h(20))], [], [AWAY])).toEqual([])
    })

    it('is serious', () => {
      const [w] = warnings([JOHN], [shift(7, WED, h(10), h(18))], [], [AWAY])
      expect(w.level).toBe('high')
    })
  })

  describe('expected hours', () => {
    it('warns more than 20% over, with the percentage', () => {
      const shifts = [shift(8, MON, h(10), h(21)), shift(8, TUE, h(10), h(21)), shift(8, THU, h(10), h(14))]
      expect(texts([LISA], shifts)).toEqual(['26h vs 20h expected — 30% over.'])
    })

    it('warns more than 20% under, with the percentage', () => {
      expect(texts([LISA], [shift(8, MON, h(10), h(18)), shift(8, TUE, h(10), h(14))])).toEqual([
        '12h vs 20h expected — 40% under.',
      ])
    })

    it('rounds a half percent away from expected, over or under', () => {
      const over = [shift(8, MON, h(10), h(22)), shift(8, TUE, h(10), h(22.5))]
      expect(texts([LISA], over)).toEqual(['24.5h vs 20h expected — 23% over.'])
      const under = [shift(8, MON, h(10), h(18)), shift(8, TUE, h(10), h(17.5))]
      expect(texts([LISA], under)).toEqual(['15.5h vs 20h expected — 23% under.'])
    })

    it("doesn't warn within 20%, without expected hours, or with no hours this week", () => {
      expect(texts([LISA], [shift(8, MON, h(10), h(22)), shift(8, TUE, h(10), h(22))])).toEqual([])
      expect(texts([JOHN], [shift(7, MON, h(10), h(12))])).toEqual([])
      expect(texts([LISA], [])).toEqual([])
    })

    it('is only a caution', () => {
      const [w] = warnings([LISA], [shift(8, MON, h(10), h(14))])
      expect(w.level).toBe('low')
    })
  })

  describe('order', () => {
    it('lists the serious warnings first, then the rest, each in row order', () => {
      const shifts = [
        shift(7, THU, h(12), h(23)),
        shift(7, FRI, h(7), h(15)),
        shift(8, MON, h(10), h(18)),
        shift(8, MON, h(12), h(16)),
      ]
      expect(warnings([JOHN, LISA], shifts)).toEqual([
        { level: 'high', who: 'Lisa Chen', text: 'Two shifts overlap on the same day.' },
        { level: 'low', who: 'John Reyes', text: 'Only 8h between Thu close and Fri start.' },
        { level: 'low', who: 'Lisa Chen', text: '12h vs 20h expected — 40% under.' },
      ])
    })
  })
})
