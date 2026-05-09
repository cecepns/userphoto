-- Migration: link Google Maps + QR di surat jalan
-- Teks panjang (short URL / maps.app.goo.gl) disimpan penuh.

ALTER TABLE surat_jalan
  ADD COLUMN maps_link TEXT NULL;
