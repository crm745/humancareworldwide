-- `cases.aircraft` was read by the mobile tracking screen but no backend endpoint ever
-- wrote it, so it was always null and the UI row could never render. Decided not to
-- build out the write path — removing the dead field instead.
ALTER TABLE `cases` DROP COLUMN `aircraft`;
