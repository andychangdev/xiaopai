import type { Metadata } from 'next'
import { LeaveTimeline } from '@/components/LeaveTimeline'
import { PageHead } from '@/components/Page'
import { StaffList } from '@/components/StaffList'
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
      <PageHead title="Staff">Everyone you roster, and the leave they&apos;ve booked.</PageHead>
      <StaffList staff={staff} leave={leave} today={now}>
        <LeaveTimeline
          leave={leave}
          order={staff.map((p) => p.id)}
          staff={staff.filter((p) => p.active).map(({ id, name }) => ({ id, name }))}
          today={now}
        />
      </StaffList>
    </div>
  )
}
