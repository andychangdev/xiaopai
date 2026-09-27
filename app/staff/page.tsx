import type { Metadata } from 'next'
import { Card, PageHead } from '@/components/Page'
import { StaffTable } from '@/components/StaffTable'
import { staffList } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Staff' }

export default function StaffPage() {
  return (
    <div className="max-w-[840px]">
      <PageHead title="Staff">
        Rows appear on the roster in this order, so use ↑↓ to arrange them the way you think about your staff.
        Everyone active appears on every week&apos;s roster. Unticking Active takes someone off new weeks, but
        leaves them on any week where they already have shifts.
      </PageHead>
      <Card title="People">
        <StaffTable staff={staffList()} />
      </Card>
    </div>
  )
}
