'use client'
import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'

// Always use the domain you're currently on — so QRs encode the correct URL.
// Optionally override with NEXT_PUBLIC_SITE_URL in Vercel env vars.
function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL)
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  if (typeof window !== 'undefined')
    return window.location.origin
  return ''
}

async function genUrl(id: string): Promise<string> {
  const base = getSiteUrl()
  return QRCode.toDataURL(`${base}/player/${id}`, {
    width: 400, margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
}

function pad(n: number, total: number) {
  return String(n).padStart(Math.max(3, String(total).length), '0')
}

function b64(dataUrl: string) { return dataUrl.split(',')[1] }

interface QRItem { id: string; url: string }

// Shows the URL being encoded so admin can verify before generating
function UrlBanner({ count }: { count: number }) {
  const url = getSiteUrl()
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1') || url === ''
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 'var(--radius-sm)',
      background: isLocalhost ? 'rgba(255,180,0,0.08)' : 'rgba(0,212,170,0.07)',
      border: `1px solid ${isLocalhost ? 'rgba(255,180,0,0.4)' : 'rgba(0,212,170,0.3)'}`,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{isLocalhost ? '⚠️' : '✅'}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: isLocalhost ? '#ffb400' : 'var(--teal)', marginBottom: 4 }}>
          {isLocalhost
            ? 'Warning — QRs will encode a localhost URL (not scannable from other devices)'
            : 'QRs will encode this URL — looks correct:'}
        </div>
        <code style={{ fontSize: 11, color: isLocalhost ? '#ffb400' : 'var(--teal)', wordBreak: 'break-all', display: 'block' }}>
          {url}/player/SG-001 … SG-{String(count).padStart(3, '0')}
        </code>
        {isLocalhost && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            ➜ Open this page from your <strong style={{ color: 'var(--text-primary)' }}>Vercel production URL</strong> to generate scannable QR codes.
          </div>
        )}
      </div>
    </div>
  )
}

export default function QRCodesClient() {
  const [count, setCount] = useState(350)
  const [prefix, setPrefix] = useState('SG')
  const [qrs, setQrs] = useState<QRItem[]>([])
  const [genProgress, setGenProgress] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [actionPhase, setActionPhase] = useState<'idle' | 'zip' | 'print'>('idle')
  const [actionProgress, setActionProgress] = useState(0)
  const generatingRef = useRef(false)

  // Auto-generate on mount or when count/prefix changes
  useEffect(() => {
    generateAll()
  }, [])

  const generateAll = async (c = count, p = prefix) => {
    if (generatingRef.current) return
    generatingRef.current = true
    setIsGenerating(true)
    setGenProgress(0)
    setQrs([])

    const result: QRItem[] = []
    const BATCH = 10
    for (let i = 1; i <= c; i++) {
      const id = `${p}-${pad(i, c)}`
      const url = await genUrl(id)
      result.push({ id, url })
      // Update in batches for performance
      if (i % BATCH === 0 || i === c) {
        setQrs([...result])
        setGenProgress(Math.round((i / c) * 100))
      }
    }
    setIsGenerating(false)
    generatingRef.current = false
  }

  const applySettings = () => {
    generateAll(count, prefix)
  }

  // Download ZIP
  const handleZip = async () => {
    if (!qrs.length) { toast.error('Generate QR codes first'); return }
    setActionPhase('zip')
    setActionProgress(0)
    toast('Creating ZIP…')
    try {
      const JSZip = (await import('jszip')).default
      const { saveAs } = await import('file-saver')
      const zip = new JSZip()
      const folder = zip.folder(`${prefix}-QR-Codes`)!
      for (let i = 0; i < qrs.length; i++) {
        folder.file(`${qrs[i].id}.png`, b64(qrs[i].url), { base64: true })
        if (i % 50 === 0) setActionProgress(Math.round((i / qrs.length) * 80))
      }
      setActionProgress(90)
      const blob = await zip.generateAsync({ type: 'blob' })
      setActionProgress(100)
      saveAs(blob, `${prefix}-QR-Codes-${count}.zip`)
      toast.success(`✅ ${count} QR codes downloaded!`)
    } catch (e) {
      toast.error('ZIP failed: ' + e)
    }
    setActionPhase('idle')
    setActionProgress(0)
  }

  // Print — 4 per A4 page with specific layout
  const handlePrint = async () => {
    if (!qrs.length) { toast.error('Generate QR codes first'); return }
    setActionPhase('print')
    toast('Preparing print sheet…')

    const PER_PAGE = 4 // 2 columns × 2 rows on A4

    // Split into pages of 4
    const pages: QRItem[][] = []
    for (let i = 0; i < qrs.length; i += PER_PAGE) {
      pages.push(qrs.slice(i, i + PER_PAGE))
    }

    const base = getSiteUrl()

    const renderCard = (q: QRItem) => `
      <div class="qr-card">
        <div class="card-header">
          <img src="${base}/squid_logo_new.jpg" class="squid-logo" alt="Squid Game" />
          <img src="${base}/paradox_logo_new.jpg" class="paradox-logo" alt="IIT Madras Paradox" />
        </div>
        <img src="${q.url}" class="qr-img" alt="${q.id}" />
        <div class="qr-id">${q.id}</div>
      </div>`

    const html = `<!DOCTYPE html><html><head>
<title>Squid Game QR Cards</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; background: white; }
  
  .no-print {
    text-align: center; padding: 14px;
    background: #fff3cd; border-bottom: 2px solid #ffc107;
    font-size: 13px; position: sticky; top: 0; z-index: 99;
  }
  .no-print button {
    margin-left: 12px; padding: 6px 18px;
    background: #E31B6D; color: white;
    border: none; border-radius: 6px;
    cursor: pointer; font-size: 14px; font-weight: 700;
  }

  /* A4 page: 210mm × 297mm */
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 10mm;
    page-break-after: always;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 10mm;
    margin: 0 auto;
  }
  .page:last-child { page-break-after: auto; }

  .qr-card {
    border: none;
    padding: 6mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    height: 100%;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
    margin-bottom: 5mm;
  }
  .squid-logo {
    height: 35mm;
    object-fit: contain;
  }
  .paradox-logo {
    height: 35mm;
    object-fit: contain;
  }
  .qr-img {
    width: 90mm;
    height: 90mm;
    display: block;
    margin: 0 auto 5mm auto;
    /* Optional crisp edge */
    image-rendering: pixelated; 
  }
  .qr-id {
    font-size: 42px;
    font-weight: 900;
    color: #000;
    letter-spacing: 2px;
    text-align: center;
  }

  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { margin: 0; box-shadow: none; outline: none; }
  }
</style></head><body>
<div class="no-print">
  Set margins to <strong>None</strong> · Paper: <strong>A4</strong> · Enable <strong>Background graphics</strong>
  <button onclick="window.print()">🖨️ Print Now</button>
</div>
${pages.map(page => `<div class="page">${page.map(renderCard).join('')}</div>`).join('')}
</body></html>`

    const w = window.open('', '_blank')
    if (!w) { toast.error('Allow popups'); setActionPhase('idle'); return }
    w.document.write(html)
    w.document.close()
    toast.success(`${qrs.length} cards ready — ${pages.length} pages (4 per page)`)
    setActionPhase('idle')
  }

  const busy = isGenerating || actionPhase !== 'idle'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>QR Code Generator</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Print once — works forever even after data resets
        </p>
      </div>

      {/* URL verification banner */}
      <UrlBanner count={count} />

      {/* Controls bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label">Number of cards</label>
            <input id="qr-count" type="number" className="input"
              value={count} min={1} max={9999}
              onChange={e => setCount(Number(e.target.value))}
              style={{ width: 120 }}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label">Prefix</label>
            <input id="qr-prefix" type="text" className="input"
              value={prefix} maxLength={6}
              onChange={e => setPrefix(e.target.value.toUpperCase())}
              style={{ width: 88 }}
            />
          </div>
          <button className="btn btn-ghost" onClick={applySettings} disabled={busy} id="regenerate-btn">
            🔄 {isGenerating ? `Generating… ${genProgress}%` : 'Regenerate'}
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-teal" onClick={handlePrint} disabled={busy} id="print-btn">
              🖨️ Print (6/page A4)
            </button>
            <button className="btn btn-primary" onClick={handleZip} disabled={busy} id="zip-btn">
              {actionPhase === 'zip' ? `Zipping… ${actionProgress}%` : `⬇ Download ZIP`}
            </button>
          </div>
        </div>

        {/* Generation progress */}
        {isGenerating && (
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${genProgress}%`,
                background: 'linear-gradient(90deg, var(--pink), var(--teal))',
                transition: 'width 0.1s',
              }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Generating {qrs.length} of {count} QR codes… {genProgress}%
            </div>
          </div>
        )}
      </div>

      {/* QR Grid — shown directly */}
      {qrs.length > 0 && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            {qrs.length} of {count} QR codes
            {isGenerating && <span style={{ color: 'var(--teal)', marginLeft: 8 }}>● generating…</span>}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12,
          }}>
            {qrs.map(({ id, url }) => (
              <div key={id} style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 10px',
                textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'var(--bg-card)',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,45,120,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {/* Squid Game shapes */}
                <div style={{ display: 'flex', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pink)' }} />
                  <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '7px solid var(--pink)' }} />
                  <div style={{ width: 7, height: 7, background: 'var(--pink)' }} />
                </div>
                {/* QR image */}
                <div style={{ background: 'white', padding: 6, borderRadius: 6 }}>
                  <img src={url} alt={id} style={{ width: 120, height: 120, display: 'block' }} />
                </div>
                <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--pink)', letterSpacing: 1 }}>{id}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PARADOX26</div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', fontSize: 11 }}
                  onClick={async () => {
                    const a = document.createElement('a')
                    a.href = url; a.download = `${id}.png`; a.click()
                  }}
                >
                  ⬇ PNG
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {qrs.length === 0 && !isGenerating && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Click <strong>Regenerate</strong> to generate QR codes
        </div>
      )}
    </div>
  )
}
