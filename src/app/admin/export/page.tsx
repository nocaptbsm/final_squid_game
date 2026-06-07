import { createClient } from '@/lib/supabase/server'
import ExportClient from './ExportClient'
export const dynamic = 'force-dynamic'
export default async function ExportPage() {
  const supabase = await createClient()
  const { data: participants } = await supabase
    .from('participants')
    .select('*, round_results(round_id, result, round:rounds(round_name, round_order))')
    .order('assigned_qr')
  return <ExportClient participants={participants || []} />
}
