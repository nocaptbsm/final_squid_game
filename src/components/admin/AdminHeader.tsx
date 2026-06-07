'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, EventState } from '@/lib/types'

export default function AdminHeader({ user, eventState }: { user: User, eventState: EventState | null }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header style={{
      height: 64, background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', position: 'sticky', top: 0, zIndex: 40,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {eventState?.round ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 100,
            background: 'var(--pink-subtle)', border: '1px solid rgba(255,45,120,0.3)',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pink)' }} className="pulse" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pink)' }}>
              Active: {eventState.round.round_name}
            </span>
          </div>
        ) : (
          <div style={{
            padding: '6px 14px', borderRadius: 100,
            background: 'rgba(152,152,184,0.1)', border: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active round</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user.username}</span>
        <button onClick={handleLogout} className="btn btn-ghost btn-sm" id="logout-btn">
          Sign Out
        </button>
      </div>
    </header>
  )
}
