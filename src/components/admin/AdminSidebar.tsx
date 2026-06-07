'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/participants', label: 'Participants', icon: '👥' },
  { href: '/admin/import', label: 'Import CSV', icon: '📂' },
  { href: '/admin/qr-codes', label: 'QR Codes', icon: '📱' },
  { href: '/admin/rounds', label: 'Rounds', icon: '🎮' },
  { href: '/admin/audit', label: 'Audit Log', icon: '📋' },
  { href: '/admin/export', label: 'Export', icon: '📤' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 260,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--pink)' }} />
            <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '10px solid var(--pink)' }} />
            <div style={{ width: 8, height: 8, background: 'var(--pink)' }} />
          </div>
          <span className="display" style={{ fontSize: 22, color: 'var(--pink)', letterSpacing: 2 }}>SQUID GAME</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Admin Panel</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                textDecoration: 'none', fontSize: 14, fontWeight: active ? 600 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--bg-card)' : 'transparent',
                borderLeft: active ? '3px solid var(--pink)' : '3px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Live Display Link */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
        <a
          href="/live"
          target="_blank"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            textDecoration: 'none', fontSize: 13, fontWeight: 600,
            color: 'var(--pink)',
            background: 'var(--pink-subtle)',
            border: '1px solid rgba(255,45,120,0.2)',
          }}
        >
          📺 Live Display
          <span style={{ fontSize: 10, opacity: 0.7 }}>↗</span>
        </a>
      </div>
    </aside>
  )
}
