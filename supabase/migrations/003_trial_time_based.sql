-- Time-based trial: remaining time = TRIAL_SECONDS_LIMIT - (now - trial_started_at).
-- No reset on refresh/login/device change. Set TRIAL_MINUTES in Edge Function secrets.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.profiles.trial_started_at IS 'When the free trial started (first use). Remaining = limit - (now - trial_started_at).';
