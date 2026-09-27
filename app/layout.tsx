import type { Metadata } from 'next'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import { TabBar } from '@/components/TabBar'
import './globals.css'

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo' })
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
})

export const metadata: Metadata = {
  title: { default: 'Ah Ma Roster', template: '%s · Ah Ma Roster' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${archivo.variable} ${plexMono.variable}`}>
      <body>
        <header className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line bg-surface-2 px-4 py-2 text-xs text-ink-2">
          <strong className="font-semibold text-ink">Ah Ma</strong>
          <TabBar />
        </header>
        <main className="mx-auto max-w-[1240px] px-4 pt-[18px] pb-10">{children}</main>
      </body>
    </html>
  )
}
