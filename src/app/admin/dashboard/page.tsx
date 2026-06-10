import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import { fetchAll } from '@/lib/supabase/fetchAll'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()

  const [participants, roundResults, roundsRes, eventStateRes] = await Promise.all([
    fetchAll(supabase.from('participants').select('current_status, registered')),
    fetchAll(supabase.from('round_results').select('round_id, result')),
    supabase.from('rounds').select('*').order('round_order'),
    supabase.from('event_state').select('*, round:rounds(*)').eq('id', 1).single(),
  ])

  const rounds = roundsRes.data || []
  const eventState = eventStateRes.data

  const total = participants.length
  const registered = participants.filter(p => p.registered).length
  const active = participants.filter(p => p.current_status === 'active').length
  const eliminated = participants.filter(p => p.current_status === 'eliminated').length

  const roundStats = rounds.map(round => {
    const results = roundResults.filter(r => r.round_id === round.round_id)
    return {
      round,
      survived: results.filter(r => r.result === 'survived').length,
      eliminated: results.filter(r => r.result === 'eliminated').length,
    }
  })

  const stats = { total, registered, not_registered: total - registered, active, eliminated, current_round: eventState?.round || null, round_stats: roundStats }

  return <DashboardClient initialStats={stats} rounds={rounds} />
}
