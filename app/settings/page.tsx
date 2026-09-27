import type { Metadata } from 'next'
import { BusinessName } from '@/components/BusinessName'
import { Card, PageHead } from '@/components/Page'
import { TemplatesTable } from '@/components/TemplatesTable'
import { TradingHoursTable } from '@/components/TradingHoursTable'
import { businessName, templateList, tradingHoursWeek } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="max-w-[840px]">
      <PageHead title="Settings">
        The business&apos;s name, trading hours and shift templates: the things that hold from week to week.
        Anything about one week in particular is done on the roster itself.
      </PageHead>
      <Card title="Business name">
        <p className="px-3.5 pt-3.5 text-[12.5px] text-ink-2">
          At the top of every page, and heading the roster text you paste into the group chat.
        </p>
        <BusinessName name={businessName()} />
      </Card>
      <Card title="The week">
        <p className="px-3.5 pt-3.5 text-[12.5px] text-ink-2">
          Shown under the roster. Nothing else depends on them, so a shift can still start or end outside them.
        </p>
        <TradingHoursTable week={tradingHoursWeek()} />
      </Card>
      <Card title="Shift templates">
        <p className="px-3.5 pt-3.5 text-[12.5px] text-ink-2">
          One click each when you add a shift, and the times stay editable after you place one. Changing or
          removing a template leaves shifts already on the roster as they are.
        </p>
        <TemplatesTable templates={templateList()} />
      </Card>
    </div>
  )
}
