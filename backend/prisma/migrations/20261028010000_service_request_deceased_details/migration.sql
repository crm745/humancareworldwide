-- Mortal Remains requests: the requester's relation to the deceased, and where and when
-- the death happened. The deceased's own name stays in `patient_name`.
ALTER TABLE `service_requests` ADD COLUMN `deceased_relation` VARCHAR(191) NULL,
    ADD COLUMN `place_of_death` VARCHAR(191) NULL,
    ADD COLUMN `date_of_death` DATETIME(3) NULL;
