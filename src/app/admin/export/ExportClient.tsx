'use client'
const ExportClient = ({ participants }: { participants: any[] }) => {
  const downloadCSV = () => {
    const headers = ['QR ID', 'Roll No', 'Name', 'Gender', 'Registered', 'Last Round Reached', 'Final Status']
    const rows = participants.map(p => {
      const sortedResults = (p.round_results || []).sort((a: any, b: any) => b.round.round_order - a.round.round_order)
      const lastRound = sortedResults[0]?.round?.round_name || '—'
      return [
        p.assigned_qr || '',
        p.roll_no,
        p.name,
        p.gender,
        p.registered ? 'Yes' : 'No',
        lastRound,
        p.registered ? p.current_status : 'unregistered',
      ]
    })
    const csv = [headers, ...rows].map(row => row.map((v: string) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `squidgame-results-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Export Results</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Download complete event data as CSV</p>
      </div>
      <div className="card" style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Full Event Report</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
            Exports all {participants.length} participants with their registration status, last round reached, and final outcome.
          </p>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['QR ID', 'Roll No', 'Name', 'Gender', 'Registered', 'Last Round Reached', 'Final Status'].map(col => (
              <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--teal)', fontSize: 16 }}>✓</span> {col}
              </div>
            ))}
          </div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={downloadCSV} id="download-csv-btn" style={{ width: '100%' }}>
          📥 Download CSV
        </button>
      </div>
    </div>
  )
}
export default ExportClient
