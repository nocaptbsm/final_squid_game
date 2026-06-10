'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Participant, Round } from '@/lib/types'

interface RoundResult {
  round_id: string
  result: 'survived' | 'eliminated'
}

interface Props {
  participant: Participant
  rounds: Round[]
  initialResults: RoundResult[]
}

export default function PlayerScoreboardClient({ participant, rounds, initialResults }: Props) {
  const supabase = createClient()
  const [results, setResults] = useState<RoundResult[]>(initialResults)

  // Realtime updates
  useEffect(() => {
    const ch = supabase
      .channel(`player-${participant.participant_id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'round_results',
        filter: `participant_id=eq.${participant.participant_id}`,
      }, () => {
        supabase
          .from('round_results')
          .select('round_id, result')
          .eq('participant_id', participant.participant_id)
          .then(({ data }) => { if (data) setResults(data) })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const getResult = (roundId: string) =>
    results.find(r => r.round_id === roundId)?.result ?? null

  const isEliminated = participant.current_status === 'eliminated'
  const isWinner = participant.current_status === 'winner'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '24px 16px',
      fontFamily: "'Outfit', 'Inter', sans-serif",
    }}>

      {/* Main Scoreboard Card */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'linear-gradient(180deg, #161616 0%, #111111 100%)',
        border: '1px solid #222',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      }}>

        {/* Header Area */}
        <div style={{
          background: 'linear-gradient(135deg, #1a0510 0%, #2d0a1a 100%)',
          padding: '32px 24px',
          textAlign: 'center',
          position: 'relative',
        }}>
          {/* Logo / Icon */}
          <div style={{ fontSize: 52, marginBottom: 16 }}>🦑</div>
          
          <h1 style={{
            fontSize: '24px',
            fontWeight: 900,
            color: '#E31B6D',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            margin: '0 0 8px 0',
          }}>
            SQUID GAME
          </h1>
          <div style={{
            fontSize: '10px',
            color: '#888',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            PARADOX26 · LIVE SCOREBOARD
          </div>

          {(isEliminated || isWinner) && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-10deg)',
              padding: '8px 24px',
              border: `4px solid ${isWinner ? '#ffd700' : '#e53935'}`,
              borderRadius: '8px',
              background: isWinner ? 'rgba(255,215,0,0.1)' : 'rgba(229,57,53,0.1)',
              backdropFilter: 'blur(4px)',
              zIndex: 10,
              pointerEvents: 'none',
              boxShadow: `0 0 30px ${isWinner ? '#ffd70055' : '#e5393555'}`,
            }}>
              <span style={{
                color: isWinner ? '#ffd700' : '#ff4444',
                fontSize: '28px',
                fontWeight: 900,
                letterSpacing: '0.15em',
                textShadow: `0 0 10px ${isWinner ? '#ffd700' : '#ff4444'}`,
                whiteSpace: 'nowrap',
              }}>
                {isWinner ? '🏆 WINNER' : '☠ ELIMINATED'}
              </span>
            </div>
          )}
        </div>

        {/* Player Details Area */}
        <div style={{
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderBottom: '1px solid #222',
        }}>
          {/* ID Badge */}
          <div style={{
            padding: '6px 20px',
            borderRadius: '100px',
            background: 'rgba(227,27,109,0.1)',
            border: '1px solid rgba(227,27,109,0.3)',
            color: '#E31B6D',
            fontWeight: 900,
            fontSize: '18px',
            letterSpacing: '0.15em',
            marginBottom: '16px',
          }}>
            {participant.assigned_qr}
          </div>

          {/* Player Name */}
          <h2 style={{
            color: '#fff',
            fontSize: '28px',
            fontWeight: 800,
            margin: 0,
            textAlign: 'center',
            wordBreak: 'break-word',
          }}>
            {participant.name}
          </h2>
        </div>

        {/* Rounds List */}
        <div style={{ padding: '0' }}>
          {rounds.map((round, i) => {
            const result = getResult(round.round_id)
            return (
              <div key={round.round_id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: i < rounds.length - 1 ? '1px solid #222' : 'none',
                background: result === 'survived'
                  ? 'linear-gradient(90deg, rgba(0,200,83,0.05) 0%, transparent 100%)'
                  : result === 'eliminated'
                  ? 'linear-gradient(90deg, rgba(229,57,53,0.05) 0%, transparent 100%)'
                  : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#E31B6D',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#eee' }}>
                    {round.round_name}
                  </span>
                </div>
                
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  background: result === 'survived'
                    ? 'rgba(0,200,83,0.12)'
                    : result === 'eliminated'
                    ? 'rgba(229,57,53,0.12)'
                    : 'rgba(255,255,255,0.05)',
                  color: result === 'survived'
                    ? '#00c853'
                    : result === 'eliminated'
                    ? '#ff5252'
                    : '#666',
                  border: `1px solid ${
                    result === 'survived' ? 'rgba(0,200,83,0.3)' 
                    : result === 'eliminated' ? 'rgba(229,57,53,0.3)' 
                    : '#333'
                  }`,
                }}>
                  {result === 'survived' ? '✓ SURVIVED'
                    : result === 'eliminated' ? '✗ ELIMINATED'
                    : '— PENDING'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Footer text */}
      <div style={{
        marginTop: '24px',
        textAlign: 'center',
        fontSize: '11px',
        color: '#555',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
      }}>
        TRUST NO ONE · PLAY FAIR · WIN BIG
      </div>
    </div>
  )
}
