-- `cases.attending_physician/case_coordinator/hospital_facility/hospital_contact` were
-- never written by any create/update path (no "edit case details" endpoint sets them)
-- and never read anywhere in the backend, admin-portal or mobile app.
ALTER TABLE `cases`
  DROP COLUMN `attending_physician`,
  DROP COLUMN `case_coordinator`,
  DROP COLUMN `hospital_facility`,
  DROP COLUMN `hospital_contact`;

-- `corporate_users.role` was always hardcoded to 'viewer' on create (the admin-portal's
-- "Add Login" form never sends a role) and never checked anywhere for authorization —
-- vendor/corporate accounts are confirmed single-role, so the field was functionally inert.
ALTER TABLE `corporate_users` DROP COLUMN `role`;
