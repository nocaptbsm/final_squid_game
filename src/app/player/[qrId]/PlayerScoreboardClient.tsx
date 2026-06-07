'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Participant, Round, RoundResultRecord, ParticipantStatus } from '@/lib/types'

interface Props {
  participant: Participant
  rounds: Round[]
  initialResults: RoundResultRecord[]
}

function getRoundIcon(status: 'survived' | 'eliminated' | 'locked' | 'pending') {
  switch (status) {
    case 'survived': return '✅'
    case 'eliminated': return '❌'
    case 'locked': return '🔒'
    case 'pending': return '⏳'
  }
}

function getRoundStatus(
  round: Round,
  results: RoundResultRecord[],
  eliminationOrder: number | null
): 'survived' | 'eliminated' | 'locked' | 'pending' {
  const result = results.find(r => r.round_id === round.round_id)
  if (result) return result.result as 'survived' | 'eliminated'
  if (eliminationOrder !== null && round.round_order > eliminationOrder) return 'locked'
  return 'pending'
}

// ─── Share helpers ────────────────────────────────────────────────────
const SITE_URL = typeof window !== 'undefined' ? window.location.href : ''

function shareWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

function shareFacebook() {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}`, '_blank')
}

function shareTwitter(text: string) {
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SITE_URL)}`, '_blank')
}

function shareTelegram(text: string) {
  window.open(`https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}&text=${encodeURIComponent(text)}`, '_blank')
}

// ─── Name entry screen ────────────────────────────────────────────────
function NameEntryScreen({ qrId, onSubmit }: { qrId: string; onSubmit: (name: string) => void }) {
  const [name, setName] = useState('')
  const playerNum = qrId.replace('SG-', '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    localStorage.setItem(`sg_player_name_${qrId}`, trimmed)
    onSubmit(trimmed)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #1a0510 0%, #0a0a0f 70%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* BG shapes */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', right: '10%', width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(255,45,120,0.08)' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '8%', width: 120, height: 120, border: '1px solid rgba(255,45,120,0.06)' }} />
        <div style={{ position: 'absolute', top: '30%', left: '5%', width: 0, height: 0, borderLeft: '40px solid transparent', borderRight: '40px solid transparent', borderBottom: '70px solid rgba(255,45,120,0.04)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--pink)' }} />
            <div style={{ width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderBottom: '12px solid var(--pink)' }} />
            <div style={{ width: 10, height: 10, background: 'var(--pink)' }} />
          </div>
          <div className="display" style={{ fontSize: 48, color: 'var(--pink)', textShadow: '0 0 40px rgba(255,45,120,0.5)', lineHeight: 1 }}>
            SQUID GAME
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.15em', marginTop: 6 }}>PARADOX26</div>
        </div>

        {/* Player number */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>Player</div>
          <div className="display" style={{ fontSize: 64, color: 'var(--pink)', lineHeight: 1, textShadow: '0 0 30px rgba(255,45,120,0.4)' }}>
            #{playerNum}
          </div>
        </div>

        {/* Name entry card */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Enter Your Name</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Enter your name once to access your personal scoreboard and track your progress through the game.
            </div>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <input
                id="player-name-input"
                className="input"
                placeholder="Your name..."
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                required
                maxLength={60}
                style={{
                  fontSize: 18,
                  textAlign: 'center',
                  fontWeight: 700,
                  padding: '14px 16px',
                }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              id="name-submit-btn"
              disabled={!name.trim()}
              style={{ width: '100%', fontSize: 16 }}
            >
              View My Scoreboard →
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-muted)' }}>
          Your name is saved locally on this device
        </p>
      </div>
    </div>
  )
}

// ─── Share bar ────────────────────────────────────────────────────────
function ShareBar({
  playerName,
  playerNum,
  pStatus,
  survived,
  eliminated,
  scoreboardRef,
}: {
  playerName: string
  playerNum: string
  pStatus: ParticipantStatus
  survived: number
  eliminated: number
  scoreboardRef: React.RefObject<HTMLDivElement | null>
}) {
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  const statusEmoji = pStatus === 'active' ? '🟢' : pStatus === 'winner' ? '🏆' : '🔴'
  const statusText = pStatus === 'active' ? 'Still in the game!' : pStatus === 'winner' ? 'WINNER! 🏆' : 'Eliminated'
  const shareText = `${statusEmoji} Squid Game @ Paradox26\n👤 ${playerName} (#${playerNum})\n✅ Survived: ${survived} rounds\n${statusText}\n\nCheck my scoreboard:`

  const downloadImage = async () => {
    if (!scoreboardRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(scoreboardRef.current, {
        backgroundColor: '#0a0a0f',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `squidgame-${playerName.replace(/\s+/g, '-')}-scoreboard.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error(err)
    }
    setDownloading(false)
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ width: '100%', maxWidth: 480, marginTop: 24 }}>
      {/* Section header */}
      <div style={{
        textAlign: 'center', marginBottom: 16,
        fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.12em',
      }}>
        Share Your Progress
      </div>

      {/* Social share buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 10 }}>
        {/* WhatsApp */}
        <button
          id="share-whatsapp"
          onClick={() => shareWhatsApp(shareText)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)',
            color: '#25D366', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).closest('button')!.style.background = 'rgba(37,211,102,0.2)' }}
          onMouseLeave={e => { (e.target as HTMLElement).closest('button')!.style.background = 'rgba(37,211,102,0.1)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </button>

        {/* Facebook */}
        <button
          id="share-facebook"
          onClick={shareFacebook}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(24,119,242,0.1)', border: '1px solid rgba(24,119,242,0.3)',
            color: '#1877F2', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).closest('button')!.style.background = 'rgba(24,119,242,0.2)' }}
          onMouseLeave={e => { (e.target as HTMLElement).closest('button')!.style.background = 'rgba(24,119,242,0.1)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Facebook
        </button>

        {/* Twitter / X */}
        <button
          id="share-twitter"
          onClick={() => shareTwitter(shareText)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#e7e9ea', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).closest('button')!.style.background = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={e => { (e.target as HTMLElement).closest('button')!.style.background = 'rgba(0,0,0,0.3)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          𝕏 (Twitter)
        </button>

        {/* Telegram */}
        <button
          id="share-telegram"
          onClick={() => shareTelegram(shareText)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(0,136,204,0.1)', border: '1px solid rgba(0,136,204,0.3)',
            color: '#0088cc', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).closest('button')!.style.background = 'rgba(0,136,204,0.2)' }}
          onMouseLeave={e => { (e.target as HTMLElement).closest('button')!.style.background = 'rgba(0,136,204,0.1)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          Telegram
        </button>
      </div>

      {/* Instagram + download row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Instagram — download image then share */}
        <button
          id="share-instagram"
          onClick={downloadImage}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, rgba(253,88,73,0.12), rgba(131,58,180,0.12))',
            border: '1px solid rgba(200,60,150,0.3)',
            color: '#e1306c', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
          </svg>
          Instagram
        </button>

        {/* Download Image */}
        <button
          id="download-scoreboard"
          onClick={downloadImage}
          disabled={downloading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--pink-subtle)', border: '1px solid rgba(255,45,120,0.3)',
            color: 'var(--pink)', fontWeight: 700, fontSize: 14, cursor: downloading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', opacity: downloading ? 0.6 : 1,
          }}
        >
          {downloading ? (
            <div className="spinner" style={{ width: 16, height: 16 }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          )}
          {downloading ? 'Saving...' : 'Save Image'}
        </button>
      </div>

      {/* Copy link */}
      <button
        id="copy-link"
        onClick={copyLink}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 'var(--radius-sm)',
          background: 'transparent', border: '1px solid var(--border)',
          color: copied ? 'var(--green)' : 'var(--text-muted)',
          fontWeight: 600, fontSize: 13, cursor: 'pointer',
          transition: 'all 0.2s', width: '100%', marginTop: 10,
        }}
      >
        {copied ? (
          <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Link Copied!</>
        ) : (
          <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copy Link</>
        )}
      </button>

      {/* Instagram hint */}
      <p style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        💡 For Instagram: tap "Save Image" then share from your gallery
      </p>
    </div>
  )
}

// ─── Main scoreboard ──────────────────────────────────────────────────
export default function PlayerScoreboardClient({ participant, rounds, initialResults }: Props) {
  const supabase = createClient()
  const [results, setResults] = useState<RoundResultRecord[]>(initialResults)
  const [pStatus, setPStatus] = useState(participant.current_status)
  const scoreboardRef = useRef<HTMLDivElement>(null)

  // Name management — stored in localStorage keyed by QR ID
  const storageKey = `sg_player_name_${participant.assigned_qr}`
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [nameLoaded, setNameLoaded] = useState(false)

  // Load saved name on mount (client-side only)
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    setPlayerName(saved || null)
    setNameLoaded(true)
  }, [storageKey])

  // Realtime subscriptions
  useEffect(() => {
    const ch = supabase
      .channel(`player-${participant.participant_id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'round_results',
        filter: `participant_id=eq.${participant.participant_id}`,
      }, async () => {
        const { data } = await supabase
          .from('round_results')
          .select('*')
          .eq('participant_id', participant.participant_id)
        if (data) setResults(data)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'participants',
        filter: `participant_id=eq.${participant.participant_id}`,
      }, (payload) => {
        setPStatus((payload.new as Participant).current_status)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // Derived state
  const eliminatedResult = results.find(r => r.result === 'eliminated')
  const eliminatedRound = eliminatedResult
    ? rounds.find(r => r.round_id === eliminatedResult.round_id)
    : null
  const eliminationOrder = eliminatedRound?.round_order ?? null

  const survivedCount = results.filter(r => r.result === 'survived').length
  const eliminatedCount = results.filter(r => r.result === 'eliminated').length

  const isActive = pStatus === 'active'
  const isWinner = pStatus === 'winner'
  const statusColor = isActive ? 'var(--green)' : isWinner ? 'var(--gold)' : 'var(--red)'
  const statusLabel = isActive ? 'ACTIVE' : isWinner ? '🏆 WINNER' : 'ELIMINATED'
  const playerNum = participant.assigned_qr?.replace('SG-', '') || '---'

  // Display name: custom name entered by player, or fallback to DB name
  const displayName = playerName || participant.name

  // Show loading until localStorage check completes
  if (!nameLoaded) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  // If no name saved yet → show entry screen
  if (!playerName) {
    return (
      <NameEntryScreen
        qrId={participant.assigned_qr || ''}
        onSubmit={(name) => setPlayerName(name)}
      />
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #1a0510 0%, #0a0a0f 70%)',
      padding: '24px 16px 48px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Background geometry */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '5%', right: '5%', width: 150, height: 150, borderRadius: '50%', border: '1px solid rgba(255,45,120,0.08)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: 100, height: 100, border: '1px solid rgba(255,45,120,0.06)' }} />
      </div>

      {/* ─── Shareable scoreboard area ─── */}
      <div ref={scoreboardRef} style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>
            Paradox26 · Squid Game
          </div>
          <div className="display" style={{ fontSize: 52, color: 'var(--pink)', lineHeight: 1, textShadow: '0 0 40px rgba(255,45,120,0.4)' }}>
            #{playerNum}
          </div>
        </div>

        {/* Player card */}
        <div className="card" style={{ marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${statusColor}, transparent)` }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                {participant.roll_no}
              </div>
            </div>
            <div style={{
              background: `${statusColor}20`,
              border: `1px solid ${statusColor}40`,
              color: statusColor,
              padding: '6px 12px',
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
              marginLeft: 12,
            }}>
              {isActive && <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} className="pulse" />}
              {statusLabel}
            </div>
          </div>

          {/* Mini stats row */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--teal)' }}>{survivedCount}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Survived</div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--red)' }}>{eliminatedCount}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Eliminated</div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-secondary)' }}>{rounds.length - survivedCount - eliminatedCount}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pending</div>
            </div>
          </div>
        </div>

        {/* Round results */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Round Scoreboard
            </div>
            <button
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                fontSize: 11, textDecoration: 'underline', padding: 0,
              }}
              onClick={() => {
                localStorage.removeItem(storageKey)
                setPlayerName(null)
              }}
              id="change-name-btn"
            >
              Change name
            </button>
          </div>

          {!participant.registered ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Not yet registered at the event.
            </div>
          ) : (
            <div>
              {rounds.map((round) => {
                const status = getRoundStatus(round, results, eliminationOrder)
                const colors: Record<string, string> = {
                  survived: 'var(--teal)',
                  eliminated: 'var(--red)',
                  locked: 'var(--text-muted)',
                  pending: 'var(--text-muted)',
                }
                const bgColors: Record<string, string> = {
                  survived: 'rgba(0,212,170,0.04)',
                  eliminated: 'rgba(255,68,68,0.04)',
                  locked: 'transparent',
                  pending: 'transparent',
                }
                return (
                  <div
                    key={round.round_id}
                    className="round-row"
                    style={{ opacity: status === 'locked' ? 0.45 : 1, background: bgColors[status] }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: status === 'survived' ? 'rgba(0,212,170,0.12)' : status === 'eliminated' ? 'rgba(255,68,68,0.12)' : 'var(--bg-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: colors[status], flexShrink: 0,
                      }}>
                        {round.round_order}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{round.round_name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: colors[status], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {status === 'pending' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                      <span style={{ fontSize: 18 }}>{getRoundIcon(status)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Branding footer on the shareable area */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
          squidgame.paradox26.in · Updates in real-time
        </div>
      </div>

      {/* ─── Share section (outside screenshot area) ─── */}
      <ShareBar
        playerName={displayName}
        playerNum={playerNum}
        pStatus={pStatus}
        survived={survivedCount}
        eliminated={eliminatedCount}
        scoreboardRef={scoreboardRef}
      />
    </div>
  )
}
