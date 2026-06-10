import { createClient } from '@/lib/supabase/server'
import ParticipantsClient from './ParticipantsClient'
import { fetchAll } from '@/lib/supabase/fetchAll'

export const dynamic = 'force-dynamic'

export default async function ParticipantsPage() {
  const supabase = await createClient()
  
  const participants = await fetchAll(
    supabase
      .from('participants')
      .select('*, round_results(round_id, result, round:rounds(round_name, round_order))')
      .order('assigned_qr', { ascending: true, nullsFirst: false })
  )
  
  const { data: rounds } = await supabase.from('rounds').select('*').order('round_order')
  
  return <ParticipantsClient initialParticipants={participants} rounds={rounds || []} />
}
