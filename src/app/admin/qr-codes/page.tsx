import { createClient } from '@/lib/supabase/server'
import QRCodesClient from './QRCodesClient'
export const dynamic = 'force-dynamic'
export default async function QRCodesPage() {
  const supabase = await createClient()
  const { data: participants } = await supabase
    .from('participants')
    .select('participant_id, assigned_qr, name, roll_no, registered, current_status')
    .not('assigned_qr', 'is', null)
    .order('assigned_qr')
  const { data: unassigned } = await supabase
    .from('participants')
    .select('participant_id, roll_no, name')
    .is('assigned_qr', null)
  return <QRCodesClient participants={participants || []} unassigned={unassigned || []} />
}
