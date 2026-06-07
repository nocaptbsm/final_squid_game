export type ParticipantStatus = 'unregistered' | 'active' | 'eliminated' | 'winner'
export type RoundResult = 'survived' | 'eliminated'
export type UserRole = 'admin' | 'team'

export interface User {
  id: string
  username: string
  role: UserRole
  created_at: string
}

export interface Round {
  round_id: string
  round_name: string
  round_order: number
  created_at: string
}

export interface Participant {
  participant_id: string
  assigned_qr: string | null
  roll_no: string
  name: string
  gender: 'M' | 'F' | 'O'
  registered: boolean
  current_status: ParticipantStatus
  registered_at: string | null
  registered_by: string | null
  created_at: string
}

export interface RoundResultRecord {
  id: string
  participant_id: string
  round_id: string
  result: RoundResult
  recorded_by: string | null
  recorded_at: string
  round?: Round
}

export interface EventState {
  id: number
  event_name: string
  current_round_id: string | null
  updated_at: string
  round?: Round
}

export interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  participant_id: string | null
  round_id: string | null
  details: Record<string, unknown> | null
  created_at: string
  user?: User
  participant?: Participant
  round?: Round
}

export interface ParticipantWithResults extends Participant {
  round_results: RoundResultRecord[]
}

export interface DashboardStats {
  total: number
  registered: number
  not_registered: number
  active: number
  eliminated: number
  current_round: Round | null
  round_stats: {
    round: Round
    survived: number
    eliminated: number
  }[]
}
