-- Add reason column to intents table — PostgreSQL
ALTER TABLE intents ADD COLUMN IF NOT EXISTS reason TEXT;
