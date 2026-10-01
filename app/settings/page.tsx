import type { Metadata } from 'next'
import { BusinessName } from '@/components/BusinessName'
import { HolidaysTable } from '@/components/HolidaysTable'
import { Card, PageHead } from '@/components/Page'
import { PayRateFields } from '@/components/PayRateFields'
import { TemplatesTable } from '@/components/TemplatesTable'
import { TradingHoursTable } from '@/components/TradingHoursTable'
import { today } from '@/lib/clock'
import { businessName, holidayList, payRates, templateList, tradingHoursWeek } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="max-w-210">
      <PageHead title="Settings">
        The business&apos;s name, trading hours, shift templates and pay rates: the things that hold from week to
        week.
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
      <Card title="Pay rates">
        <p className="px-3.5 pt-3.5 text-[12.5px] text-ink-2">
          For the estimated cost under the roster. Each is a percentage of the person&apos;s hourly rate on the
          Staff page: 125% is time and a quarter, and 100% is nothing extra. The weekend is Saturday and Sunday, and
          a public holiday at the weekend takes whichever rate is higher.
        </p>
        <PayRateFields {...payRates()} />
      </Card>
      <Card title="Public holidays">
        <p className="px-3.5 pt-3.5 text-[12.5px] text-ink-2">
          Costed at the public holiday rate, in whatever week they fall. Nothing else changes: if the shop shuts,
          close the day on the roster too.
        </p>
        <HolidaysTable holidays={holidayList()} today={today()} />
      </Card>
      <Card title="Backup">
        <p className="px-3.5 pt-3.5 text-[12.5px] text-ink-2">
          Everything in the app as one JSON file, named with today&apos;s date, to read and keep. It can&apos;t be
          loaded back in: the real backup is a copy of <code className="font-mono">xiaopai.db</code>.
        </p>
        <div className="p-3.5">
          {/* A plain link, not next/link: the file downloads rather than opening as a page */}
          <a href="/settings/backup" download className="btn">
            Export backup
          </a>
        </div>
      </Card>
    </div>
  )
}
