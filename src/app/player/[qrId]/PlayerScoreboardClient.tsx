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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Squid Game: ${participant.name}'s Scoreboard`,
          text: `Check out ${participant.name}'s live status in the Squid Game! (ID: ${participant.assigned_qr})`,
          url: window.location.href,
        })
      } catch (err) {
        console.error('Error sharing', err)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050505',
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
        background: 'linear-gradient(180deg, #111 0%, #0a0a0a 100%)',
        border: '1px solid #222',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(227,27,109,0.1)',
      }}>

        {/* Header Area */}
        <div style={{
          position: 'relative',
          height: '240px',
          backgroundImage: 'url("https://github.com/nocaptbsm/final_squid_game/blob/main/WhatsApp%20Image%202026-06-10%20at%2002.25.06.jpeg?raw=true")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}>
          {/* Overlay to ensure text readability */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #111 100%)',
          }} />

          {/* Logo / Icon */}
          <img 
            src="https://github.com/nocaptbsm/final_squid_game/blob/main/WhatsApp%20Image%202026-06-10%20at%2002.30.25%20(1)-Photoroom.png?raw=true" 
            alt="Squid Game Logo" 
            style={{ width: '220px', objectFit: 'contain', position: 'relative', zIndex: 5, marginBottom: '20px' }}
          />

          <div style={{
            position: 'relative',
            zIndex: 5,
            fontSize: '11px',
            color: '#ffc107',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 800,
            marginTop: 'auto',
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
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderBottom: '1px solid #222',
          position: 'relative',
        }}>
          {/* Share Button */}
          <button 
            onClick={handleShare}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: '100px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'background 0.2s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            Share
          </button>

          {/* ID Badge */}
          <div style={{
            padding: '4px 16px',
            borderRadius: '100px',
            background: 'var(--pink)',
            color: '#fff',
            fontWeight: 900,
            fontSize: '16px',
            letterSpacing: '0.15em',
            marginBottom: '12px',
            boxShadow: '0 0 15px rgba(227,27,109,0.4)',
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
          <div style={{ color: '#888', fontSize: '13px', marginTop: '6px', fontFamily: 'monospace' }}>
            {participant.roll_no}
          </div>
        </div>

        {/* Rounds List */}
        <div style={{ padding: '8px 0' }}>
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
                  ? 'linear-gradient(90deg, rgba(0,200,83,0.08) 0%, transparent 100%)'
                  : result === 'eliminated'
                  ? 'linear-gradient(90deg, rgba(229,57,53,0.08) 0%, transparent 100%)'
                  : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: result === 'survived' ? 'rgba(0,200,83,0.1)' : result === 'eliminated' ? 'rgba(229,57,53,0.1)' : '#1a1a1a',
                    border: `1px solid ${result === 'survived' ? '#00c853' : result === 'eliminated' ? '#e53935' : '#333'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 800,
                    color: result === 'survived' ? '#00c853' : result === 'eliminated' ? '#e53935' : '#888',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: result ? '#fff' : '#aaa' }}>
                    {round.round_name}
                  </span>
                </div>
                
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  background: result === 'survived'
                    ? 'rgba(0,200,83,0.15)'
                    : result === 'eliminated'
                    ? 'rgba(229,57,53,0.15)'
                    : 'rgba(255,255,255,0.05)',
                  color: result === 'survived'
                    ? '#00e676'
                    : result === 'eliminated'
                    ? '#ff5252'
                    : '#666',
                  border: `1px solid ${
                    result === 'survived' ? 'rgba(0,200,83,0.4)' 
                    : result === 'eliminated' ? 'rgba(229,57,53,0.4)' 
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
        marginTop: '32px',
        textAlign: 'center',
        fontSize: '11px',
        color: '#555',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
      }}>
        TRUST NO ONE · PLAY FAIR · WIN BIG
      </div>
    </div>
  )
}
