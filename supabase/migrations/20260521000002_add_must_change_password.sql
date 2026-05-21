-- Add must_change_password flag to profiles table
-- Used to force new users (or users after admin password reset) to change their password on first login

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- When an admin creates a new user, set this flag via admin-user-management edge function
-- When user changes password, clear this flag
