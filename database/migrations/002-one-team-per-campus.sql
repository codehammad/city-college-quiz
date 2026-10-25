-- Run once on an existing database after confirming each campus has at most one team.
ALTER TABLE teams ADD UNIQUE KEY uq_one_team_per_campus (campus_id);
ALTER TABLE teams DROP INDEX uq_team_campus_name;
