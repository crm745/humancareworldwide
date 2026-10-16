-- AlterTable
ALTER TABLE `service_requests` ADD COLUMN `bitrix_last_error` TEXT NULL,
    ADD COLUMN `bitrix_sync_attempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `bitrix_sync_failed_at` DATETIME(3) NULL;

