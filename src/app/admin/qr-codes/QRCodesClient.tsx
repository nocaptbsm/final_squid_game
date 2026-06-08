'use client'
import { useState } from 'react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://squidgame.paradox26.in')

async function generateQRDataUrl(qrId: string): Promise<string> {
  return QRCode.toDataURL(`${SITE_URL}/player/${qrId}`, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
}

function padNum(n: number, total: number): string {
  const digits = Math.max(3, String(total).length)
  return String(n).padStart(digits, '0')
}

// Strip base64 header from data URL → raw base64 for ZIP
function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(',')[1]
}

export default function QRCodesClient() {
  const [count, setCount] = useState(350)
  const [prefix, setPrefix] = useState('SG')
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'generating' | 'zipping' | 'printing' | 'previewing'>('idle')
  const [previewUrls, setPreviewUrls] = useState<{ id: string; url: string }[]>([])
  const [previewed, setPreviewed] = useState(false)

  const busy = phase !== 'idle'

  // ─── Generate ALL QR data URLs with progress ──────────────────────────────
  const generateAll = async (): Promise<{ id: string; url: string }[]> => {
    const all: { id: string; url: string }[] = []
    for (let i = 1; i <= count; i++) {
      const id = `${prefix}-${padNum(i, count)}`
      const url = await generateQRDataUrl(id)
      all.push({ id, url })
      setProgress(Math.round((i / count) * 100))
    }
    return all
  }

  // ─── Preview first 12 ─────────────────────────────────────────────────────
  const handlePreview = async () => {
    setPhase('previewing')
    setPreviewed(false)
    const preview: { id: string; url: string }[] = []
    const n = Math.min(12, count)
    for (let i = 1; i <= n; i++) {
      const id = `${prefix}-${padNum(i, count)}`
      const url = await generateQRDataUrl(id)
      preview.push({ id, url })
    }
    setPreviewUrls(preview)
    setPreviewed(true)
    setPhase('idle')
  }

  // ─── Download ZIP ─────────────────────────────────────────────────────────
  const handleDownloadZip = async () => {
    setPhase('generating')
    setProgress(0)
    toast('Generating QR codes…')

    const all = await generateAll()

    setPhase('zipping')
    toast('Creating ZIP file…')

    // Dynamically import to avoid SSR issues
    const JSZip = (await import('jszip')).default
    const { saveAs } = await import('file-saver')

    const zip = new JSZip()
    const folder = zip.folder(`${prefix}-QR-Codes`)!
    for (const { id, url } of all) {
      folder.file(`${id}.png`, dataUrlToBase64(url), { base64: true })
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, `${prefix}-QR-Codes-${count}.zip`)

    toast.success(`✅ ${count} QR codes downloaded as ZIP!`)
    setPhase('idle')
    setProgress(0)
  }

  // ─── Print sheet ─────────────────────────────────────────────────────────
  const handlePrintAll = async () => {
    setPhase('generating')
    setProgress(0)
    toast('Generating print sheet…')

    const all = await generateAll()

    setPhase('printing')
    const printWin = window.open('', '_blank')
    if (!printWin) { toast.error('Allow popups to print'); setPhase('idle'); return }

    const html = `<!DOCTYPE html><html><head>
<title>Squid Game QR Cards — ${prefix}-001 to ${prefix}-${padNum(count, count)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;background:white}
  .info{text-align:center;padding:12px;font-size:13px;background:#fff3cd;border-bottom:1px solid #ffc107}
  .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:0}
  .card{border:.5px solid #ddd;padding:10px 8px;text-align:center;page-break-inside:avoid;display:flex;flex-direction:column;align-items:center;gap:3px}
  .card img{width:120px;height:120px;display:block}
  .shapes{display:flex;gap:5px;justify-content:center;margin-bottom:2px}
  .circle{width:7px;height:7px;border-radius:50%;background:#E31B6D}
  .triangle{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:7px solid #E31B6D}
  .square{width:7px;height:7px;background:#E31B6D}
  .qr-id{font-size:15px;font-weight:900;color:#E31B6D;letter-spacing:1px}
  .event{font-size:8px;color:#999;text-transform:uppercase;letter-spacing:1px}
  @media print{.info{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="info">
  Set margins to None · Enable Background graphics · <button onclick="window.print()" style="padding:4px 14px;background:#E31B6D;color:white;border:none;border-radius:4px;cursor:pointer">🖨️ Print</button>
</div>
<div class="grid">
${all.map(({ id, url }) => `
  <div class="card">
    <div class="shapes"><div class="circle"></div><div class="triangle"></div><div class="square"></div></div>
    <img src="${url}" />
    <div class="qr-id">${id}</div>
    <div class="event">PARADOX26 · SQUID GAME</div>
  </div>`).join('')}
</div></body></html>`

    printWin.document.write(html)
    printWin.document.close()
    toast.success(`${count} cards ready to print!`)
    setPhase('idle')
    setProgress(0)
  }

  // ─── Single download ─────────────────────────────────────────────────────
  const downloadSingle = async (id: string) => {
    const url = await generateQRDataUrl(id)
    const a = document.createElement('a')
    a.href = url
    a.download = `${id}.png`
    a.click()
  }

  // ─── UI ──────────────────────────────────────────────────────────────────
  const phaseLabel: Record<string, string> = {
    generating: `Generating QR codes… ${progress}%`,
    zipping: 'Creating ZIP file…',
    printing: 'Preparing print sheet…',
    previewing: 'Generating preview…',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>QR Code Generator</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Generate standalone numbered cards — print once, use forever
        </p>
      </div>

      {/* Key fact banner */}
      <div className="card" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.25)', padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 22, flexShrink: 0 }}>💡</div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--teal)', marginBottom: 4 }}>QR codes work forever — no regeneration needed</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Each QR encodes a permanent URL like <code style={{ color: 'var(--teal)', fontSize: 12 }}>{SITE_URL}/player/SG-001</code>.
              This URL never changes — not when you redeploy, not when you reset data.
              <strong style={{ color: 'var(--text-primary)' }}> Download the ZIP once, print, and reuse for testing and the final event.</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Flow steps */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
          Recommended flow
        </div>
        <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { icon: '⬇️', label: 'Download ZIP once', sub: '350 PNG files saved to your computer' },
            { icon: '🖨️', label: 'Print the cards', sub: 'Cut and stack — ready to distribute' },
            { icon: '🧪', label: 'Test with dummy data', sub: 'Import CSV, register, scan, reset' },
            { icon: '🎮', label: 'Use same cards for event', sub: 'Same QRs, fresh data after reset' },
          ].map((s, i, arr) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', padding: '4px 14px' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 120, margin: '0 auto', marginTop: 2 }}>{s.sub}</div>
              </div>
              {i < arr.length - 1 && <div style={{ color: 'var(--text-muted)', fontSize: 18, paddingBottom: 16 }}>→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Generator controls */}
      <div className="card">
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Generate QR Cards</div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 20 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label">Number of cards</label>
            <input
              id="qr-count"
              type="number"
              className="input"
              value={count}
              min={1} max={9999}
              onChange={e => { setCount(Number(e.target.value)); setPreviewed(false) }}
              style={{ width: 130 }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {prefix}-{padNum(1, count)} → {prefix}-{padNum(count, count)}
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="label">Prefix</label>
            <input
              id="qr-prefix"
              type="text"
              className="input"
              value={prefix}
              maxLength={6}
              onChange={e => { setPrefix(e.target.value.toUpperCase()); setPreviewed(false) }}
              style={{ width: 90 }}
            />
          </div>
        </div>

        {/* Progress bar */}
        {busy && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: phase === 'zipping' || phase === 'printing' ? '100%' : `${progress}%`,
                background: 'linear-gradient(90deg, var(--pink), var(--teal))',
                transition: 'width 0.15s',
                animation: (phase === 'zipping' || phase === 'printing') ? 'pulse 1s infinite' : 'none',
              }} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
              {phaseLabel[phase] || ''}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Preview */}
          <button
            className="btn btn-ghost"
            onClick={handlePreview}
            disabled={busy}
            id="preview-btn"
          >
            👁 Preview
          </button>

          {/* ⭐ Primary: Download ZIP */}
          <button
            className="btn btn-primary"
            onClick={handleDownloadZip}
            disabled={busy}
            id="download-zip-btn"
            style={{ gap: 8, display: 'flex', alignItems: 'center', position: 'relative' }}
          >
            {phase === 'generating' || phase === 'zipping' ? (
              <><div className="spinner" style={{ width: 16, height: 16 }} /> {phaseLabel[phase]}</>
            ) : (
              <>⬇ Download {count} QRs as ZIP</>
            )}
          </button>

          {/* Print sheet */}
          <button
            className="btn btn-teal"
            onClick={handlePrintAll}
            disabled={busy}
            id="print-all-btn"
            style={{ gap: 8, display: 'flex', alignItems: 'center' }}
          >
            {phase === 'printing' ? (
              <><div className="spinner" style={{ width: 16, height: 16 }} /> Preparing…</>
            ) : (
              <>🖨️ Print Sheet</>
            )}
          </button>
        </div>

        {/* URL explanation */}
        <div style={{
          marginTop: 16, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text-muted)',
        }}>
          Each card encodes → <code style={{ color: 'var(--teal)' }}>{SITE_URL}/player/{prefix}-001</code> …
          <code style={{ color: 'var(--teal)' }}>{SITE_URL}/player/{prefix}-{padNum(count, count)}</code>
        </div>
      </div>

      {/* Preview grid */}
      {previewed && previewUrls.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
            Preview — first {previewUrls.length} cards
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {previewUrls.map(({ id, url }) => (
              <div key={id} style={{
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '10px 8px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              }}>
                <div style={{ display: 'flex', gap: 5, marginBottom: 2 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pink)' }} />
                  <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '7px solid var(--pink)' }} />
                  <div style={{ width: 7, height: 7, background: 'var(--pink)' }} />
                </div>
                <div style={{ background: 'white', padding: 5, borderRadius: 6 }}>
                  <img src={url} alt={id} style={{ width: 100, height: 100, display: 'block' }} />
                </div>
                <div style={{ fontWeight: 900, fontSize: 13, color: 'var(--pink)', letterSpacing: 1 }}>{id}</div>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>PARADOX26</div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', fontSize: 11 }}
                  onClick={() => downloadSingle(id)}
                >
                  ⬇ PNG
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
