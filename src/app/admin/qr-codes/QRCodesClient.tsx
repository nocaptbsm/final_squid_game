'use client'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Participant { participant_id: string; assigned_qr: string | null; name: string; roll_no: string; registered: boolean; current_status: string }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://squidgame.paradox26.in')

async function generateQRDataUrl(qrId: string): Promise<string> {
  return QRCode.toDataURL(`${SITE_URL}/player/${qrId}`, {
    width: 200, margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

export default function QRCodesClient({ participants, unassigned }: { participants: Participant[], unassigned: { participant_id: string; roll_no: string; name: string }[] }) {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({})
  const [generatingAll, setGeneratingAll] = useState(false)
  const [assigningAll, setAssigningAll] = useState(false)

  const filtered = participants.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.assigned_qr || '').includes(search.toUpperCase()) ||
    p.roll_no.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    // Generate QR codes for visible participants
    const generate = async () => {
      const updates: Record<string, string> = {}
      for (const p of filtered.slice(0, 50)) {
        if (p.assigned_qr && !qrDataUrls[p.assigned_qr]) {
          updates[p.assigned_qr] = await generateQRDataUrl(p.assigned_qr)
        }
      }
      if (Object.keys(updates).length) setQrDataUrls(prev => ({ ...prev, ...updates }))
    }
    generate()
  }, [filtered])

  const assignQRsToAll = async () => {
    if (!unassigned.length) { toast('All participants already have QR codes'); return }
    setAssigningAll(true)
    // Get max existing QR number
    const maxNum = participants.reduce((max, p) => {
      const n = parseInt((p.assigned_qr || 'SG-000').replace('SG-', '')) || 0
      return Math.max(max, n)
    }, 0)
    let next = maxNum
    const updates = unassigned.map(p => {
      next++
      return { participant_id: p.participant_id, assigned_qr: `SG-${String(next).padStart(3, '0')}` }
    })
    for (const u of updates) {
      await supabase.from('participants').update({ assigned_qr: u.assigned_qr }).eq('participant_id', u.participant_id)
    }
    toast.success(`Assigned QR codes to ${updates.length} participants`)
    window.location.reload()
    setAssigningAll(false)
  }

  const downloadSingle = async (qrId: string, name: string) => {
    const url = await generateQRDataUrl(qrId)
    const a = document.createElement('a')
    a.href = url
    a.download = `${qrId}-${name.replace(/\s+/g, '-')}.png`
    a.click()
  }

  const printAll = async () => {
    setGeneratingAll(true)
    toast('Generating print sheet...')
    const urls: Record<string, string> = {}
    for (const p of participants) {
      if (p.assigned_qr) urls[p.assigned_qr] = await generateQRDataUrl(p.assigned_qr)
    }
    const printWin = window.open('', '_blank')
    if (!printWin) { toast.error('Allow popups to print'); return }
    const html = `<!DOCTYPE html><html><head><title>Squid Game QR Codes</title><style>
      body { margin: 0; font-family: Arial; background: white; }
      .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 24px; }
      .qr-card { border: 1px solid #eee; border-radius: 8px; padding: 12px; text-align: center; page-break-inside: avoid; }
      .qr-card img { width: 140px; height: 140px; }
      .qr-id { font-size: 16px; font-weight: 700; margin: 6px 0 2px; }
      .qr-name { font-size: 11px; color: #555; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    </style></head><body><div class="grid">
    ${participants.filter(p => p.assigned_qr && urls[p.assigned_qr]).map(p => `
      <div class="qr-card">
        <img src="${urls[p.assigned_qr!]}" />
        <div class="qr-id">${p.assigned_qr}</div>
        <div class="qr-name">${p.name}</div>
        <div class="qr-name">${p.roll_no}</div>
      </div>
    `).join('')}
    </div><script>window.onload=()=>window.print()<\/script></body></html>`
    printWin.document.write(html)
    printWin.document.close()
    setGeneratingAll(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>QR Codes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{participants.length} QR codes · {unassigned.length} unassigned</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {unassigned.length > 0 && (
            <button className="btn btn-teal" onClick={assignQRsToAll} disabled={assigningAll} id="assign-all-btn">
              {assigningAll ? 'Assigning...' : `Assign QRs to ${unassigned.length} unassigned`}
            </button>
          )}
          <button className="btn btn-primary" onClick={printAll} disabled={generatingAll} id="print-all-btn">
            🖨️ Print All
          </button>
        </div>
      </div>

      <input className="input" style={{ maxWidth: 300 }} placeholder="Search participants..."
        value={search} onChange={e => setSearch(e.target.value)} id="qr-search" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {filtered.map(p => (
          <div key={p.participant_id} className="card" style={{ padding: 16, textAlign: 'center', gap: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {p.assigned_qr && qrDataUrls[p.assigned_qr] ? (
              <div style={{ background: 'white', padding: 8, borderRadius: 8, marginBottom: 4 }}>
                <img src={qrDataUrls[p.assigned_qr]} alt={p.assigned_qr} style={{ width: 120, height: 120, display: 'block' }} />
              </div>
            ) : (
              <div style={{ width: 136, height: 136, background: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading...</div>
            )}
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--pink)' }}>{p.assigned_qr}</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.roll_no}</div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', marginTop: 4 }}
              onClick={() => downloadSingle(p.assigned_qr!, p.name)}
              id={`dl-${p.assigned_qr}`}
            >⬇ Download</button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            {participants.length === 0 ? 'No QR codes generated yet. Import participants first.' : 'No results for search.'}
          </div>
        )}
      </div>
    </div>
  )
}
