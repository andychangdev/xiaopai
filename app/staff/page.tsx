import type { Metadata } from 'next'
import { LeaveTable } from '@/components/LeaveTable'
import { Card, PageHead } from '@/components/Page'
import { StaffTable } from '@/components/StaffTable'
import { today } from '@/lib/clock'
import { leaveList, staffList } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Staff' }

export default function StaffPage() {
  const staff = staffList()
  return (
    <div className="max-w-[840px]">
      <PageHead title="Staff">
        Rows appear on the roster in this order, so use ↑↓ to arrange them the way you think about your staff.
        Everyone active appears on every week&apos;s roster. Available is the weekdays someone can normally
        work: rostering them on another day raises a warning, but is never blocked. Unticking Active takes
        someone off new weeks, but leaves them on any week where they already have shifts.
      </PageHead>
      <Card title="People">
        <StaffTable staff={staff} />
      </Card>
      <Card title="Booked leave" id="leave">
        <p className="px-3.5 pt-3.5 text-[12.5px] text-ink-2">
          Leave blocks those days on the roster: no shift can go on them while someone is away. It spans as many
          weeks as it needs, and Clear week never touches it.
        </p>
        <LeaveTable leave={leaveList()} staff={staff.filter((p) => p.active).map(({ id, name }) => ({ id, name }))} today={today()} />
      </Card>
    </div>
  )
}
