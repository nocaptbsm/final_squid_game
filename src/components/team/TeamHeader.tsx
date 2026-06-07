'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, EventState } from '@/lib/types'

export default function TeamHeader({ user, eventState }: { user: User, eventState: EventState | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      padding: '0 20px',
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Top bar */}
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="display" style={{ fontSize: 20, color: 'var(--pink)' }}>SQUID GAME</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user.username}</span>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm" id="team-logout-btn">Out</button>
          </div>
        </div>

        {/* Active round pill */}
        {eventState?.round && (
          <div style={{ paddingBottom: 12 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '5px 14px', borderRadius: 100,
              background: 'var(--pink-subtle)', border: '1px solid rgba(255,45,120,0.3)',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pink)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pink)' }}>
                Active Round: {eventState.round.round_name}
              </span>
            </div>
          </div>
        )}

        {/* Tab nav */}
        <div style={{ display: 'flex', gap: 0, borderBottom: 'none' }}>
          {[{ href: '/team/register', label: 'Registration' }, { href: '/team/scan', label: 'Round Scanner' }].map(tab => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  padding: '10px 20px', fontSize: 13, fontWeight: 600,
                  color: active ? 'var(--pink)' : 'var(--text-secondary)',
                  borderBottom: active ? '2px solid var(--pink)' : '2px solid transparent',
                  textDecoration: 'none', transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}
