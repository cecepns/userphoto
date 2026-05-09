-- Migration: Add piring and nama_pasangan to surat_jalan
-- Created: 2026-04-07
-- Description: Add new fields for piring and nama pasangan in surat jalan

ALTER TABLE surat_jalan
ADD COLUMN IF NOT EXISTS piring TEXT AFTER ukuran_tenda;

ALTER TABLE surat_jalan
ADD COLUMN IF NOT EXISTS nama_pasangan TEXT AFTER piring;
