-- Run once on an existing City College Quiz database.
ALTER TABLE admins ADD COLUMN profile_photo VARCHAR(255) NULL;
ALTER TABLE teams ADD COLUMN profile_photo VARCHAR(255) NULL;
