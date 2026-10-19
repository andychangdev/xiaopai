import type { Metadata } from 'next'
import { BusinessName } from '@/components/BusinessName'
import { HolidaysTable } from '@/components/HolidaysTable'
import { PageHead, Section } from '@/components/Page'
import { PayRateFields } from '@/components/PayRateFields'
import { Templates } from '@/components/Templates'
import { TradingHours } from '@/components/TradingHours'
import { today } from '@/lib/clock'
import { businessName, holidayList, payRates, templateList, tradingHoursWeek } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Settings' }

// Tables keep their cells' padding, so they reach out to line their text up with the rest
const flush = '-mx-3'

export default function SettingsPage() {
  const week = tradingHoursWeek()
  return (
    <div className="max-w-225">
      <PageHead title="Settings" />
      <div className="@container rounded-card border border-line bg-surface">
        <Section id="business" title="Business name" note="Shown on every page and the shared roster.">
          <BusinessName name={businessName()} />
        </Section>
        <Section
          id="trading-hours"
          title="Trading hours"
          note="Shown under the roster."
        >
          <TradingHours week={week} />
        </Section>
        <Section
          id="shift-templates"
          title="Shift templates"
          note="Quick picks when adding a shift."
        >
          <Templates templates={templateList()} week={week} />
        </Section>
        <Section
          id="pay-rates"
          title="Pay rates"
          note="As a percentage of each person's hourly rate, for the estimated roster cost."
        >
          <PayRateFields {...payRates()} />
        </Section>
        <Section
          id="public-holidays"
          title="Public holidays"
          note="Paid at the public holiday rate."
        >
          <div className={flush}>
            <HolidaysTable holidays={holidayList()} today={today()} />
          </div>
        </Section>
        <Section
          id="backup"
          title="Backup"
          note="Download everything as a JSON file. It can't be imported back in."
        >
          {/* A plain link, not next/link: the file downloads rather than opening as a page */}
          <a href="/settings/backup" download className="btn">
            Export backup
          </a>
        </Section>
      </div>
    </div>
  )
}
