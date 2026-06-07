-- ============================================================
-- Squid Game Event Management System — Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE participant_status AS ENUM ('unregistered', 'active', 'eliminated', 'winner');
CREATE TYPE round_result_enum AS ENUM ('survived', 'eliminated');
CREATE TYPE user_role AS ENUM ('admin', 'team');

-- ============================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'team',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROUNDS TABLE
-- ============================================================
CREATE TABLE public.rounds (
  round_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_name TEXT NOT NULL,
  round_order INT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the 7 preconfigured rounds
INSERT INTO public.rounds (round_name, round_order) VALUES
  ('Treasure Hunt', 1),
  ('Red Light Green Light', 2),
  ('Hitch Hike', 3),
  ('90 Second Collapse', 4),
  ('Glass Bridge', 5),
  ('The Wright Way', 6),
  ('Dalgona Candy', 7);

-- ============================================================
-- EVENT STATE TABLE (singleton)
-- ============================================================
CREATE TABLE public.event_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- enforce singleton
  event_name TEXT NOT NULL DEFAULT 'Squid Game',
  current_round_id UUID REFERENCES public.rounds(round_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.event_state (id, event_name) VALUES (1, 'Squid Game');

-- ============================================================
-- PARTICIPANTS TABLE
-- ============================================================
CREATE TABLE public.participants (
  participant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assigned_qr TEXT UNIQUE,               -- e.g. SG-001
  roll_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  gender CHAR(1) CHECK (gender IN ('M', 'F', 'O')),
  registered BOOLEAN NOT NULL DEFAULT FALSE,
  current_status participant_status NOT NULL DEFAULT 'unregistered',
  registered_at TIMESTAMPTZ,
  registered_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROUND RESULTS TABLE
-- ============================================================
CREATE TABLE public.round_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES public.participants(participant_id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.rounds(round_id),
  result round_result_enum NOT NULL,
  recorded_by UUID REFERENCES public.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(participant_id, round_id)   -- one result per participant per round
);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  participant_id UUID REFERENCES public.participants(participant_id),
  round_id UUID REFERENCES public.rounds(round_id),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- QR COUNTER (for sequential SG-XXX generation)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS qr_sequence START 1;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_participants_roll_no ON public.participants(roll_no);
CREATE INDEX idx_participants_assigned_qr ON public.participants(assigned_qr);
CREATE INDEX idx_participants_status ON public.participants(current_status);
CREATE INDEX idx_round_results_participant ON public.round_results(participant_id);
CREATE INDEX idx_round_results_round ON public.round_results(round_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- USERS: admins can manage; users can read own
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "users_self_read" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- PARTICIPANTS: admin + team can read/write; public can read by QR (handled in server action)
CREATE POLICY "participants_staff_all" ON public.participants
  FOR ALL TO authenticated
  USING (public.get_my_role() IN ('admin', 'team'));

CREATE POLICY "participants_public_read" ON public.participants
  FOR SELECT TO anon
  USING (TRUE);

-- ROUNDS: everyone reads; only admin writes
CREATE POLICY "rounds_read_all" ON public.rounds
  FOR SELECT USING (TRUE);

CREATE POLICY "rounds_admin_write" ON public.rounds
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin');

-- ROUND RESULTS: staff write; public read
CREATE POLICY "round_results_staff_write" ON public.round_results
  FOR ALL TO authenticated
  USING (public.get_my_role() IN ('admin', 'team'));

CREATE POLICY "round_results_public_read" ON public.round_results
  FOR SELECT TO anon
  USING (TRUE);

-- EVENT STATE: everyone reads; admin writes
CREATE POLICY "event_state_read_all" ON public.event_state
  FOR SELECT USING (TRUE);

CREATE POLICY "event_state_admin_write" ON public.event_state
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin');

-- AUDIT LOGS: only admin reads; service role inserts
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

-- ============================================================
-- RPC: Save Round Result (atomic transaction)
-- ============================================================
CREATE OR REPLACE FUNCTION public.save_round_result(
  p_qr_id TEXT,
  p_result round_result_enum,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant RECORD;
  v_current_round RECORD;
  v_existing_result RECORD;
  v_elimination_round RECORD;
BEGIN
  -- 1. Fetch participant
  SELECT * INTO v_participant
  FROM public.participants
  WHERE assigned_qr = p_qr_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PARTICIPANT_NOT_FOUND', 'message', 'QR code not found');
  END IF;

  IF NOT v_participant.registered THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_REGISTERED', 'message', 'Participant not yet registered');
  END IF;

  -- 2. Check if already eliminated
  IF v_participant.current_status = 'eliminated' THEN
    SELECT r.round_name INTO v_elimination_round
    FROM public.round_results rr
    JOIN public.rounds r ON r.round_id = rr.round_id
    WHERE rr.participant_id = v_participant.participant_id
      AND rr.result = 'eliminated'
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_ELIMINATED',
      'message', 'Participant was eliminated in ' || COALESCE(v_elimination_round.round_name, 'a previous round')
    );
  END IF;

  -- 3. Fetch current active round
  SELECT r.* INTO v_current_round
  FROM public.event_state es
  JOIN public.rounds r ON r.round_id = es.current_round_id
  WHERE es.id = 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_ACTIVE_ROUND', 'message', 'No active round set by admin');
  END IF;

  -- 4. Check duplicate result for this round
  SELECT * INTO v_existing_result
  FROM public.round_results
  WHERE participant_id = v_participant.participant_id
    AND round_id = v_current_round.round_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_RESULT', 'message', 'Result already recorded for this round');
  END IF;

  -- 5. Insert round result
  INSERT INTO public.round_results (participant_id, round_id, result, recorded_by)
  VALUES (v_participant.participant_id, v_current_round.round_id, p_result, p_actor_id);

  -- 6. If eliminated, lock participant
  IF p_result = 'eliminated' THEN
    UPDATE public.participants
    SET current_status = 'eliminated'
    WHERE participant_id = v_participant.participant_id;
  END IF;

  -- 7. Insert audit log
  INSERT INTO public.audit_logs (actor_id, action, participant_id, round_id, details)
  VALUES (
    p_actor_id,
    'round_result',
    v_participant.participant_id,
    v_current_round.round_id,
    jsonb_build_object('result', p_result, 'qr_id', p_qr_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'participant', jsonb_build_object(
      'name', v_participant.name,
      'roll_no', v_participant.roll_no,
      'assigned_qr', v_participant.assigned_qr,
      'current_status', CASE WHEN p_result = 'eliminated' THEN 'eliminated' ELSE v_participant.current_status END
    ),
    'round', v_current_round.round_name,
    'result', p_result
  );
END;
$$;

-- ============================================================
-- RPC: Register Participant
-- ============================================================
CREATE OR REPLACE FUNCTION public.register_participant(
  p_qr_id TEXT,
  p_roll_no TEXT,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant RECORD;
BEGIN
  -- Find participant by roll_no
  SELECT * INTO v_participant
  FROM public.participants
  WHERE roll_no = UPPER(TRIM(p_roll_no));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ROLL_NOT_FOUND', 'message', 'Roll number not found in system');
  END IF;

  -- Check already registered
  IF v_participant.registered THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_REGISTERED', 'message', 'Participant already registered');
  END IF;

  -- Check QR not already taken
  IF EXISTS (SELECT 1 FROM public.participants WHERE assigned_qr = p_qr_id AND participant_id != v_participant.participant_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR_TAKEN', 'message', 'This QR code is already assigned to another participant');
  END IF;

  -- Register
  UPDATE public.participants
  SET
    assigned_qr = p_qr_id,
    registered = TRUE,
    current_status = 'active',
    registered_at = NOW(),
    registered_by = p_actor_id
  WHERE participant_id = v_participant.participant_id;

  -- Audit
  INSERT INTO public.audit_logs (actor_id, action, participant_id, details)
  VALUES (
    p_actor_id,
    'registration',
    v_participant.participant_id,
    jsonb_build_object('qr_id', p_qr_id, 'roll_no', p_roll_no)
  );

  RETURN jsonb_build_object(
    'success', true,
    'participant', jsonb_build_object(
      'name', v_participant.name,
      'roll_no', v_participant.roll_no,
      'assigned_qr', p_qr_id
    )
  );
END;
$$;
