-- Emails are now verified by OTP at sign-up (and on change), so Google/Apple sign-in
-- can't attach itself to an account someone else registered with that address.
-- Existing rows start unverified.
ALTER TABLE `users` ADD COLUMN `email_verified_at` DATETIME(3) NULL;
