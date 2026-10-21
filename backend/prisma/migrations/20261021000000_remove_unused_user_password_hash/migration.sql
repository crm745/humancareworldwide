-- Patients authenticate via OTP only; `users.password_hash` was never written by
-- any current code path and only held leftover values from old test/dev rows.
ALTER TABLE `users` DROP COLUMN `password_hash`;
