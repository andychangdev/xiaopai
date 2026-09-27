import { describe, expect, it } from 'vitest'
import { cellKey, copyShift, shiftsByCell, shiftsLabel } from './shifts'

const shift = (id: number, staffId: number, date: string, start: number, end: number) => ({
  id,
  staffId,
  date,
  start,
  end,
})

describe('shiftsByCell', () => {
  it('files each shift under its person and date', () => {
    const cells = shiftsByCell([shift(1, 7, '2026-10-05', 600, 1080), shift(2, 8, '2026-10-05', 600, 960)])
    expect(cells.get(cellKey(7, '2026-10-05'))?.map((s) => s.id)).toEqual([1])
    expect(cells.get(cellKey(8, '2026-10-05'))?.map((s) => s.id)).toEqual([2])
    expect(cells.get(cellKey(7, '2026-10-06'))).toBeUndefined()
  })

  it('stacks the shifts in a cell in start-time order, whatever order they were added', () => {
    const cells = shiftsByCell([
      shift(1, 7, '2026-10-05', 1020, 1260),
      shift(2, 7, '2026-10-05', 600, 840),
      shift(3, 7, '2026-10-05', 840, 960),
    ])
    expect(cells.get(cellKey(7, '2026-10-05'))?.map((s) => s.id)).toEqual([2, 3, 1])
  })

  it('breaks a start-time tie by id, so chips never swap between renders', () => {
    const cells = shiftsByCell([shift(5, 7, '2026-10-05', 600, 960), shift(4, 7, '2026-10-05', 600, 1080)])
    expect(cells.get(cellKey(7, '2026-10-05'))?.map((s) => s.id)).toEqual([4, 5])
  })
})

describe('copyShift', () => {
  const source = shift(1, 7, '2026-10-05', 600, 1080)

  it('puts the same times in another day for the same person', () => {
    expect(copyShift(source, { staffId: 7, date: '2026-10-07' }, [])).toEqual({
      staffId: 7,
      date: '2026-10-07',
      start: 600,
      end: 1080,
    })
  })

  it("puts the same times in someone else's cell", () => {
    expect(copyShift(source, { staffId: 8, date: '2026-10-05' }, [])).toEqual({
      staffId: 8,
      date: '2026-10-05',
      start: 600,
      end: 1080,
    })
  })

  it('sits alongside the shifts already in the cell', () => {
    expect(copyShift(source, { staffId: 8, date: '2026-10-06' }, [shift(2, 8, '2026-10-06', 1020, 1260)])).toEqual({
      staffId: 8,
      date: '2026-10-06',
      start: 600,
      end: 1080,
    })
  })

  it('leaves the original as it was', () => {
    copyShift(source, { staffId: 8, date: '2026-10-06' }, [])
    expect(source).toEqual(shift(1, 7, '2026-10-05', 600, 1080))
  })

  it('has nothing to add to the cell it came from', () => {
    expect(copyShift(source, { staffId: 7, date: '2026-10-05' }, [source])).toBeNull()
  })

  it('has nothing to add to a cell it was already pasted into', () => {
    expect(copyShift(source, { staffId: 8, date: '2026-10-06' }, [shift(3, 8, '2026-10-06', 600, 1080)])).toBeNull()
  })

  it('can go back into the cell it came from once the original is gone', () => {
    expect(copyShift(source, { staffId: 7, date: '2026-10-05' }, [])).toEqual({
      staffId: 7,
      date: '2026-10-05',
      start: 600,
      end: 1080,
    })
  })
})

describe('shiftsLabel', () => {
  it('counts one shift, or several', () => {
    expect(shiftsLabel(1)).toBe('1 shift')
    expect(shiftsLabel(12)).toBe('12 shifts')
    expect(shiftsLabel(0)).toBe('0 shifts')
  })
})
