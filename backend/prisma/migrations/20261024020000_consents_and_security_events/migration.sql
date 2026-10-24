-- Proof of what each patient agreed to at sign-up, and an audit trail of account
-- security events (sign-ups, logins, failures, lockouts, password/contact changes).
CREATE TABLE `user_consents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `accepted` BOOLEAN NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `accepted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_consents_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `security_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `event` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(255) NULL,
    `detail` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `security_events_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `security_events_event_created_at_idx`(`event`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_consents` ADD CONSTRAINT `user_consents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
