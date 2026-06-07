import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
export default async function AuditPage() {
  const supabase = await createClient()
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*, actor:users(username), participant:participants(name, roll_no, assigned_qr), round:rounds(round_name)')
    .order('created_at', { ascending: false })
    .limit(500)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Audit Log</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Complete history of all actions</p>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Volunteer</th>
              <th>Action</th>
              <th>Participant</th>
              <th>Round</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {(logs || []).map(log => (
              <tr key={log.id}>
                <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(log.created_at).toLocaleTimeString()} · {new Date(log.created_at).toLocaleDateString()}
                </td>
                <td style={{ fontSize: 13, fontWeight: 600 }}>{log.actor?.username || '—'}</td>
                <td>
                  <span className={`badge ${log.action === 'registration' ? 'badge-survived' : log.action === 'round_result' ? 'badge-active' : 'badge-unregistered'}`}>
                    {log.action}
                  </span>
                </td>
                <td style={{ fontSize: 13 }}>
                  {log.participant ? `${log.participant.name} (${log.participant.assigned_qr || log.participant.roll_no})` : '—'}
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{log.round?.round_name || '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {log.details?.result ? (
                    <span style={{ color: log.details.result === 'survived' ? 'var(--teal)' : 'var(--red)', fontWeight: 700 }}>
                      {String(log.details.result)}
                    </span>
                  ) : JSON.stringify(log.details || {}).slice(0, 60)}
                </td>
              </tr>
            ))}
            {!logs?.length && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No audit entries yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
