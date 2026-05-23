ALTER TABLE orders ADD COLUMN bride_name VARCHAR(255) NULL;
ALTER TABLE orders ADD COLUMN groom_name VARCHAR(255) NULL;
ALTER TABLE orders ADD COLUMN reference_source VARCHAR(100) NULL;
ALTER TABLE orders ADD COLUMN vendor_id INT NULL;

ALTER TABLE custom_requests ADD COLUMN bride_name VARCHAR(255) NULL;
ALTER TABLE custom_requests ADD COLUMN groom_name VARCHAR(255) NULL;
ALTER TABLE custom_requests ADD COLUMN reference_source VARCHAR(100) NULL;
ALTER TABLE custom_requests ADD COLUMN vendor_id INT NULL;

CREATE TABLE IF NOT EXISTS vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_vendors_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS financial_settings (
  id INT PRIMARY KEY DEFAULT 1,
  accommodation_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO financial_settings (id, accommodation_cost) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS order_financials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_source ENUM('order','custom_request') NOT NULL,
  order_id INT NOT NULL,
  accommodation_applied TINYINT(1) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_order_financial (order_source, order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS production_cost_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_financial_id INT NOT NULL,
  label VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_prod_cost_financial (order_financial_id),
  CONSTRAINT fk_prod_cost_financial FOREIGN KEY (order_financial_id) REFERENCES order_financials(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_source ENUM('order','custom_request') NOT NULL,
  order_id INT NOT NULL,
  photo_status ENUM('photo_progress','editing','draft_album','printing','shipping','completed') NOT NULL DEFAULT 'photo_progress',
  video_status ENUM('video_progress','processing','revision','completed') NOT NULL DEFAULT 'video_progress',
  photo_link TEXT,
  video_link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_order_progress (order_source, order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS detail_acara (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_source ENUM('order','custom_request') NULL,
  order_id INT NULL,
  client_name VARCHAR(255),
  client_phone VARCHAR(50),
  client_address TEXT,
  bride_name VARCHAR(255),
  groom_name VARCHAR(255),
  wedding_date DATE,
  package_name VARCHAR(255),
  map1_url TEXT,
  map1_note TEXT,
  map2_url TEXT,
  map2_note TEXT,
  map3_url TEXT,
  map3_note TEXT,
  map4_url TEXT,
  map4_note TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_detail_acara (order_source, order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS freelancers_inhouse (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  photo_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  video_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_freelancers_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
