import { describe, expect, it } from 'vitest'
import { cellKey, shiftsByCell } from './shifts'

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
