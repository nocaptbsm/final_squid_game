-- ============================================================
-- Seed: Create admin user
-- ============================================================
-- Run this AFTER creating a user via Supabase Auth dashboard
-- Replace the UUID below with the actual auth user's ID

-- Example: after creating admin@paradox26.in in Supabase Auth:
-- INSERT INTO public.users (id, username, role)
-- VALUES ('auth-user-uuid-here', 'admin', 'admin');

-- Example: create team members
-- INSERT INTO public.users (id, username, role)
-- VALUES ('team-user-uuid-1', 'Team-1', 'team');
-- INSERT INTO public.users (id, username, role)
-- VALUES ('team-user-uuid-2', 'Team-2', 'team');
-- INSERT INTO public.users (id, username, role)
-- VALUES ('team-user-uuid-3', 'Team-3', 'team');

-- ============================================================
-- Quick verify queries
-- ============================================================
-- SELECT * FROM public.rounds ORDER BY round_order;
-- SELECT * FROM public.event_state;
-- SELECT COUNT(*) FROM public.participants;
