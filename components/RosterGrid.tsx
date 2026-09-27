import Link from 'next/link'
import { dayName, shortDate, weekDates, type IsoDate } from '@/lib/roster/dates'

type Props = {
  week: IsoDate
  staff: { id: number; name: string }[]
}

const headCell =
  'border-b border-line-strong bg-surface-3 px-2 py-[9px] text-[11px] font-semibold tracking-[0.1em] text-ink-2 uppercase'

export function RosterGrid({ week, staff }: Props) {
  const days = weekDates(week)
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="overflow-x-auto">
        <div className="roster-grid">
          <div className={`${headCell} border-r border-r-line`}>Staff</div>
          {days.map((date) => (
            <div key={date} className={`${headCell} text-center`}>
              {dayName(date)}
              <span className="block font-mono text-[11px] font-normal tracking-normal text-ink-3 normal-case">
                {shortDate(date)}
              </span>
            </div>
          ))}

          {staff.map((person) => (
            <Row key={person.id} name={person.name} days={days} />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line bg-surface-3 px-3 py-2.5">
        <Link href="/staff" className="btn">
          Manage staff
        </Link>
      </div>
    </div>
  )
}

function Row({ name, days }: { name: string; days: IsoDate[] }) {
  return (
    <>
      <div className="border-r border-b border-line bg-surface-3 px-2.5 py-[9px]">
        <div className="text-[13.5px] font-semibold tracking-[-0.005em]">{name}</div>
      </div>
      {days.map((date) => (
        <div key={date} className="flex min-h-14 flex-col gap-1 border-r border-b border-line p-[5px]" />
      ))}
    </>
  )
}
