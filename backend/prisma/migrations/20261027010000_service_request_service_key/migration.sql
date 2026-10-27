-- The app's own id for the chosen service; used to fill Bitrix's "Required Service".
ALTER TABLE `service_requests` ADD COLUMN `service_key` VARCHAR(191) NULL;
