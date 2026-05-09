-- Migration: simpan nama vendor custom per event vendor calendar
-- Description: override nama vendor untuk order/custom_request pada tanggal acara tertentu.

CREATE TABLE IF NOT EXISTS vendor_calendar_overrides (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_type ENUM('order', 'custom_request') NOT NULL,
  source_id INT NOT NULL,
  vendor_key VARCHAR(100) NOT NULL,
  wedding_date DATE NOT NULL,
  custom_vendor_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vendor_calendar_override (event_type, source_id, vendor_key, wedding_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
