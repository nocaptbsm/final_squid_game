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

interface RoundParticipant extends Player {
  result: 'survived' | 'eliminated' | null
}

interface Group {
  num: number
  members: Player[]
  type: 'male' | 'female' | 'mixed' | 'other'
}

// ─── Group algorithm ──────────────────────────────────────────────────────────
function makeGroups(players: Player[], size: number): Group[] {
  const sort = (arr: Player[]) => [...arr].sort((a, b) => a.roll_no.localeCompare(b.roll_no))
  const males   = sort(players.filter(p => p.gender === 'M'))
  const females = sort(players.filter(p => p.gender === 'F'))
  const others  = sort(players.filter(p => p.gender !== 'M' && p.gender !== 'F'))
  const groups: Group[] = []
  let num = 1

  const chunkGender = (arr: Player[], type: Group['type']) => {
    for (let i = 0; i + size <= arr.length; i += size)
      groups.push({ num: num++, members: arr.slice(i, i + size), type })
    return arr.slice(Math.floor(arr.length / size) * size)
  }

  const leftM = chunkGender(males, 'male')
  const leftF = chunkGender(females, 'female')
  const remaining = [...leftM, ...leftF, ...others]

  for (let i = 0; i < remaining.length; i += size) {
    const chunk = remaining.slice(i, i + size)
    const hasM = chunk.some(p => p.gender === 'M')
    const hasF = chunk.some(p => p.gender === 'F')
    groups.push({ num: num++, members: chunk, type: hasM && hasF ? 'mixed' : hasM ? 'male' : hasF ? 'female' : 'other' })
  }
  return groups
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const GC: Record<string, { bg: string; border: string; badge: string; label: string }> = {
  male:   { bg: 'rgba(99,179,237,0.07)',  border: 'rgba(99,179,237,0.25)',  badge: 'rgba(99,179,237,0.15)',  label: '#63b3ed' },
  female: { bg: 'rgba(255,45,120,0.07)',  border: 'rgba(255,45,120,0.2)',   badge: 'rgba(255,45,120,0.12)',  label: 'var(--pink)' },
  mixed:  { bg: 'rgba(154,73,238,0.07)', border: 'rgba(154,73,238,0.2)',   badge: 'rgba(154,73,238,0.12)', label: '#9a49ee' },
  other:  { bg: 'rgba(152,152,184,0.07)', border: 'rgba(152,152,184,0.2)', badge: 'rgba(152,152,184,0.12)', label: 'var(--text-muted)' },
}

// ─── Group card ───────────────────────────────────────────────────────────────
function GroupCard({ group }: { group: Group }) {
  const c = GC[group.type]
  const label = { male: '♂ Male', female: '♀ Female', mixed: '⚥ Mixed', other: '— Other' }[group.type]
  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 'var(--radius-sm)', background: c.bg, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>Group {group.num}</div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: c.badge, color: c.label }}>{label}</span>
      </div>
      {group.members.map((m, i) => (
        <div key={m.participant_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.15)', marginBottom: 4 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{m.roll_no}</div>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 100, background: c.badge, color: c.label, flexShrink: 0 }}>{m.gender}</span>
        </div>
      ))}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>{group.members.length} members</div>
    </div>
  )
}

// ─── Per-round group maker ────────────────────────────────────────────────────
function RoundGroupMaker({ roundId, roundName }: { roundId: string; roundName: string }) {
  const supabase = createClient()
  const [mode, setMode] = useState<'auto'|'manual'>('auto')
  const [searchQuery, setSearchQuery] = useState('')
  const [groupSize, setGroupSize] = useState(4)
  const [groups, setGroups] = useState<Group[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const fetchPlayers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('participants')
      .select('participant_id, name, roll_no, gender, assigned_qr')
      .eq('current_status', 'active')
      .order('roll_no')
    setLoading(false)
    if (error || !data?.length) { toast.error('No active players'); return [] }
    setPlayers(data)
    setAvailablePlayers(data)
    return data
  }

  const generateAuto = async () => {
    if (groupSize < 2) { toast.error('Group size must be ≥ 2'); return }
    let data = players
    if (!data.length) data = await fetchPlayers()
    if (!data.length) return
    
    setGroups(makeGroups(data, groupSize))
    setDone(true)
    toast.success(`${makeGroups(data, groupSize).length} groups created`)
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const createManualGroup = () => {
    if (selectedIds.size === 0) return
    const members = availablePlayers.filter(p => selectedIds.has(p.participant_id))
    const hasM = members.some(p => p.gender === 'M')
    const hasF = members.some(p => p.gender === 'F')
    const type = hasM && hasF ? 'mixed' : hasM ? 'male' : hasF ? 'female' : 'other'
    
    const newGroup: Group = { num: groups.length + 1, members, type }
    setGroups([...groups, newGroup])
    setAvailablePlayers(availablePlayers.filter(p => !selectedIds.has(p.participant_id)))
    setSelectedIds(new Set())
    setDone(true)
  }

  const resetManual = () => {
    setSearchQuery('')
    setGroups([])
    setAvailablePlayers(players)
    setSelectedIds(new Set())
    setDone(groups.length > 0)
  }

  const switchMode = async (m: 'auto'|'manual') => {
    setSearchQuery('')
    setMode(m)
    setGroups([])
    setDone(false)
    if (m === 'manual') {
      if (!players.length) await fetchPlayers()
      else setAvailablePlayers(players)
    }
  }

  const printGroups = (gs: Group[], ps: Player[]) => {
    const males = ps.filter(p => p.gender === 'M').length
    const females = ps.filter(p => p.gender === 'F').length

    const renderG = (g: Group) => {
      const label = { male: '♂ Male', female: '♀ Female', mixed: '⚥ Mixed', other: '— Other' }[g.type]
      const clr = { male: '#1d4ed8', female: '#be185d', mixed: '#6d28d9', other: '#6b7280' }[g.type]
      const bg  = { male: '#dbeafe', female: '#fce7f3', mixed: '#ede9fe', other: '#f3f4f6' }[g.type]
      return `<div class="gc"><div class="gh"><span class="gn">Group ${g.num}</span><span class="gb" style="background:${bg};color:${clr}">${label}</span></div>${g.members.map((m, i) => `<div class="mr"><span class="mi">${i + 1}</span><span class="mn">${m.name}</span><span class="mr2">${m.roll_no}</span><span class="mg">${m.gender}</span></div>`).join('')}<div class="gf">${g.members.length} members</div></div>`
    }

    const mG = gs.filter(g => g.type === 'male')
    const fG = gs.filter(g => g.type === 'female')
    const xG = gs.filter(g => g.type === 'mixed' || g.type === 'other')

    const html = `<!DOCTYPE html><html><head><title>Groups — ${roundName}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial;padding:16px;color:#111}
h1{text-align:center;font-size:18px;margin-bottom:4px}.sub{text-align:center;color:#666;font-size:12px;margin-bottom:16px}
.st{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;padding:5px 10px;border-radius:4px;margin:14px 0 8px;display:inline-block}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.gc{border:1px solid #ddd;border-radius:8px;padding:10px;page-break-inside:avoid}
.gh{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.gn{font-weight:800;font-size:13px}.gb{font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px}
.mr{display:flex;align-items:center;gap:6px;padding:4px 7px;background:#f9f9f9;border-radius:4px;margin-bottom:3px}
.mi{width:18px;height:18px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700}
.mn{flex:1;font-size:11px;font-weight:600}.mr2{font-size:10px;color:#666;font-family:monospace}
.mg{font-size:9px;font-weight:700;padding:1px 5px;border-radius:100px;background:#e5e7eb}
.gf{font-size:9px;color:#999;text-align:right;margin-top:6px}
.np{text-align:center;padding:10px;background:#fff3cd;margin-bottom:12px}
.np button{padding:5px 14px;background:#E31B6D;color:#fff;border:none;border-radius:4px;cursor:pointer}
@media print{.np{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
<div class="np">Set margins to None · <button onclick="window.print()">🖨️ Print</button></div>
<h1>PARADOX26 — ${roundName} · Groups</h1>
<div class="sub">${gs.length} groups · ${ps.length} players (♂${males} ♀${females})</div>
${mG.length ? `<div class="st" style="background:#dbeafe;color:#1d4ed8">♂ Male Groups (${mG.length})</div><div class="grid">${mG.map(renderG).join('')}</div>` : ''}
${fG.length ? `<div class="st" style="background:#fce7f3;color:#be185d">♀ Female Groups (${fG.length})</div><div class="grid">${fG.map(renderG).join('')}</div>` : ''}
${xG.length ? `<div class="st" style="background:#ede9fe;color:#6d28d9">⚥ Mixed Groups (${xG.length})</div><div class="grid">${xG.map(renderG).join('')}</div>` : ''}
</body></html>`

    const w = window.open('', '_blank')
    if (!w) { toast.error('Allow popups'); return }
    w.document.write(html); w.document.close()
  }

  const maleG = groups.filter(g => g.type === 'male')
  const femaleG = groups.filter(g => g.type === 'female')
  const mixedG = groups.filter(g => g.type === 'mixed' || g.type === 'other')

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Group Maker</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Create subgroups for the next round</div>
        </div>
        {done && <button className="btn btn-ghost btn-sm" onClick={() => printGroups(groups, mode === 'auto' ? players : groups.flatMap(g => g.members))} id={`print-groups-${roundId}`}>🖨️ Print Groups</button>}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button className={`btn btn-sm ${mode === 'auto' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchMode('auto')}>Automatic</button>
        <button className={`btn btn-sm ${mode === 'manual' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchMode('manual')}>Manual Selection</button>
      </div>

      {mode === 'auto' ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: done ? 14 : 0 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label" style={{ fontSize: 11 }}>Players per group</label>
            <input id={`gs-${roundId}`} type="number" className="input" value={groupSize} min={2} max={50}
              onChange={e => { setGroupSize(Number(e.target.value)); setDone(false) }} style={{ width: 100 }} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={generateAuto} disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 14, height: 14, display: 'inline-block' }} /> Generating…</> : '⚡ Generate Groups'}
          </button>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, background: 'var(--bg-secondary)', marginBottom: done ? 14 : 0 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Select participants for Group {groups.length + 1}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input 
                type="text" 
                className="input" 
                placeholder="Search name, roll, or QR..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                style={{ height: 28, fontSize: 12, width: 200 }}
              />
              <button className="btn btn-ghost btn-sm" onClick={resetManual}>Reset All</button>
              <button className="btn btn-primary btn-sm" onClick={createManualGroup} disabled={selectedIds.size === 0}>
                Create Group ({selectedIds.size})
              </button>
            </div>
          </div>
          
          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)' }}>
            {availablePlayers.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No players available</div>
            ) : availablePlayers.filter(p => 
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              p.roll_no.toLowerCase().includes(searchQuery.toLowerCase()) || 
              (p.assigned_qr && p.assigned_qr.toLowerCase().includes(searchQuery.toLowerCase()))
            ).length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No players available</div>
            ) : (
              availablePlayers.filter(p => 
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                p.roll_no.toLowerCase().includes(searchQuery.toLowerCase()) || 
                (p.assigned_qr && p.assigned_qr.toLowerCase().includes(searchQuery.toLowerCase()))
              ).map(p => (
                <div key={p.participant_id} onClick={() => toggleSelect(p.participant_id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)', background: selectedIds.has(p.participant_id) ? 'rgba(255,45,120,0.1)' : 'transparent'
                }}>
                  <input type="checkbox" checked={selectedIds.has(p.participant_id)} readOnly style={{ accentColor: 'var(--pink)' }} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.name} <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>{p.roll_no}</span></div>
                  <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg-secondary)', borderRadius: 100 }}>{p.gender}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {done && groups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
            <span style={{ marginLeft: 'auto', fontWeight: 700 }}>
              {groups.length} groups
              {maleG.length > 0 && <span style={{ color: '#63b3ed', marginLeft: 8 }}>♂{maleG.length}</span>}
              {femaleG.length > 0 && <span style={{ color: 'var(--pink)', marginLeft: 8 }}>♀{femaleG.length}</span>}
              {mixedG.length > 0 && <span style={{ color: '#9a49ee', marginLeft: 8 }}>⚥{mixedG.length}</span>}
            </span>
          </div>

          {/* Male groups */}
          {maleG.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#63b3ed', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(99,179,237,0.2)' }} />♂ Male<div style={{ flex: 1, height: 1, background: 'rgba(99,179,237,0.2)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 10 }}>
                {maleG.map(g => <GroupCard key={g.num} group={g} />)}
              </div>
            </div>
          )}
          {/* Female groups */}
          {femaleG.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--pink)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,45,120,0.2)' }} />♀ Female<div style={{ flex: 1, height: 1, background: 'rgba(255,45,120,0.2)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 10 }}>
                {femaleG.map(g => <GroupCard key={g.num} group={g} />)}
              </div>
            </div>
          )}
          {/* Mixed groups */}
          {mixedG.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9a49ee', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(154,73,238,0.2)' }} />⚥ Mixed / Remaining<div style={{ flex: 1, height: 1, background: 'rgba(154,73,238,0.2)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 10 }}>
                {mixedG.map(g => <GroupCard key={g.num} group={g} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Expanded round detail ────────────────────────────────────────────────────
function RoundDetail({ round, roundId }: { round: Round; roundId: string }) {
  const supabase = createClient()
  const [participants, setParticipants] = useState<RoundParticipant[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    if (loaded) return
    setLoading(true)
    const { data } = await supabase
      .from('round_results')
      .select(`result, participant:participants(participant_id, name, roll_no, gender, assigned_qr)`)
      .eq('round_id', roundId)
    const rows: RoundParticipant[] = (data || []).map((r: any) => ({
      ...r.participant,
      result: r.result,
    }))
    rows.sort((a, b) => a.roll_no.localeCompare(b.roll_no))
    setParticipants(rows)
    setLoaded(true)
    setLoading(false)
  }

  // Load on first render
  useState(() => { load() })

  const survived  = (participants || []).filter(p => p.result === 'survived')
  const eliminated = (participants || []).filter(p => p.result === 'eliminated')

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
      {loading && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>Loading round data…</div>}

      {participants !== null && (
        <>
          {participants.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>
              No results recorded for this round yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 }}>
              {/* Survived */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  ✓ Survived ({survived.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
                  {survived.map(p => (
                    <div key={p.participant_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.15)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.roll_no}</div>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.gender}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Eliminated */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  ✗ Eliminated ({eliminated.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
                  {eliminated.map(p => (
                    <div key={p.participant_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.15)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.roll_no}</div>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.gender}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Group Maker for this round */}
      <RoundGroupMaker roundId={roundId} roundName={round.round_name} />
    </div>
  )
}

// ─── Main Rounds Client ───────────────────────────────────────────────────────
export default function RoundsClient({ rounds, eventState, roundResults }: {
  rounds: Round[]
  eventState: EventState | null
  roundResults: { round_id: string; result: string }[]
}) {
  const supabase = createClient()
  const [currentRoundId, setCurrentRoundId] = useState(eventState?.current_round_id || null)
  const [loading, setLoading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const setActive = async (roundId: string) => {
    setLoading(roundId)
    const { error } = await supabase
      .from('event_state')
      .update({ current_round_id: roundId, updated_at: new Date().toISOString() })
      .eq('id', 1)
    if (error) toast.error('Failed to update round')
    else {
      setCurrentRoundId(roundId)
      toast.success(`Active: ${rounds.find(r => r.round_id === roundId)?.round_name}`)
    }
    setLoading(null)
  }

  const getStats = (roundId: string) => {
    const rr = roundResults.filter(r => r.round_id === roundId)
    return { survived: rr.filter(r => r.result === 'survived').length, eliminated: rr.filter(r => r.result === 'eliminated').length }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Round Management</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Click a round to view results and create groups</p>
      </div>

      {rounds.map(round => {
        const isActive = round.round_id === currentRoundId
        const isExpanded = expanded === round.round_id
        const stats = getStats(round.round_id)
        const hasResults = stats.survived + stats.eliminated > 0

        return (
          <div key={round.round_id} className="card" style={{
            border: isActive ? '1px solid rgba(255,45,120,0.45)' : '1px solid var(--border)',
            background: isActive ? 'rgba(255,45,120,0.04)' : 'var(--bg-card)',
            position: 'relative', overflow: 'hidden',
            cursor: 'pointer',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}>
            {isActive && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--pink)' }} />}

            {/* Round header row — click to expand */}
            <div
              onClick={() => setExpanded(isExpanded ? null : round.round_id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Number badge */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: isActive ? 'var(--pink)' : 'var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 800, flexShrink: 0,
                  color: isActive ? 'white' : 'var(--text-secondary)',
                }}>
                  {round.round_order}
                </div>

                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{round.round_name}</div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 3, fontSize: 12 }}>
                    <span style={{ color: 'var(--teal)' }}>✓ {stats.survived} survived</span>
                    <span style={{ color: 'var(--red)' }}>✗ {stats.eliminated} eliminated</span>
                    {hasResults && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        {Math.round(stats.survived / (stats.survived + stats.eliminated) * 100)}% survival
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {isActive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 100, background: 'var(--pink-subtle)', border: '1px solid rgba(255,45,120,0.3)' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pink)' }} className="pulse" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pink)' }}>ACTIVE</span>
                  </div>
                )}
                <button
                  className={`btn ${isActive ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                  onClick={e => { e.stopPropagation(); setActive(round.round_id) }}
                  disabled={isActive || !!loading}
                  id={`set-round-${round.round_order}`}
                >
                  {loading === round.round_id ? '…' : isActive ? 'Current' : 'Set Active'}
                </button>
                {/* Expand chevron */}
                <div style={{ fontSize: 16, color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', userSelect: 'none' }}>
                  ▾
                </div>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && <RoundDetail round={round} roundId={round.round_id} />}
          </div>
        )
      })}
    </div>
  )
}
