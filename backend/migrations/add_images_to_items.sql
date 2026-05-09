-- Add images column to items (JSON array of filenames)
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS images TEXT NULL COMMENT 'JSON array of uploaded image filenames';
