import type { Metadata } from 'next'
import { LeaveTable } from '@/components/LeaveTable'
import { Card, PageHead } from '@/components/Page'
import { AddPersonButton, StaffList } from '@/components/StaffList'
import { today } from '@/lib/clock'
import { leaveList, staffList } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Staff' }

export default function StaffPage() {
  const staff = staffList()
  const leave = leaveList()
  const now = today()
  return (
    <div className="max-w-300">
      <PageHead title="Staff" action={<AddPersonButton />}>
        In roster order. Drag the handle to rearrange, and click someone to change their details.
      </PageHead>
      <StaffList staff={staff} leave={leave} today={now}>
        <Card title="Booked leave" id="leave">
          <p className="px-3.5 pt-3.5 text-[12.5px] text-ink-2">
            Leave blocks those days on the roster: no shift can go on them while someone is away. It spans as many
            weeks as it needs, and Clear week never touches it.
          </p>
          <LeaveTable
            leave={leave}
            staff={staff.filter((p) => p.active).map(({ id, name }) => ({ id, name }))}
            today={now}
          />
        </Card>
      </StaffList>
    </div>
  )
}
