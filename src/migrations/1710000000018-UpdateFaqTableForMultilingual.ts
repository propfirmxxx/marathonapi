import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateFaqTableForMultilingual1710000000018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if faqs table exists
    await queryRunner.query(`
      DO $$ 
      DECLARE
        question_col_type text;
        answer_col_type text;
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'faqs'
        ) THEN
          -- Check if columns already exist as jsonb (migration already run)
          SELECT data_type INTO question_col_type
          FROM information_schema.columns 
          WHERE table_name = 'faqs' AND column_name = 'question';
          
          IF question_col_type = 'jsonb' THEN
            RAISE NOTICE 'Migration already applied, skipping...';
            RETURN;
          END IF;

          -- First, handle NULL values in existing columns by setting default empty strings
          UPDATE faqs 
          SET 
            question = COALESCE(question, ''),
            answer = COALESCE(answer, '')
          WHERE question IS NULL OR answer IS NULL OR question = '' OR answer = '';

          -- Add temporary columns for the new JSON structure
          ALTER TABLE faqs 
          ADD COLUMN IF NOT EXISTS question_temp jsonb,
          ADD COLUMN IF NOT EXISTS answer_temp jsonb;

          -- Migrate existing data to the new structure
          -- All values are now guaranteed to be non-null strings
          UPDATE faqs 
          SET 
            question_temp = jsonb_build_object('en', COALESCE(question, '')),
            answer_temp = jsonb_build_object('en', COALESCE(answer, ''));

          -- Ensure all rows have values (handle any edge cases)
          UPDATE faqs 
          SET 
            question_temp = COALESCE(question_temp, jsonb_build_object('en', '')),
            answer_temp = COALESCE(answer_temp, jsonb_build_object('en', ''))
          WHERE question_temp IS NULL OR answer_temp IS NULL;

          -- Drop NOT NULL constraint from old columns before dropping them
          ALTER TABLE faqs 
          ALTER COLUMN question DROP NOT NULL,
          ALTER COLUMN answer DROP NOT NULL;

          -- Drop old columns
          ALTER TABLE faqs 
          DROP COLUMN IF EXISTS question,
          DROP COLUMN IF EXISTS answer;

          -- Rename temp columns to the original names
          ALTER TABLE faqs 
          RENAME COLUMN question_temp TO question;
          
          ALTER TABLE faqs 
          RENAME COLUMN answer_temp TO answer;

          -- Set NOT NULL constraint (now safe since all rows have values)
          ALTER TABLE faqs 
          ALTER COLUMN question SET NOT NULL,
          ALTER COLUMN answer SET NOT NULL;

          -- Set default values for future inserts
          ALTER TABLE faqs 
          ALTER COLUMN question SET DEFAULT '{"en": ""}'::jsonb,
          ALTER COLUMN answer SET DEFAULT '{"en": ""}'::jsonb;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'faqs'
        ) THEN
          -- Add temporary text columns
          ALTER TABLE faqs 
          ADD COLUMN IF NOT EXISTS question_temp VARCHAR(255),
          ADD COLUMN IF NOT EXISTS answer_temp TEXT;

          -- Migrate JSON data back to text (extracting English translation)
          UPDATE faqs 
          SET 
            question_temp = question->>'en',
            answer_temp = answer->>'en'
          WHERE question_temp IS NULL AND answer_temp IS NULL;

          -- Drop JSON columns
          ALTER TABLE faqs 
          DROP COLUMN IF EXISTS question,
          DROP COLUMN IF EXISTS answer;

          -- Rename temp columns back to original names
          ALTER TABLE faqs 
          RENAME COLUMN question_temp TO question;
          
          ALTER TABLE faqs 
          RENAME COLUMN answer_temp TO answer;

          -- Set NOT NULL constraint
          ALTER TABLE faqs 
          ALTER COLUMN question SET NOT NULL,
          ALTER COLUMN answer SET NOT NULL;
        END IF;
      END $$;
    `);
  }
}

