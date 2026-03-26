-- Add reason field to intents for SPEC-033 (failed intent reason)
ALTER TABLE intents ADD COLUMN reason TEXT;
