-- CreateTable
CREATE TABLE `corporate_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `corporate_id` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `file_url` VARCHAR(191) NOT NULL,
    `file_size_bytes` INTEGER NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `corporate_documents_corporate_id_idx`(`corporate_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `corporate_documents` ADD CONSTRAINT `corporate_documents_corporate_id_fkey` FOREIGN KEY (`corporate_id`) REFERENCES `corporates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

