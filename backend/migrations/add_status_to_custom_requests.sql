-- Add status field to custom_requests table
ALTER TABLE custom_requests
  ADD COLUMN IF NOT EXISTS status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending'
  AFTER additional_requests;