-- CreateTable
CREATE TABLE `corporate_registrations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `corporate_ref_id` VARCHAR(191) NOT NULL,
    `company` JSON NOT NULL,
    `bank` JSON NOT NULL,
    `documents` JSON NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `email_verify_token` VARCHAR(191) NULL,
    `email_verify_expires_at` DATETIME(3) NULL,
    `approved` BOOLEAN NOT NULL DEFAULT false,
    `approved_by` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `rejected_at` DATETIME(3) NULL,
    `rejection_reason` TEXT NULL,
    `credentials_created` BOOLEAN NOT NULL DEFAULT false,
    `corporate_id` INTEGER NULL,
    `corporate_user_id` INTEGER NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `corporate_registrations_corporate_ref_id_key`(`corporate_ref_id`),
    UNIQUE INDEX `corporate_registrations_email_verify_token_key`(`email_verify_token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

