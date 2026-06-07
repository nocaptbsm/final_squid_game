'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Round, EventState } from '@/lib/types'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Player {
  participant_id: string
  name: string
  roll_no: string
  gender: string
  assigned_qr: string | null
}

interface Group {
  num: number
  members: Player[]
  type: 'male' | 'female' | 'other' | 'mixed'
}

// ─── Group generation algorithm ───────────────────────────────────────────────
function makeGroups(players: Player[], size: number): Group[] {
  const males   = players.filter(p => p.gender === 'M').sort((a, b) => a.roll_no.localeCompare(b.roll_no))
  const females = players.filter(p => p.gender === 'F').sort((a, b) => a.roll_no.localeCompare(b.roll_no))
  const others  = players.filter(p => p.gender !== 'M' && p.gender !== 'F').sort((a, b) => a.roll_no.localeCompare(b.roll_no))

  const groups: Group[] = []
  let num = 1

  // Full male groups
  for (let i = 0; i + size <= males.length; i += size) {
    groups.push({ num: num++, members: males.slice(i, i + size), type: 'male' })
  }
  const leftoverMales = males.slice(Math.floor(males.length / size) * size)

  // Full female groups
  for (let i = 0; i + size <= females.length; i += size) {
    groups.push({ num: num++, members: females.slice(i, i + size), type: 'female' })
  }
  const leftoverFemales = females.slice(Math.floor(females.length / size) * size)

  // Remaining players (leftover M + leftover F + Others) → mixed groups
  const remaining = [...leftoverMales, ...leftoverFemales, ...others]
  for (let i = 0; i < remaining.length; i += size) {
    const chunk = remaining.slice(i, i + size)
    const hasM = chunk.some(p => p.gender === 'M')
    const hasF = chunk.some(p => p.gender === 'F')
    const type = hasM && hasF ? 'mixed' : hasM ? 'male' : hasF ? 'female' : 'other'
    groups.push({ num: num++, members: chunk, type })
  }

  return groups
}

// ─── Group card ───────────────────────────────────────────────────────────────
const GROUP_COLORS: Record<string, { bg: string; border: string; badge: string; label: string }> = {
  male:   { bg: 'rgba(99,179,237,0.06)',  border: 'rgba(99,179,237,0.25)',  badge: 'rgba(99,179,237,0.15)',  label: '#63b3ed' },
  female: { bg: 'rgba(255,45,120,0.06)',  border: 'rgba(255,45,120,0.2)',   badge: 'rgba(255,45,120,0.12)',  label: 'var(--pink)' },
  mixed:  { bg: 'rgba(154,73,238,0.06)', border: 'rgba(154,73,238,0.2)',   badge: 'rgba(154,73,238,0.12)', label: '#9a49ee' },
  other:  { bg: 'rgba(152,152,184,0.06)', border: 'rgba(152,152,184,0.2)', badge: 'rgba(152,152,184,0.12)', label: 'var(--text-muted)' },
}

function GroupCard({ group }: { group: Group }) {
  const c = GROUP_COLORS[group.type]
  const typeLabel = group.type === 'male' ? '♂ Male' : group.type === 'female' ? '♀ Female' : group.type === 'mixed' ? '⚥ Mixed' : '— Other'
  return (
    <div style={{
      border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius-sm)',
      background: c.bg,
      padding: '14px 16px',
      pageBreakInside: 'avoid',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>Group {group.num}</div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 10px',
          borderRadius: 100, background: c.badge, color: c.label,
        }}>
          {typeLabel}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {group.members.map((m, i) => (
          <div key={m.participant_id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 10px', borderRadius: 6,
            background: 'rgba(0,0,0,0.2)',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{m.roll_no}</div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 6px',
              borderRadius: 100, background: c.badge, color: c.label, flexShrink: 0,
            }}>
              {m.gender}
            </span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'right' }}>
        {group.members.length} member{group.members.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

// ─── Group Maker panel ────────────────────────────────────────────────────────
function GroupMaker() {
  const supabase = createClient()
  const [groupSize, setGroupSize] = useState(4)
  const [groups, setGroups] = useState<Group[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const generate = async () => {
    if (groupSize < 2) { toast.error('Group size must be at least 2'); return }
    setLoading(true)
    setGenerated(false)

    const { data, error } = await supabase
      .from('participants')
      .select('participant_id, name, roll_no, gender, assigned_qr')
      .eq('current_status', 'active')
      .order('roll_no')

    if (error) { toast.error('Failed to fetch players'); setLoading(false); return }
    if (!data || data.length === 0) { toast.error('No active players found'); setLoading(false); return }

    setPlayers(data)
    const g = makeGroups(data, groupSize)
    setGroups(g)
    setGenerated(true)
    setLoading(false)
    toast.success(`${g.length} groups created from ${data.length} active players`)
  }

  const printGroups = () => {
    const maleGroups   = groups.filter(g => g.type === 'male')
    const femaleGroups = groups.filter(g => g.type === 'female')
    const mixedGroups  = groups.filter(g => g.type === 'mixed' || g.type === 'other')

    const renderGroup = (g: Group) => `
      <div class="group-card">
        <div class="group-header">
          <span class="group-num">Group ${g.num}</span>
          <span class="group-badge ${g.type}">${g.type === 'male' ? '♂ Male' : g.type === 'female' ? '♀ Female' : g.type === 'mixed' ? '⚥ Mixed' : '— Other'}</span>
        </div>
        ${g.members.map((m, i) => `
          <div class="member-row">
            <span class="member-idx">${i + 1}</span>
            <span class="member-name">${m.name}</span>
            <span class="member-roll">${m.roll_no}</span>
            <span class="member-gender">${m.gender}</span>
          </div>
        `).join('')}
      </div>`

    const html = `<!DOCTYPE html><html><head><title>Squid Game — Groups</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;background:#fff;color:#111;padding:20px}
  h1{text-align:center;font-size:20px;margin-bottom:4px}
  .subtitle{text-align:center;color:#666;font-size:13px;margin-bottom:20px}
  .section-title{font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin:16px 0 10px;padding:6px 12px;border-radius:4px}
  .section-title.male{background:#dbeafe;color:#1d4ed8}
  .section-title.female{background:#fce7f3;color:#be185d}
  .section-title.mixed{background:#ede9fe;color:#6d28d9}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .group-card{border:1px solid #ddd;border-radius:8px;padding:12px;page-break-inside:avoid}
  .group-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
  .group-num{font-weight:800;font-size:14px}
  .group-badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:100px}
  .group-badge.male{background:#dbeafe;color:#1d4ed8}
  .group-badge.female{background:#fce7f3;color:#be185d}
  .group-badge.mixed{background:#ede9fe;color:#6d28d9}
  .group-badge.other{background:#f3f4f6;color:#6b7280}
  .member-row{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:4px;background:#f9f9f9;margin-bottom:4px}
  .member-idx{width:20px;height:20px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}
  .member-name{flex:1;font-size:12px;font-weight:600}
  .member-roll{font-size:11px;color:#666;font-family:monospace}
  .member-gender{font-size:10px;font-weight:700;padding:1px 5px;border-radius:100px;background:#e5e7eb}
  @media print{body{padding:10px}.no-print{display:none}}
</style></head><body>
<div class="no-print" style="text-align:center;margin-bottom:16px">
  <button onclick="window.print()" style="padding:8px 20px;background:#E31B6D;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">🖨️ Print</button>
</div>
<h1>PARADOX26 — SQUID GAME · Groups</h1>
<div class="subtitle">${groups.length} groups · ${players.length} active players · ${groupSize} per group</div>

${maleGroups.length ? `<div class="section-title male">♂ Male Groups (${maleGroups.length})</div><div class="grid">${maleGroups.map(renderGroup).join('')}</div>` : ''}
${femaleGroups.length ? `<div class="section-title female">♀ Female Groups (${femaleGroups.length})</div><div class="grid">${femaleGroups.map(renderGroup).join('')}</div>` : ''}
${mixedGroups.length ? `<div class="section-title mixed">⚥ Mixed / Remaining Groups (${mixedGroups.length})</div><div class="grid">${mixedGroups.map(renderGroup).join('')}</div>` : ''}
</body></html>`

    const w = window.open('', '_blank')
    if (!w) { toast.error('Allow popups to print'); return }
    w.document.write(html)
    w.document.close()
  }

  // Stats
  const males   = players.filter(p => p.gender === 'M').length
  const females = players.filter(p => p.gender === 'F').length
  const others  = players.length - males - females
  const maleGroups   = groups.filter(g => g.type === 'male').length
  const femaleGroups = groups.filter(g => g.type === 'female').length
  const mixedGroups  = groups.filter(g => g.type === 'mixed' || g.type === 'other').length

  return (
    <div className="card" style={{ marginTop: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 3 }}>Group Maker</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Groups active players — same gender first, mixed at the end
          </div>
        </div>
        {generated && (
          <button className="btn btn-ghost btn-sm" onClick={printGroups} id="print-groups-btn">
            🖨️ Print Groups
          </button>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="label">Players per group</label>
          <input
            id="group-size-input"
            type="number"
            className="input"
            value={groupSize}
            min={2} max={50}
            onChange={e => { setGroupSize(Number(e.target.value)); setGenerated(false) }}
            style={{ width: 110 }}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={generate}
          disabled={loading}
          id="generate-groups-btn"
          style={{ marginBottom: 0 }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="spinner" style={{ width: 16, height: 16 }} /> Fetching...
            </span>
          ) : '⚡ Generate Groups'}
        </button>
      </div>

      {/* Algorithm explanation */}
      {!generated && (
        <div style={{
          display: 'flex', gap: 0, flexWrap: 'wrap',
          padding: '12px 16px', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6,
        }}>
          <div>
            <strong style={{ color: '#63b3ed' }}>Step 1:</strong> All male players → full groups of {groupSize}
            {'  →  '}
            <strong style={{ color: 'var(--pink)' }}>Step 2:</strong> All female players → full groups of {groupSize}
            {'  →  '}
            <strong style={{ color: '#9a49ee' }}>Step 3:</strong> Remaining leftovers → mixed groups
          </div>
        </div>
      )}

      {/* Stats bar */}
      {generated && (
        <div style={{
          display: 'flex', gap: 20, flexWrap: 'wrap',
          padding: '12px 16px', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          marginBottom: 20, fontSize: 13,
        }}>
          <span>👥 <strong>{players.length}</strong> active players</span>
          <span style={{ color: '#63b3ed' }}>♂ {males} males</span>
          <span style={{ color: 'var(--pink)' }}>♀ {females} females</span>
          {others > 0 && <span style={{ color: 'var(--text-muted)' }}>— {others} other</span>}
          <span style={{ marginLeft: 'auto', fontWeight: 700 }}>
            🏷️ {groups.length} groups total
            {maleGroups > 0 && <span style={{ color: '#63b3ed', marginLeft: 10 }}>♂ {maleGroups}</span>}
            {femaleGroups > 0 && <span style={{ color: 'var(--pink)', marginLeft: 10 }}>♀ {femaleGroups}</span>}
            {mixedGroups > 0 && <span style={{ color: '#9a49ee', marginLeft: 10 }}>⚥ {mixedGroups} mixed</span>}
          </span>
        </div>
      )}

      {/* Groups grid */}
      {generated && groups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Male groups */}
          {groups.filter(g => g.type === 'male').length > 0 && (
            <div>
              <div style={{
                fontSize: 12, fontWeight: 700, color: '#63b3ed',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(99,179,237,0.2)' }} />
                ♂ Male Groups
                <div style={{ flex: 1, height: 1, background: 'rgba(99,179,237,0.2)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {groups.filter(g => g.type === 'male').map(g => <GroupCard key={g.num} group={g} />)}
              </div>
            </div>
          )}

          {/* Female groups */}
          {groups.filter(g => g.type === 'female').length > 0 && (
            <div>
              <div style={{
                fontSize: 12, fontWeight: 700, color: 'var(--pink)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,45,120,0.2)' }} />
                ♀ Female Groups
                <div style={{ flex: 1, height: 1, background: 'rgba(255,45,120,0.2)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {groups.filter(g => g.type === 'female').map(g => <GroupCard key={g.num} group={g} />)}
              </div>
            </div>
          )}

          {/* Mixed / remaining groups */}
          {groups.filter(g => g.type === 'mixed' || g.type === 'other').length > 0 && (
            <div>
              <div style={{
                fontSize: 12, fontWeight: 700, color: '#9a49ee',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(154,73,238,0.2)' }} />
                ⚥ Mixed / Remaining Groups
                <div style={{ flex: 1, height: 1, background: 'rgba(154,73,238,0.2)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {groups.filter(g => g.type === 'mixed' || g.type === 'other').map(g => <GroupCard key={g.num} group={g} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Rounds Client ───────────────────────────────────────────────────────
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

      {/* Rounds list */}
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
              {isActive && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--pink)' }} />}
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
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pink)' }} className="pulse" />
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

      {/* Group Maker */}
      <GroupMaker />
    </div>
  )
}
