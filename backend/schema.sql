-- Wedding Organizer Database Schema

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Content sections table for dynamic content management
CREATE TABLE IF NOT EXISTS content_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_name VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255),
  subtitle VARCHAR(500),
  description TEXT,
  image_url VARCHAR(500),
  button_text VARCHAR(100),
  button_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Service features table for dynamic service features
CREATE TABLE IF NOT EXISTS service_features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Service cards table for dynamic cards (service cards, about cards, etc.)
CREATE TABLE IF NOT EXISTS service_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  image_url VARCHAR(500),
  button_text VARCHAR(100),
  button_url VARCHAR(255),
  card_type ENUM('service', 'about', 'feature') DEFAULT 'service',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Items table (master items that can be used across services)
CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  image VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Service items relationship table (many-to-many)
CREATE TABLE IF NOT EXISTS service_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  item_id INT NOT NULL,
  custom_price DECIMAL(10,2),
  is_required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  UNIQUE KEY unique_service_item (service_id, item_id)
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_number VARCHAR(255),
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  wedding_date DATE,
  notes TEXT,
  service_id INT,
  service_name VARCHAR(255),
  selected_items JSON,
  total_amount DECIMAL(10,2) NOT NULL,
  booking_amount DECIMAL(10,2) DEFAULT 2000000,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);

-- Custom requests table
CREATE TABLE IF NOT EXISTS custom_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  wedding_date DATE,
  booking_amount DECIMAL(10,2) DEFAULT 300000,
  services TEXT,
  additional_requests TEXT,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  image VARCHAR(500),
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  instagram VARCHAR(255),
  consultation_date DATE,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Surat Jalan (Delivery Orders) table
CREATE TABLE IF NOT EXISTS surat_jalan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT,
  custom_request_id INT NULL,
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
  maps_link TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (custom_request_id) REFERENCES custom_requests(id) ON DELETE SET NULL,
  INDEX idx_surat_jalan_order_id (order_id),
  INDEX idx_surat_jalan_custom_request_id (custom_request_id),
  INDEX idx_surat_jalan_created_at (created_at)
);

-- Gallery categories table
CREATE TABLE IF NOT EXISTS gallery_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Gallery images table
CREATE TABLE IF NOT EXISTS gallery_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500) NOT NULL,
  category_id INT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES gallery_categories(id) ON DELETE SET NULL
);

-- Insert sample data

-- Sample content sections
INSERT IGNORE INTO content_sections (id, section_name, title, subtitle, description, image_url, button_text, button_url, sort_order) VALUES 
(1, 'hero_section', 'Hari', 'Pernikahan', 'Buatlah Kesan Indah di Moment Pernikahanmu, dan Abadikan Setiap Moment di Hari Bahagia Mu, Libatkan Kami Untuk Mengatur Acara Bahagiamu.', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800', 'Konsultasi Gratis', '/contact', 1),
(2, 'services_preview_section', 'Pilihan Layanan Pernikahan', 'WEDDING PACKAGE | DEKORASI | MUA | DOKUMENTASI | STUDIO | ENTERTAINMENT | SOUNDSYSTEM | MC | RPOSESI ADAT | CREW WO', '', '', '', '', 2),
(3, 'services_hero_section', 'Wedding Package', '', 'Dari upacara intim hingga perayaan megah, kami menawarkan paket pernikahan komprehensif yang disesuaikan untuk membuat hari spesial Anda sempurna.', '', 'Konsultasi Gratis', '/contact', 3),
(4, 'custom_service_section', 'Layanan Pernikahan Kustom', 'Buat Sesuai Kebutuhan Anda', 'Buat layanan pernikahan yang sesuai dengan kebutuhan dan budget Anda. Pilih layanan yang Anda inginkan dan kami akan menyesuaikan dengan preferensi Anda untuk menciptakan pernikahan impian yang sempurna.', '', 'Mulai Sekarang', '/custom-service', 4),
(5, 'gallery_hero_section', 'Galeri Pernikahan', '', 'Jelajahi koleksi pernikahan indah kami dan dapatkan inspirasi untuk hari spesial Anda.', '', 'Lihat Galeri', '/gallery', 5),
(6, 'about_hero_section', 'Tentang User Wedding', '', 'Kami bersemangat menciptakan momen magis dan mewujudkan impian pernikahan Anda menjadi kenyataan. Dengan pengalaman bertahun-tahun dan perhatian pada detail, kami memastikan hari spesial Anda sempurna.', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800', '', '', 6),
(7, 'about_mission_section', 'Misi Kami', '', 'Menciptakan pengalaman pernikahan luar biasa yang melampaui ekspektasi dan menciptakan kenangan abadi. Kami percaya setiap pasangan layak mendapat perayaan yang unik seperti kisah cinta mereka.', '', '', '', 7),
(8, 'about_cta_section', 'Siap Mulai Merencanakan?', '', 'Mari ciptakan pernikahan impian Anda bersama. Hubungi kami untuk konsultasi gratis.', '', 'Mulai Hari Ini', '/contact', 8),
(9, 'home_cta_section', 'Siap Merencanakan Pernikahan Impian Anda?', '', 'Mari mulai menciptakan hari sempurna yang selalu Anda impikan. Hubungi kami untuk konsultasi gratis.', '', 'Booking Konsultasi', '/contact', 9),
(10, 'contact_hero_section', 'Hubungi Kami', '', 'Siap merencanakan pernikahan impian Anda? Hubungi kami untuk konsultasi gratis.', '', '', '', 10);

-- Sample service features
INSERT IGNORE INTO service_features (id, title, description, icon, sort_order) VALUES 
(1, 'Perencanaan profesional', 'Tim perencana berpengalaman yang akan mengatur setiap detail pernikahan Anda', '📋', 1),
(2, 'Tim berpengalaman', 'Tim ahli dengan pengalaman bertahun-tahun dalam industri pernikahan', '👥', 2),
(3, 'Kualitas terjamin', 'Komitmen kami untuk memberikan layanan berkualitas tinggi', '⭐', 3),
(4, 'Pelayanan 24/7', 'Dukungan penuh selama proses perencanaan hingga hari pernikahan', '🕐', 4),
(5, 'Garansi kepuasan', 'Jaminan kepuasan 100% untuk setiap layanan yang kami berikan', '✅', 5);

-- Sample service cards (service type)
INSERT IGNORE INTO service_cards (id, title, description, icon, button_text, button_url, card_type, sort_order) VALUES 
(1, 'Wedding Package', 'Pilih dari berbagai paket pernikahan yang sudah kami siapkan dengan harga terjangkau dan layanan lengkap', '💒', 'Lihat Paket →', '/services', 'service', 1),
(2, 'Custom Service', 'Buat layanan pernikahan sesuai dengan visi dan kebutuhan unik Anda dengan konsultasi langsung', '✨', 'Buat Custom →', '/custom-service', 'service', 2);

-- Sample about cards (about type)
INSERT IGNORE INTO service_cards (id, title, description, icon, button_text, button_url, card_type, sort_order) VALUES 
(3, 'Layanan Personal', 'Setiap pernikahan unik, dan kami menyesuaikan layanan kami dengan visi dan preferensi Anda.', '💖', '', '', 'about', 1),
(4, 'Perhatian pada Detail', 'Dari dekorasi terkecil hingga gestur terbesar, kami memastikan kesempurnaan dalam setiap elemen.', '✨', '', '', 'about', 2),
(5, 'Perencanaan Bebas Stres', 'Kami menangani semua logistik sehingga Anda bisa fokus menikmati masa tunangan dan hari spesial.', '🎯', '', '', 'about', 3);

-- Sample items
INSERT IGNORE INTO items (id, name, description, price, category) VALUES 
(1, 'Venue Decoration', 'Complete venue setup with floral arrangements and lighting', 5000, 'Decoration'),
(2, 'Wedding Coordination', 'Professional wedding coordinator for the entire day', 3000, 'Coordination'),
(3, 'Photography Package', 'Professional photographer for ceremony and reception', 4000, 'Photography'),
(4, 'Catering Service', 'Complete dining experience for all guests', 8000, 'Catering'),
(5, 'Entertainment', 'Live music and DJ services', 2500, 'Entertainment'),
(6, 'Intimate Venue Setup', 'Cozy decoration perfect for small gatherings', 2500, 'Decoration'),
(7, 'Mini Photography', 'Professional photos for intimate ceremonies', 2000, 'Photography'),
(8, 'Small Catering', 'Gourmet catering for small groups', 4000, 'Catering'),
(9, 'Luxury Decoration', 'Premium floral arrangements and exclusive setup', 15000, 'Decoration'),
(10, 'Premium Photography', 'Award-winning photographers and videographers', 10000, 'Photography'),
(11, 'Gourmet Catering', 'Multi-course dining with premium ingredients', 20000, 'Catering'),
(12, 'Luxury Transportation', 'Premium vehicle arrangements for the couple', 3000, 'Transportation');

-- Sample services
INSERT IGNORE INTO services (id, name, description, base_price, image) VALUES 
(1, 'Complete Wedding Package', 'Full wedding planning service including venue, decoration, catering, and coordination', 25000, 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800'),
(2, 'Intimate Wedding Package', 'Perfect for small gatherings with personalized touches and elegant decoration', 12000, 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800'),
(3, 'Luxury Wedding Package', 'Premium service with exclusive venues, high-end decoration, and professional coordination', 50000, 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=800');

-- Sample service-item relationships
INSERT IGNORE INTO service_items (service_id, item_id, custom_price, is_required, sort_order) VALUES 
(1, 1, NULL, true, 1),
(1, 2, NULL, true, 2),
(1, 3, NULL, true, 3),
(1, 4, NULL, true, 4),
(1, 5, NULL, false, 5),
(2, 6, NULL, true, 1),
(2, 7, NULL, true, 2),
(2, 8, NULL, true, 3),
(3, 9, NULL, true, 1),
(3, 10, NULL, true, 2),
(3, 11, NULL, true, 3),
(3, 12, NULL, false, 4);

-- Sample payment methods
INSERT IGNORE INTO payment_methods (type, name, account_number, details) VALUES 
('bank', 'Bank Central Asia (BCA)', '1234567890', 'Account name: WeddingBliss Indonesia'),
('bank', 'Bank Mandiri', '0987654321', 'Account name: WeddingBliss Indonesia'),
('qris', 'QRIS', '', 'Scan QRIS untuk pembayaran cepat dan aman'),
('ewallet', 'GoPay', '', 'Pembayaran melalui GoPay'),
('ewallet', 'OVO', '', 'Pembayaran melalui OVO'),
('ewallet', 'DANA', '', 'Pembayaran melalui DANA');

-- Sample articles
INSERT IGNORE INTO articles (title, content, excerpt, image, category) VALUES 
('Tips Memilih Venue Pernikahan', 'Artikel lengkap tentang cara memilih venue pernikahan yang tepat...', 'Panduan lengkap memilih venue pernikahan sesuai budget dan kebutuhan', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800', 'Tips'),
('Dekorasi Pernikahan Minimalis', 'Inspirasi dekorasi pernikahan dengan tema minimalis modern...', 'Ide dekorasi pernikahan minimalis yang elegan dan terjangkau', 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800', 'Dekorasi'),
('Fotografi Pernikahan Terbaik', 'Tips memilih fotografer pernikahan dan paket fotografi...', 'Panduan memilih fotografer dan paket fotografi pernikahan', 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=800', 'Fotografi');

-- Sample gallery categories
INSERT IGNORE INTO gallery_categories (name, description, sort_order) VALUES 
('Dekorasi', 'Koleksi dekorasi pernikahan indah', 1),
('Fotografi', 'Hasil fotografi pernikahan profesional', 2),
('Venue', 'Pilihan venue pernikahan eksklusif', 3),
('Catering', 'Hidangan pernikahan lezat', 4);

-- Sample gallery images
INSERT IGNORE INTO gallery_images (title, description, image_url, category_id, is_featured, sort_order) VALUES 
('Dekorasi Outdoor', 'Dekorasi pernikahan outdoor yang romantis', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800', 1, true, 1),
('Fotografi Prewedding', 'Sesi fotografi prewedding di alam', 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800', 2, true, 1),
('Venue Indoor', 'Venue pernikahan indoor yang elegan', 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=800', 3, false, 1),
('Hidangan Utama', 'Hidangan utama pernikahan yang lezat', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800', 4, false, 1); 