-- AlterTable
ALTER TABLE `cases` ADD COLUMN `billing_amount` DECIMAL(10, 2) NULL,
    ADD COLUMN `billing_currency` VARCHAR(191) NULL,
    ADD COLUMN `billing_invoiced_at` DATETIME(3) NULL,
    ADD COLUMN `billing_notes` TEXT NULL,
    ADD COLUMN `billing_paid_at` DATETIME(3) NULL,
    ADD COLUMN `billing_status` VARCHAR(191) NOT NULL DEFAULT 'pending';

