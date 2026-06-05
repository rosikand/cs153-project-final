import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import ThemeToggle from './ThemeToggle.jsx'

export function Logo({ className = '' }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`}>
      <span className="text-2xl leading-none text-primary drop-shadow-[0_0_10px_var(--primary)]">◐</span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight">Parallax</span>
        <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          Agentic Satellite Query Engine
        </span>
      </span>
    </Link>
  )
}

export default function TopNav() {
  const { pathname } = useLocation()
  const link = (to, label) => (
    <Link
      to={to}
      className={`text-sm transition-colors hover:text-foreground ${
        pathname === to ? 'text-foreground' : 'text-muted-foreground'
      }`}
    >
      {label}
    </Link>
  )
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-5">
      <Logo />
      <nav className="flex items-center gap-5">
        {link('/how-it-works', 'How it works')}
        {link('/impact', 'Impact')}
        {link('/benchmark', 'Benchmark')}
        <ThemeToggle />
        {pathname !== '/app' && (
          <Button asChild size="sm">
            <Link to="/app">Launch app</Link>
          </Button>
        )}
      </nav>
    </header>
  )
}
