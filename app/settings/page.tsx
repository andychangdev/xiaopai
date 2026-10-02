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
      <PageHead title="Settings">
        The things that hold from week to week. Anything about one week is done on the roster.
      </PageHead>
      <div className="@container rounded-card border border-line bg-surface">
        <Section id="business" title="Business name" note="Heads every page and the roster text you paste into the group chat.">
          <BusinessName name={businessName()} />
        </Section>
        <Section
          id="trading-hours"
          title="Trading hours"
          note="Shown under the roster. Nothing else depends on them, so a shift can still start or end outside them."
        >
          <TradingHours week={week} />
        </Section>
        <Section
          id="shift-templates"
          title="Shift templates"
          note="One click each when you add a shift. Changing or removing one leaves shifts already placed as they are."
        >
          <Templates templates={templateList()} week={week} />
        </Section>
        <Section
          id="pay-rates"
          title="Pay rates"
          note="For the estimated cost on the roster, as a share of each person's hourly rate."
        >
          <PayRateFields {...payRates()} />
          <p className="mt-2.5 text-[11.5px] leading-snug text-ink-3">
            125% is time and a quarter, and 100% is nothing extra. The weekend is Saturday and Sunday, and a public
            holiday at the weekend takes whichever rate is higher.
          </p>
        </Section>
        <Section
          id="public-holidays"
          title="Public holidays"
          note="Costed at the public holiday rate. Nothing else changes: if the shop shuts, close the day on the roster too."
        >
          <div className={flush}>
            <HolidaysTable holidays={holidayList()} today={today()} />
          </div>
        </Section>
        <Section
          id="backup"
          title="Backup"
          note={
            <>
              Everything as one JSON file, named with today&apos;s date, to read and keep. It can&apos;t be loaded back
              in: the real backup is a copy of <code className="font-mono">xiaopai.db</code>.
            </>
          }
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
