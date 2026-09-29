import type { Metadata } from 'next'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import { TabBar } from '@/components/TabBar'
import { businessName } from '@/lib/db/queries'
import './globals.css'

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo' })
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
})

// The header and the tab title name the business, which is in the database,
// so every page renders on request
export const dynamic = 'force-dynamic'

export function generateMetadata(): Metadata {
  const app = `${businessName()} Roster`
  return { title: { default: app, template: `%s · ${app}` } }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${archivo.variable} ${plexMono.variable}`}>
      <body>
        <header className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-surface px-4 py-2 text-xs text-ink-2">
          <strong className="font-semibold text-ink">{businessName()}</strong>
          <TabBar />
        </header>
        <main className="mx-auto max-w-310 px-4 pt-4.5 pb-10">{children}</main>
      </body>
    </html>
  )
}
