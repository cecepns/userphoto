CREATE TABLE IF NOT EXISTS freelance_photographer_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_source ENUM('order','custom_request') NOT NULL,
  order_id INT NOT NULL,
  photographer_name VARCHAR(255) NOT NULL,
  duty_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_freelance_duty_date (duty_date),
  KEY idx_freelance_order (order_source, order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
