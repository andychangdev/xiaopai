import type { Metadata, Viewport } from 'next'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import { Sidebar } from '@/components/Sidebar'
import { businessName } from '@/lib/db/queries'
import { businessInitial } from '@/lib/roster/settings'
import './globals.css'

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo' })
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
})

// The sidebar and the tab title name the business, which is in the database,
// so every page renders on request
export const dynamic = 'force-dynamic'

// Cover, so the phone's bottom bar can sit clear of the home indicator
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export function generateMetadata(): Metadata {
  const app = `${businessName()} Roster`
  return { title: { default: app, template: `%s · ${app}` } }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const name = businessName()
  return (
    <html lang="en-AU" className={`${archivo.variable} ${plexMono.variable}`}>
      <body>
        <div className="sm:grid sm:grid-cols-[72px_minmax(0,1fr)]">
          <Sidebar businessName={name} initial={businessInitial(name)} />
          <main className="mx-auto w-full max-w-400 px-4 pt-4.5 pb-[calc(var(--bottom-bar)+40px)]">{children}</main>
        </div>
      </body>
    </html>
  )
}
