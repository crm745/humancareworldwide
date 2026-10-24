-- Patients move from OTP-only login to password + OTP. `password_hash` comes back
-- (it was dropped as unused in 20261021000000), nullable because every existing
-- patient was created without one; the login flow makes them set it.
ALTER TABLE `users` ADD COLUMN `failed_login_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `is_verified` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `locked_until` DATETIME(3) NULL,
    ADD COLUMN `password_hash` VARCHAR(191) NULL,
    ADD COLUMN `token_version` INTEGER NOT NULL DEFAULT 0;

-- Mobiles were stored as the bare national number with the calling code in
-- `country_code`. Rewrite them to E.164 ("+919876543210") so lookups are exact.
-- Leading zeros are trunk prefixes for the countries this app has users in.
UPDATE `users` SET `mobile` = NULL WHERE `mobile` = '';
UPDATE `users`
SET `mobile` = CONCAT(`country_code`, TRIM(LEADING '0' FROM REGEXP_REPLACE(`mobile`, '[^0-9]', '')))
WHERE `mobile` IS NOT NULL AND `mobile` NOT LIKE '+%';
