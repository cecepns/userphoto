-- Migration: Add surat_jalan table
-- Created: 2026-01-19
-- Description: Create table for delivery orders (surat jalan) with reference to orders

CREATE TABLE IF NOT EXISTS surat_jalan (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT,
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  client_address TEXT,
  wedding_date DATE,
  package_name VARCHAR(255),
  plaminan_image TEXT,
  pintu_masuk_image TEXT,
  dekorasi_image TEXT,
  warna_kain TEXT,
  ukuran_tenda TEXT,
  vendor_name VARCHAR(255) DEFAULT 'User Wedding Organizer',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Create index on order_id for faster lookups
CREATE INDEX idx_surat_jalan_order_id ON surat_jalan(order_id);

-- Create index on created_at for sorting
CREATE INDEX idx_surat_jalan_created_at ON surat_jalan(created_at);
