'use client'
import { useState } from 'react'
import { Participant, Round } from '@/lib/types'

type ParticipantWithResults = Participant & { round_results: { round_id: string; result: string; round: { round_name: string; round_order: number } }[] }

const statusBadge = (status: string) => {
  if (status === 'active') return <span className="badge badge-active">Active</span>
  if (status === 'eliminated') return <span className="badge badge-eliminated">Eliminated</span>
  if (status === 'winner') return <span className="badge badge-winner">Winner</span>
  return <span className="badge badge-unregistered">Unregistered</span>
}

export default function ParticipantsClient({ initialParticipants, rounds }: { initialParticipants: ParticipantWithResults[], rounds: Round[] }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState<ParticipantWithResults | null>(null)

  const filtered = initialParticipants.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.roll_no.toLowerCase().includes(search.toLowerCase()) || (p.assigned_qr || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || p.current_status === filterStatus || (filterStatus === 'unregistered' && !p.registered)
    return matchSearch && matchStatus
  })

  const lastRound = (p: ParticipantWithResults) => {
    if (!p.round_results?.length) return '—'
    const sorted = [...p.round_results].sort((a, b) => b.round.round_order - a.round.round_order)
    return sorted[0]?.round.round_name || '—'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Participants</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{initialParticipants.length} total participants</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Search name, roll no, QR..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          id="participant-search"
          style={{ maxWidth: 300 }}
        />
        <select className="input" style={{ maxWidth: 180 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)} id="status-filter">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="eliminated">Eliminated</option>
          <option value="unregistered">Unregistered</option>
          <option value="winner">Winner</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          {filtered.length} results
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>QR ID</th>
              <th>Name</th>
              <th>Roll No</th>
              <th>Gender</th>
              <th>Status</th>
              <th>Last Round</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.participant_id}>
                <td><code style={{ fontSize: 12, color: 'var(--teal)' }}>{p.assigned_qr || '—'}</code></td>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.roll_no}</td>
                <td style={{ fontSize: 13 }}>{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'}</td>
                <td>{statusBadge(p.registered ? p.current_status : 'unregistered')}</td>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{lastRound(p)}</td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelected(p)}
                    id={`view-${p.participant_id}`}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No participants found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setSelected(null)}>
          <div className="card" style={{ maxWidth: 480, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{selected.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{selected.roll_no} · {selected.assigned_qr || 'No QR'}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} id="close-modal-btn">✕</button>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              {statusBadge(selected.registered ? selected.current_status : 'unregistered')}
              <span className="badge badge-unregistered">{selected.gender === 'M' ? 'Male' : selected.gender === 'F' ? 'Female' : 'Other'}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Round History</div>
              {rounds.map(round => {
                const result = selected.round_results?.find(r => r.round_id === round.round_id)
                return (
                  <div key={round.round_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{round.round_order}. {round.round_name}</span>
                    <span style={{ color: result?.result === 'survived' ? 'var(--teal)' : result?.result === 'eliminated' ? 'var(--red)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {result ? (result.result === 'survived' ? '✅ Survived' : '❌ Eliminated') : '⏳ Pending'}
                    </span>
                  </div>
                )
              })}
            </div>
            {selected.registered_at && (
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                Registered: {new Date(selected.registered_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
