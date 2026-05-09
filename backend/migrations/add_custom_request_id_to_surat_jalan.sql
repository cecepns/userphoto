-- Migration: surat_jalan.custom_request_id (pesanan custom di surat jalan)
-- Description: Kolom opsional mengacu ke custom_requests; order_id NULL untuk pesanan custom.
-- Requires: tabel surat_jalan, custom_requests sudah ada.

ALTER TABLE surat_jalan
  ADD COLUMN IF NOT EXISTS custom_request_id INT NULL
  AFTER order_id;

CREATE INDEX idx_surat_jalan_custom_request_id ON surat_jalan(custom_request_id);
