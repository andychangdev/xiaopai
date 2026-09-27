import { describe, expect, it } from 'vitest'
import { backupFile } from './backup'

const TABLES = {
  staff: [{ id: 1, name: 'John Reyes', active: true, available: [true, true, false, true, true, true, true] }],
  settings: [{ id: 1, businessName: 'Xiao Pai' }],
  shifts: [{ id: 7, weekStart: '2026-10-05', staffId: 1, date: '2026-10-08', start: 600, end: 1260, note: null }],
  leave: [],
}

describe('backupFile', () => {
  const file = backupFile(TABLES, '2026-09-27')
  const read = JSON.parse(file.json)

  it('is named with the date', () => {
    expect(file.name).toBe('xiaopai-2026-09-27.json')
  })

  it('holds every table it was given, row for row, empty ones too', () => {
    expect(read.tables).toEqual(TABLES)
  })

  it('says when it was made, and how to read the times, dates and weekdays', () => {
    expect(read.exported).toBe('2026-09-27')
    expect(read.about).toMatch(/minutes since midnight \(600 is 10:00\)/)
    expect(read.about).toMatch(/YYYY-MM-DD/)
    expect(read.about).toMatch(/Monday/)
  })

  it('says it can only be read, and that the database file is the real backup', () => {
    expect(read.about).toMatch(/can't be imported/)
    expect(read.about).toMatch(/xiaopai\.db/)
  })

  it('is laid out to be read, one field to a line', () => {
    expect(file.json).toContain('\n  "exported": "2026-09-27",\n')
    expect(file.json).toContain('\n        "name": "John Reyes",\n')
    expect(file.json.endsWith('\n')).toBe(true)
  })

  it('keeps a list of plain values on one line, like the seven weekday flags', () => {
    expect(file.json).toContain('"available": [true, true, false, true, true, true, true]\n')
    expect(file.json).toContain('"leave": []')
  })

  it('writes a date and time as JSON.stringify would', () => {
    const tables = { log: [{ id: 1, at: new Date(Date.UTC(2026, 8, 27, 1, 30)) }] }
    expect(JSON.parse(backupFile(tables, '2026-09-27').json).tables.log[0].at).toBe('2026-09-27T01:30:00.000Z')
  })

  it("reads back the same whatever's in the text, brackets and commas included", () => {
    const tables = { staff: [{ id: 1, notes: '[  ], {a, b}', tags: ['x, y', ']'] }] }
    expect(JSON.parse(backupFile(tables, '2026-09-27').json).tables).toEqual(tables)
  })
})
