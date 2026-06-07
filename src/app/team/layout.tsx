import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TeamHeader from '@/components/team/TeamHeader'

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [userRes, eventStateRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('event_state').select('*, round:rounds(*)').eq('id', 1).single(),
  ])
  if (!userRes.data) redirect('/login')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <TeamHeader user={userRes.data} eventState={eventStateRes.data} />
      <main style={{ flex: 1, padding: '24px 16px', maxWidth: 600, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
