import { describe, expect, it } from 'vitest'
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

const warnings = (staff: (typeof JOHN | typeof LISA)[], shifts: ReturnType<typeof shift>[]) =>
  buildWarnings({ staff, shifts, weekStart: WEEK })

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
