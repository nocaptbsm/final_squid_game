'use client'
import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface CSVRow { roll_no: string; name: string; gender: string }

function padQR(n: number) {
  return `SG-${String(n).padStart(3, '0')}`
}

export default function ImportPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<CSVRow[]>([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const parseFile = (file: File) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(' ', '_'),
      complete: (results) => {
        const valid = results.data.filter(r => r.roll_no && r.name)
        setRows(valid)
        if (results.errors.length) setErrors(results.errors.map(e => e.message))
      }
    })
  }

  const handleFile = (file: File) => { parseFile(file) }
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
    else toast.error('Please upload a CSV file')
  }, [])

  const handleImport = async () => {
    if (!rows.length) return
    setImporting(true)
    setErrors([])
    let count = 0
    const errs: string[] = []

    // Get next QR sequence
    const { data: existing } = await supabase.from('participants').select('assigned_qr').not('assigned_qr', 'is', null).order('assigned_qr')
    const usedNums = (existing || []).map(p => parseInt((p.assigned_qr || 'SG-000').replace('SG-', '')) || 0)
    let nextNum = Math.max(0, ...usedNums)

    const BATCH = 50
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const toInsert = batch.map(r => ({
        roll_no: r.roll_no.trim().toUpperCase(),
        name: r.name.trim(),
        gender: ['M', 'F', 'O'].includes((r.gender || '').trim().toUpperCase())
          ? (r.gender.trim().toUpperCase() as 'M' | 'F' | 'O')
          : 'O' as const,
        registered: false,
        current_status: 'unregistered' as const,
      }))
      const { error } = await supabase.from('participants').upsert(toInsert, { onConflict: 'roll_no', ignoreDuplicates: false })
      if (error) errs.push(error.message)
      else count += batch.length
      setImported(count)
    }

    if (errs.length) setErrors(errs)
    if (count > 0) toast.success(`Imported ${count} participants`)
    setImporting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Import Participants</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Upload CSV with Roll No, Name, Gender columns</p>
      </div>

      {/* Format hint */}
      <div className="card" style={{ background: 'var(--pink-subtle)', border: '1px solid rgba(255,45,120,0.2)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pink)', marginBottom: 8 }}>Expected CSV Format</div>
        <pre style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
{`Roll No,Name,Gender
CS24B001,Rahul Kumar,M
CS24B002,Anjali Sharma,F`}
        </pre>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${isDragging ? 'var(--pink)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          padding: 48,
          textAlign: 'center',
          background: isDragging ? 'var(--pink-subtle)' : 'var(--bg-secondary)',
          transition: 'all 0.2s', cursor: 'pointer',
        }}
        onClick={() => document.getElementById('csv-file-input')?.click()}
        id="csv-drop-zone"
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Drop CSV here or click to browse</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Supports: .csv</div>
        <input id="csv-file-input" type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>{rows.length} rows ready to import</div>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={importing}
              id="import-btn"
            >
              {importing ? `Importing... ${imported}/${rows.length}` : `Import ${rows.length} Participants`}
            </button>
          </div>
          <div className="table-container" style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table>
              <thead><tr><th>Roll No</th><th>Name</th><th>Gender</th></tr></thead>
              <tbody>
                {rows.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.roll_no}</td>
                    <td>{r.name}</td>
                    <td>{r.gender}</td>
                  </tr>
                ))}
                {rows.length > 20 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>...and {rows.length - 20} more rows</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="alert alert-error">
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Import errors:</div>
            {errors.map((e, i) => <div key={i} style={{ fontSize: 12 }}>• {e}</div>)}
          </div>
        </div>
      )}
    </div>
  )
}
