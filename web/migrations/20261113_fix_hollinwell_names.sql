-- Data correction (client item B03 "Club, Course"): ENG-00169 has club and
-- course swapped in the England master workbook. The club is Notts Golf Club;
-- its course is known as Hollinwell. Changes this one row only, and only while
-- it is still swapped, so reruns are no-ops. Correct the workbook as well, or
-- a later master import could reintroduce the swap.
BEGIN;
UPDATE courses
   SET club_name = 'Notts Golf Club', name = 'Hollinwell'
 WHERE hl_course_id = 'ENG-00169'
   AND club_name = 'Hollinwell'
   AND name = 'Notts Golf Club';
INSERT INTO app_schema_migrations(version) VALUES('20261113_fix_hollinwell_names') ON CONFLICT DO NOTHING;
COMMIT;
