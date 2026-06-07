'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DashboardStats, Round } from '@/lib/types'

export default function DashboardClient({ initialStats, rounds }: { initialStats: DashboardStats, rounds: Round[] }) {
  const [stats, setStats] = useState(initialStats)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_results' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_state' }, () => refetch())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const refetch = async () => {
    const [pRes, rrRes, esRes] = await Promise.all([
      supabase.from('participants').select('current_status, registered'),
      supabase.from('round_results').select('round_id, result'),
      supabase.from('event_state').select('*, round:rounds(*)').eq('id', 1).single(),
    ])
    const participants = pRes.data || []
    const roundResults = rrRes.data || []
    const eventState = esRes.data
    const total = participants.length
    const registered = participants.filter(p => p.registered).length
    const active = participants.filter(p => p.current_status === 'active').length
    const eliminated = participants.filter(p => p.current_status === 'eliminated').length
    const roundStats = rounds.map(round => {
      const results = roundResults.filter(r => r.round_id === round.round_id)
      return { round, survived: results.filter(r => r.result === 'survived').length, eliminated: results.filter(r => r.result === 'eliminated').length }
    })
    setStats({ total, registered, not_registered: total - registered, active, eliminated, current_round: eventState?.round || null, round_stats: roundStats })
  }

  const maxPlayers = stats.total || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Live event statistics — auto-updating</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div className="stat-card pink">
          <div className="stat-value" style={{ color: 'var(--pink)' }}>{stats.total}</div>
          <div className="stat-label">Total Participants</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-value" style={{ color: 'var(--teal)' }}>{stats.registered}</div>
          <div className="stat-label">Registered</div>
        </div>
        <div className="stat-card" style={{ '--color': 'var(--text-muted)' } as React.CSSProperties}>
          <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>{stats.not_registered}</div>
          <div className="stat-label">Not Registered</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value" style={{ color: 'var(--green)' }}>{stats.active}</div>
          <div className="stat-label">Active Players</div>
        </div>
        <div className="stat-card red">
          <div className="stat-value" style={{ color: 'var(--red)' }}>{stats.eliminated}</div>
          <div className="stat-label">Eliminated</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Round Analytics */}
        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">Round Analytics</div>
              <div className="section-subtitle">Results per round</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {stats.round_stats.map((rs, i) => (
              <div key={rs.round.round_id} style={{
                padding: '12px 0', borderBottom: i < stats.round_stats.length - 1 ? '1px solid var(--border)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{rs.round.round_order}. {rs.round.round_name}</span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: 'var(--teal)' }}>✓ {rs.survived}</span>
                    <span style={{ color: 'var(--red)' }}>✗ {rs.eliminated}</span>
                  </div>
                </div>
                {(rs.survived + rs.eliminated) > 0 && (
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(rs.survived / (rs.survived + rs.eliminated)) * 100}%`,
                      background: 'linear-gradient(90deg, var(--teal), var(--green))',
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                )}
              </div>
            ))}
            {stats.round_stats.every(r => r.survived + r.eliminated === 0) && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No round results yet
              </div>
            )}
          </div>
        </div>

        {/* Survival Funnel */}
        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">Survival Funnel</div>
              <div className="section-subtitle">Player progression</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div className="funnel-step">
              <div style={{ width: 80, fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>Start</div>
              <div style={{ flex: 1 }}>
                <div className="funnel-bar" style={{ width: '100%' }} />
              </div>
              <div style={{ width: 50, textAlign: 'right', fontWeight: 700 }}>{stats.total}</div>
            </div>
            {stats.round_stats.filter(r => r.survived + r.eliminated > 0).map((rs, i, arr) => {
              const playersAfter = rs.survived
              const pct = (playersAfter / maxPlayers) * 100
              return (
                <div key={rs.round.round_id} className="funnel-step">
                  <div style={{ width: 80, fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {rs.round.round_name.split(' ').slice(0, 2).join(' ')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="funnel-bar" style={{ width: `${pct}%` }} />
                  </div>
                  <div style={{ width: 50, textAlign: 'right', fontWeight: 700, color: pct < 30 ? 'var(--red)' : 'var(--green)' }}>{playersAfter}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Current Round Banner */}
      {stats.current_round && (
        <div className="card" style={{ background: 'var(--pink-subtle)', border: '1px solid rgba(255,45,120,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--pink)', flexShrink: 0 }} className="pulse" />
            <div>
              <div style={{ fontSize: 12, color: 'var(--pink)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Current Round</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{stats.current_round.round_name}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>{stats.active}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Players</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
