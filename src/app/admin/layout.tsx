import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userData || userData.role !== 'admin') redirect('/login')

  const { data: eventState } = await supabase
    .from('event_state')
    .select('*, round:rounds(*)')
    .eq('id', 1)
    .single()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <AdminSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: 260, minHeight: '100vh' }}>
        <AdminHeader user={userData} eventState={eventState} />
        <main style={{ flex: 1, padding: '32px', maxWidth: 1400, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
