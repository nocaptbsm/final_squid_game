import { createClient } from '@/lib/supabase/server'
import RoundsClient from './RoundsClient'
export const dynamic = 'force-dynamic'
export default async function RoundsPage() {
  const supabase = await createClient()
  const [{ data: rounds }, { data: eventState }, { data: roundResults }] = await Promise.all([
    supabase.from('rounds').select('*').order('round_order'),
    supabase.from('event_state').select('*, round:rounds(*)').eq('id', 1).single(),
    supabase.from('round_results').select('round_id, result'),
  ])
  return <RoundsClient rounds={rounds || []} eventState={eventState} roundResults={roundResults || []} />
}
