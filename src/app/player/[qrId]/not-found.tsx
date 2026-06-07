export default function PlayerNotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🦑</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--pink)', marginBottom: 8 }}>
        Player Not Found
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 300 }}>
        This QR code doesn't match any registered participant.
        Please check your QR card or contact a volunteer.
      </p>
    </div>
  )
}
