CREATE TABLE IF NOT EXISTS album_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_source ENUM('order','custom_request') NOT NULL,
  order_id INT NOT NULL,
  status ENUM('pending','diproses','selesai') NOT NULL DEFAULT 'pending',
  estimated_completion DATE NULL,
  album_link VARCHAR(2048) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_album_progress_order (order_source, order_id),
  KEY idx_album_progress_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
