'use client'
import { useState } from 'react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://squidgame.paradox26.in')

async function generateQRDataUrl(qrId: string): Promise<string> {
  return QRCode.toDataURL(`${SITE_URL}/player/${qrId}`, {
    width: 300, margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
}

function padNum(n: number, total: number): string {
  return String(n).padStart(String(total).length < 3 ? 3 : String(total).length, '0')
}

export default function QRCodesClient() {
  const [count, setCount] = useState(350)
  const [prefix, setPrefix] = useState('SG')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewUrls, setPreviewUrls] = useState<{ id: string; url: string }[]>([])
  const [previewed, setPreviewed] = useState(false)

  // Generate a preview of first 12
  const handlePreview = async () => {
    setGenerating(true)
    setPreviewed(false)
    const preview: { id: string; url: string }[] = []
    const previewCount = Math.min(12, count)
    for (let i = 1; i <= previewCount; i++) {
      const id = `${prefix}-${padNum(i, count)}`
      const url = await generateQRDataUrl(id)
      preview.push({ id, url })
    }
    setPreviewUrls(preview)
    setPreviewed(true)
    setGenerating(false)
  }

  // Generate ALL and open print window
  const handlePrintAll = async () => {
    setGenerating(true)
    setProgress(0)
    toast('Generating all QR codes...')

    const all: { id: string; url: string }[] = []
    for (let i = 1; i <= count; i++) {
      const id = `${prefix}-${padNum(i, count)}`
      const url = await generateQRDataUrl(id)
      all.push({ id, url })
      setProgress(Math.round((i / count) * 100))
    }

    const printWin = window.open('', '_blank')
    if (!printWin) { toast.error('Allow popups to print QR sheets'); setGenerating(false); return }

    const html = `<!DOCTYPE html><html><head><title>Squid Game QR Cards — ${prefix}-001 to ${prefix}-${padNum(count, count)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: white; }
  .page-title { text-align: center; padding: 16px; font-size: 18px; font-weight: 700; color: #333; border-bottom: 2px solid #eee; }
  .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0; }
  .qr-card {
    border: 0.5px solid #ddd;
    padding: 10px 8px;
    text-align: center;
    page-break-inside: avoid;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
  }
  .qr-card img { width: 120px; height: 120px; display: block; }
  .qr-id {
    font-size: 15px; font-weight: 900; color: #E31B6D;
    letter-spacing: 1px; margin-top: 4px;
  }
  .event-name { font-size: 8px; color: #999; text-transform: uppercase; letter-spacing: 1px; }
  .shapes { display: flex; gap: 6px; justify-content: center; margin-bottom: 2px; }
  .circle { width: 7px; height: 7px; border-radius: 50%; background: #E31B6D; }
  .triangle { width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-bottom: 7px solid #E31B6D; }
  .square { width: 7px; height: 7px; background: #E31B6D; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
</style></head><body>
<div class="no-print" style="padding:16px;background:#fff3cd;text-align:center;font-size:14px;">
  ⚠️ Set paper size to A4, margins to None, and enable "Background graphics" before printing.
  <button onclick="window.print()" style="margin-left:16px;padding:6px 16px;background:#E31B6D;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;">🖨️ Print Now</button>
</div>
<div class="page-title">PARADOX26 — SQUID GAME · ${count} Player Cards</div>
<div class="grid">
${all.map(({ id, url }) => `
  <div class="qr-card">
    <div class="shapes"><div class="circle"></div><div class="triangle"></div><div class="square"></div></div>
    <img src="${url}" alt="${id}" />
    <div class="qr-id">${id}</div>
    <div class="event-name">PARADOX26 · SQUID GAME</div>
  </div>`).join('')}
</div>
</body></html>`

    printWin.document.write(html)
    printWin.document.close()
    setGenerating(false)
    setProgress(0)
    toast.success(`${count} QR cards ready to print!`)
  }

  // Download single QR
  const downloadSingle = async (id: string) => {
    const url = await generateQRDataUrl(id)
    const a = document.createElement('a')
    a.href = url
    a.download = `${id}.png`
    a.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>QR Code Generator</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Generate standalone QR cards first — link to students at registration gate
        </p>
      </div>

      {/* How it works */}
      <div className="card" style={{ background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.2)', padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          How the QR flow works
        </div>
        <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
          {[
            { step: '1', label: 'Generate & Print', desc: '350 blank QR cards (SG-001 to SG-350)' },
            { step: '2', label: 'Import CSV', desc: '1500+ students — no QR assigned yet' },
            { step: '3', label: 'At the gate', desc: 'Volunteer scans card → enters roll no → linked' },
          ].map((s, i, arr) => (
            <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 16px' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--teal)', color: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 14, marginBottom: 6,
                }}>
                  {s.step}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 130, marginTop: 2 }}>{s.desc}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 20, marginBottom: 20 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Generator controls */}
      <div className="card">
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Generate QR Cards</div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 24 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="label">Number of QR cards</label>
            <input
              id="qr-count"
              type="number"
              className="input"
              value={count}
              min={1} max={9999}
              onChange={e => { setCount(Number(e.target.value)); setPreviewed(false) }}
              style={{ width: 140 }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Will generate {prefix}-{padNum(1, count)} to {prefix}-{padNum(count, count)}
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
              style={{ width: 100 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-ghost"
              onClick={handlePreview}
              disabled={generating}
              id="preview-btn"
            >
              👁 Preview First 12
            </button>

            <button
              className="btn btn-primary"
              onClick={handlePrintAll}
              disabled={generating}
              id="print-all-btn"
              style={{ gap: 8, display: 'flex', alignItems: 'center' }}
            >
              {generating ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16 }} />
                  {progress > 0 ? `${progress}%` : 'Starting...'}
                </>
              ) : (
                `🖨️ Generate & Print All ${count}`
              )}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {generating && progress > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--pink), var(--teal))',
                transition: 'width 0.2s',
              }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Generating QR codes... {progress}%
            </div>
          </div>
        )}

        {/* Info box */}
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
        }}>
          💡 Each card encodes the URL: <code style={{ color: 'var(--teal)', fontSize: 12 }}>
            {SITE_URL}/player/{prefix}-001
          </code><br />
          Cards are printed blank — no student name on them. The link happens at registration time.
        </div>
      </div>

      {/* Preview grid */}
      {previewed && previewUrls.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
            Preview (first {previewUrls.length} cards)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {previewUrls.map(({ id, url }) => (
              <div key={id} style={{
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '12px 8px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                {/* Squid Game shapes */}
                <div style={{ display: 'flex', gap: 5, marginBottom: 2 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pink)' }} />
                  <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '8px solid var(--pink)' }} />
                  <div style={{ width: 8, height: 8, background: 'var(--pink)' }} />
                </div>
                <div style={{ background: 'white', padding: 6, borderRadius: 6 }}>
                  <img src={url} alt={id} style={{ width: 110, height: 110, display: 'block' }} />
                </div>
                <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--pink)', letterSpacing: 1 }}>{id}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>PARADOX26</div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => downloadSingle(id)}
                  id={`dl-${id}`}
                >
                  ⬇ Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
