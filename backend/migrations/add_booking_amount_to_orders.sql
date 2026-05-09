-- Migration: Add booking_amount field to orders table
-- Date: 2024-01-XX

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS booking_amount DECIMAL(10,2) DEFAULT 2000000 AFTER total_amount;