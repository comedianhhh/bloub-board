import { Link } from '@tanstack/react-router'

import { useLocale } from '../i18n/context.tsx'
import { en } from '../i18n/locales/en.ts'
import { Mascot } from './bloub.tsx'
import { LocaleSwitcher } from './locale-switcher.tsx'

export function SiteHeader() {
  const { copy } = useLocale()
  return (
    <header className="site-header">
      <Link className="wordmark" to="/" aria-label={copy.homeAria}>
        <Mascot mood="idle" size={30} follow={false} frozenAt={0.3} />
        <span>Bloub Board</span>
      </Link>
      <nav className="header-nav" aria-label={copy.navSite}>
        <Link to="/rules">{copy.navRules}</Link>
        <Link to="/stats">{copy.navStats ?? en.navStats}</Link>
        <LocaleSwitcher />
      </nav>
    </header>
  )
}

export function SiteFooter() {
  const { copy } = useLocale()
  return (
    <footer className="site-footer">
      <p>{copy.boardFooter ?? en.boardFooter}</p>
      <nav className="footer-nav">
        <Link to="/rules">{copy.navRules}</Link>
        <Link to="/stats">{copy.footerStats}</Link>
      </nav>
    </footer>
  )
}
