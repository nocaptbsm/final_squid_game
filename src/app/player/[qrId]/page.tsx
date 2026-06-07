import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PlayerScoreboardClient from './PlayerScoreboardClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { qrId: string } }) {
  return {
    title: `${params.qrId} — Squid Game Paradox26`,
    description: 'Check your live scoreboard',
  }
}

export default async function PlayerPage({ params }: { params: { qrId: string } }) {
  const supabase = await createClient()
  const qrId = params.qrId.toUpperCase()

  const { data: participant } = await supabase
    .from('participants')
    .select('*')
    .eq('assigned_qr', qrId)
    .single()

  if (!participant) notFound()

  const { data: rounds } = await supabase
    .from('rounds')
    .select('*')
    .order('round_order')

  const { data: results } = await supabase
    .from('round_results')
    .select('*')
    .eq('participant_id', participant.participant_id)

  return (
    <PlayerScoreboardClient
      participant={participant}
      rounds={rounds || []}
      initialResults={results || []}
    />
  )
}
