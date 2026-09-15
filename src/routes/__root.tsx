import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

import { LocaleProvider, useLocale } from '../i18n/context.tsx'
import { LOCALE_BOOT_SCRIPT } from '../i18n/locale.ts'
import { resolveRequestLocale } from '../server/locale.ts'
import appCss from '../styles.css?url'

const loadLocale = createServerFn({ method: 'GET' }).handler(() => {
  return { locale: resolveRequestLocale() }
})

export const Route = createRootRoute({
  loader: () => loadLocale(),
  component: RootLayout,
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { title: 'Bloub Board · a public board you pay to be on' },
      {
        name: 'description',
        content: 'Bid for a verified place on the Bloub Board product leaderboard.',
      },
      { property: 'og:title', content: 'Bloub Board · a public board you pay to be on' },
      { property: 'og:description', content: 'Bid for a verified place on the Bloub Board product leaderboard.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Bloub Board' },
      { property: 'og:url', content: 'https://bloub-board.alan996.workers.dev/' },
      { name: 'twitter:title', content: 'Bloub Board · a public board you pay to be on' },
      { property: 'og:image', content: 'https://bloub-board.alan996.workers.dev/og-image.webp' },
      { property: 'og:image:type', content: 'image/webp' },
      { property: 'og:image:width', content: '2400' },
      { property: 'og:image:height', content: '1260' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: 'https://bloub-board.alan996.workers.dev/og-image.webp' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.png', type: 'image/png', sizes: '128x128' },
      { rel: 'apple-touch-icon', href: '/icon-512.png' },
      { rel: 'alternate', type: 'text/plain', href: '/llms.txt' },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

// Every claim here is also stated in visible copy on the board or in /rules.
const SITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://bloub-board.alan996.workers.dev/#org',
      name: 'Bloub Board',
      url: 'https://bloub-board.alan996.workers.dev/',
      logo: 'https://bloub-board.alan996.workers.dev/icon-512.png',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://bloub-board.alan996.workers.dev/#site',
      name: 'Bloub Board',
      url: 'https://bloub-board.alan996.workers.dev/',
      publisher: { '@id': 'https://bloub-board.alan996.workers.dev/#org' },
      inLanguage: 'en',
    },
    {
      '@type': 'WebApplication',
      name: 'Bloub Board',
      url: 'https://bloub-board.alan996.workers.dev/',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'A public paid leaderboard. Pay for a URL or X handle listing. Rank follows the current paid amount, which falls 3% a day.',
      offers: {
        '@type': 'Offer',
        price: '1',
        priceCurrency: 'USD',
        description: 'Minimum $1 for a ranked listing, in whole-dollar steps.',
      },
      publisher: { '@id': 'https://bloub-board.alan996.workers.dev/#org' },
    },
  ],
}

function RootLayout() {
  const { locale } = Route.useLoaderData()
  return (
    <LocaleProvider initialLocale={locale}>
      <Outlet />
    </LocaleProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOT_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_SCHEMA) }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  const { copy } = useLocale()
  return (
    <main className="site-shell">
      <section className="page-panel">
        <p className="page-kicker">404</p>
        <h1>{copy.notFoundTitle}</h1>
        <p className="page-lead">{copy.notFoundLead}</p>
        <Link className="primary-button modal-primary" to="/">
          {copy.backToBoard}
        </Link>
      </section>
    </main>
  )
}
