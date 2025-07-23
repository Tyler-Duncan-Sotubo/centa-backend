ALTER TABLE "job_postings"
  ALTER COLUMN "salary_range_from" SET DATA TYPE integer USING "salary_range_from"::integer,
  ALTER COLUMN "salary_range_to" SET DATA TYPE integer USING "salary_range_to"::integer;
