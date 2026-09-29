import { describe, expect, it } from 'vitest'
import { firstName, moveInOrder, parseExpectedHours, parseName, parseNotes, rosterRows, whyNotRemovable } from './staff'

const person = (id: number, sortOrder: number, active = true) => ({ id, sortOrder, active, name: `P${id}` })

describe('rosterRows', () => {
  it('lists active staff in their set order, not the order they arrive in', () => {
    const staff = [person(1, 2), person(2, 0), person(3, 1)]
    expect(rosterRows(staff, []).map((p) => p.id)).toEqual([2, 3, 1])
  })

  it('leaves out inactive staff with no shifts that week', () => {
    const staff = [person(1, 0), person(2, 1, false), person(3, 2)]
    expect(rosterRows(staff, []).map((p) => p.id)).toEqual([1, 3])
  })

  it('keeps inactive staff who have shifts that week, in their usual place', () => {
    const staff = [person(1, 0), person(2, 1, false), person(3, 2)]
    expect(rosterRows(staff, [{ staffId: 2 }]).map((p) => p.id)).toEqual([1, 2, 3])
  })

  it('breaks a sort order tie by id, so rows never swap between renders', () => {
    const staff = [person(5, 0), person(4, 0)]
    expect(rosterRows(staff, []).map((p) => p.id)).toEqual([4, 5])
  })
})

describe('moveInOrder', () => {
  const rows = (...ids: number[]) => ids.map((id) => ({ id }))
  const move = (ids: number[], id: number, to: number) => moveInOrder(rows(...ids), id, to).map((p) => p.id)

  it('moves a person one place up', () => {
    expect(move([1, 2, 3], 3, 1)).toEqual([1, 3, 2])
  })

  it('moves a person one place down', () => {
    expect(move([1, 2, 3], 1, 1)).toEqual([2, 1, 3])
  })

  it('moves a person several places either way', () => {
    expect(move([1, 2, 3, 4], 4, 0)).toEqual([4, 1, 2, 3])
    expect(move([1, 2, 3, 4], 1, 3)).toEqual([2, 3, 4, 1])
  })

  it('stops at either end', () => {
    expect(move([1, 2, 3], 1, -1)).toEqual([1, 2, 3])
    expect(move([1, 2, 3], 3, 3)).toEqual([1, 2, 3])
  })

  it('does nothing for someone not in the list', () => {
    expect(move([1, 2, 3], 9, 0)).toEqual([1, 2, 3])
  })

  it('leaves the list it was given alone', () => {
    const list = rows(1, 2, 3)
    moveInOrder(list, 1, 1)
    expect(list.map((p) => p.id)).toEqual([1, 2, 3])
  })
})

describe('firstName', () => {
  it('is the first word of the name', () => {
    expect(firstName('John Reyes')).toBe('John')
    expect(firstName('Mary Anne  Lee')).toBe('Mary')
  })

  it('is the whole name when there is only one word', () => {
    expect(firstName('Priya')).toBe('Priya')
  })
})

describe('parseName', () => {
  it('trims the name', () => {
    expect(parseName('  Lisa Chen ')).toBe('Lisa Chen')
  })

  it('refuses a blank name', () => {
    expect(parseName('')).toBeNull()
    expect(parseName('   ')).toBeNull()
  })
})

describe('parseNotes', () => {
  it('trims notes, and treats blank as none', () => {
    expect(parseNotes(' Uni on Tuesdays ')).toBe('Uni on Tuesdays')
    expect(parseNotes('  ')).toBeNull()
  })
})

describe('parseExpectedHours', () => {
  it('treats blank as no expected hours', () => {
    expect(parseExpectedHours('')).toEqual({ ok: true, value: null })
    expect(parseExpectedHours('  ')).toEqual({ ok: true, value: null })
  })

  it('accepts whole hours from 1 to 80', () => {
    expect(parseExpectedHours('24')).toEqual({ ok: true, value: 24 })
    expect(parseExpectedHours(' 1 ')).toEqual({ ok: true, value: 1 })
    expect(parseExpectedHours('80')).toEqual({ ok: true, value: 80 })
  })

  it('refuses anything else', () => {
    for (const bad of ['0', '81', '-5', '20.5', '1e2', 'twenty', '24h']) {
      expect(parseExpectedHours(bad), bad).toEqual({ ok: false })
    }
  })
})

describe('whyNotRemovable', () => {
  const john = { name: 'John Reyes', active: true }

  it('allows removing someone who has never had a shift or leave', () => {
    expect(whyNotRemovable(john, { shifts: 0, leave: 0 })).toBeNull()
  })

  it('refuses someone with shifts, and says to untick Active', () => {
    expect(whyNotRemovable(john, { shifts: 12, leave: 0 })).toBe(
      'John Reyes has 12 shifts on record. Untick Active instead: that takes them off new weeks, ' +
        'and removing the record would leave holes in past rosters.',
    )
  })

  it('counts a single shift in the singular', () => {
    expect(whyNotRemovable(john, { shifts: 1, leave: 0 })).toMatch(/^John Reyes has 1 shift on record\./)
  })

  it('refuses someone with booked leave', () => {
    expect(whyNotRemovable(john, { shifts: 0, leave: 2 })).toMatch(/^John Reyes has booked leave on record\./)
    expect(whyNotRemovable(john, { shifts: 3, leave: 1 })).toMatch(
      /^John Reyes has 3 shifts and booked leave on record\./,
    )
  })

  it("doesn't tell you to untick Active for someone already inactive", () => {
    expect(whyNotRemovable({ ...john, active: false }, { shifts: 4, leave: 0 })).toBe(
      'John Reyes has 4 shifts on record. Being inactive already keeps them off new weeks, ' +
        'and removing the record would leave holes in past rosters.',
    )
  })
})
