'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Round, EventState } from '@/lib/types'
import toast from 'react-hot-toast'

export default function RoundsClient({ rounds, eventState, roundResults }: {
  rounds: Round[], eventState: EventState | null, roundResults: { round_id: string; result: string }[]
}) {
  const supabase = createClient()
  const [currentRoundId, setCurrentRoundId] = useState(eventState?.current_round_id || null)
  const [loading, setLoading] = useState<string | null>(null)

  const setActive = async (roundId: string) => {
    setLoading(roundId)
    const { error } = await supabase
      .from('event_state')
      .update({ current_round_id: roundId, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (error) {
      toast.error('Failed to update round')
    } else {
      setCurrentRoundId(roundId)
      const round = rounds.find(r => r.round_id === roundId)
      toast.success(`Active round: ${round?.round_name}`)
    }
    setLoading(null)
  }

  const getRoundStats = (roundId: string) => {
    const results = roundResults.filter(r => r.round_id === roundId)
    return {
      survived: results.filter(r => r.result === 'survived').length,
      eliminated: results.filter(r => r.result === 'eliminated').length,
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Round Management</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Set the active round — all scanners update instantly</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rounds.map(round => {
          const isActive = round.round_id === currentRoundId
          const stats = getRoundStats(round.round_id)
          return (
            <div key={round.round_id} className="card" style={{
              border: isActive ? '1px solid rgba(255,45,120,0.4)' : '1px solid var(--border)',
              background: isActive ? 'rgba(255,45,120,0.05)' : 'var(--bg-card)',
              position: 'relative', overflow: 'hidden',
            }}>
              {isActive && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--pink)' }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: isActive ? 'var(--pink)' : 'var(--bg-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, flexShrink: 0,
                    color: isActive ? 'white' : 'var(--text-secondary)',
                  }}>
                    {round.round_order}
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{round.round_name}</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 13 }}>
                      <span style={{ color: 'var(--teal)' }}>✓ {stats.survived} survived</span>
                      <span style={{ color: 'var(--red)' }}>✗ {stats.eliminated} eliminated</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {isActive && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 100, background: 'var(--pink-subtle)', border: '1px solid rgba(255,45,120,0.3)' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pink)' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pink)' }}>ACTIVE</span>
                    </div>
                  )}
                  <button
                    className={`btn ${isActive ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                    onClick={() => setActive(round.round_id)}
                    disabled={isActive || !!loading}
                    id={`set-round-${round.round_order}`}
                  >
                    {loading === round.round_id ? '...' : isActive ? 'Current' : 'Set Active'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
