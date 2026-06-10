import PlayerPageClient from './PlayerPageClient'

export const dynamic = 'force-dynamic'

// Next.js 16: params is a Promise — must be awaited
export async function generateMetadata({ params }: { params: Promise<{ qrId: string }> }) {
  const { qrId } = await params
  return {
    title: `${qrId.toUpperCase()} — Squid Game Paradox26`,
    description: 'Your live Squid Game scoreboard',
  }
}

export default async function PlayerPage({ params }: { params: Promise<{ qrId: string }> }) {
  // No auth check — fully public page
  const { qrId } = await params
  return <PlayerPageClient qrId={qrId.toUpperCase()} />
}
