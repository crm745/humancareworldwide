-- Patient/case location was only ever free-text origin/destination (no structured
-- country), which is why the corporate-portal's Patients list could never show a
-- real Country value. Adding it so new requests/cases capture it going forward.
ALTER TABLE `service_requests` ADD COLUMN `country` VARCHAR(191) NULL;
ALTER TABLE `cases` ADD COLUMN `country` VARCHAR(191) NULL;
