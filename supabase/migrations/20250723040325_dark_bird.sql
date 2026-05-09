-- Wedding Organizer Database Schema for MySQL

-- Admins table for authentication
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services table (main wedding services)
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) DEFAULT 0,
    image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service items table (sub-items for each service with individual pricing)
CREATE TABLE IF NOT EXISTS service_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Payment methods table (bank accounts, QRIS, etc.)
CREATE TABLE IF NOT EXISTS payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'bank', 'qris', 'ewallet'
    name VARCHAR(255) NOT NULL, -- Bank name or payment method name
    account_number VARCHAR(255),
    details TEXT, -- Additional details like QR code image, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table (customer bookings)
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    wedding_date DATE NOT NULL,
    service_id INT NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    selected_items TEXT, -- JSON string of selected items
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id)
);

-- Custom service requests table
CREATE TABLE IF NOT EXISTS custom_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    wedding_date DATE NOT NULL,
    guest_count INT,
    budget VARCHAR(50),
    services TEXT, -- Comma-separated list of requested services
    additional_requests TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'quoted', 'closed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Articles table for blog/tips
CREATE TABLE IF NOT EXISTS articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    image VARCHAR(500),
    category VARCHAR(100),
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data

-- Sample services
INSERT IGNORE INTO services (id, name, description, base_price, image) VALUES 
(1, 'Complete Wedding Package', 'Full wedding planning service including venue, decoration, catering, and coordination', 25000, 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800'),
(2, 'Intimate Wedding Package', 'Perfect for small gatherings with personalized touches and elegant decoration', 12000, 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800'),
(3, 'Luxury Wedding Package', 'Premium service with exclusive venues, high-end decoration, and professional coordination', 50000, 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=800');

-- Sample service items
INSERT IGNORE INTO service_items (service_id, name, description, price) VALUES 
(1, 'Venue Decoration', 'Complete venue setup with floral arrangements and lighting', 5000),
(1, 'Wedding Coordination', 'Professional wedding coordinator for the entire day', 3000),
(1, 'Photography Package', 'Professional photographer for ceremony and reception', 4000),
(1, 'Catering Service', 'Complete dining experience for all guests', 8000),
(1, 'Entertainment', 'Live music and DJ services', 2500),
(2, 'Intimate Venue Setup', 'Cozy decoration perfect for small gatherings', 2500),
(2, 'Mini Photography', 'Professional photos for intimate ceremonies', 2000),
(2, 'Small Catering', 'Gourmet catering for small groups', 4000),
(3, 'Luxury Decoration', 'Premium floral arrangements and exclusive setup', 15000),
(3, 'Premium Photography', 'Award-winning photographers and videographers', 10000),
(3, 'Gourmet Catering', 'Multi-course dining with premium ingredients', 20000),
(3, 'Luxury Transportation', 'Premium vehicle arrangements for the couple', 3000);

-- Sample payment methods
INSERT IGNORE INTO payment_methods (type, name, account_number, details) VALUES 
('bank', 'Bank Central Asia (BCA)', '1234567890', 'Account name: WeddingBliss Indonesia'),
('bank', 'Bank Mandiri', '9876543210', 'Account name: WeddingBliss Indonesia'),
('qris', 'QRIS Payment', '', 'Scan QR code for instant payment'),
('ewallet', 'GoPay', '081234567890', 'Transfer to GoPay number'),
('ewallet', 'OVO', '081234567890', 'Transfer to OVO number');

-- Sample articles
INSERT IGNORE INTO articles (title, content, excerpt, category, image) VALUES 
('10 Tips for Planning Your Perfect Wedding', 'Planning a wedding can be overwhelming, but with these essential tips, you can create the perfect day you''ve always dreamed of...\n\n1. Start Early: Begin planning at least 12 months in advance\n2. Set a Budget: Determine your budget before making any decisions\n3. Create a Guest List: This will influence your venue and catering choices\n4. Choose Your Venue: Book your venue as early as possible\n5. Select Your Vendors: Research and book reliable vendors\n6. Plan Your Menu: Consider dietary restrictions and preferences\n7. Design Your Theme: Choose colors and decorations that reflect your style\n8. Prepare for Weather: Have backup plans for outdoor events\n9. Delegate Tasks: Don''t try to do everything yourself\n10. Enjoy the Process: Remember to have fun while planning!', 'Essential tips to help you plan the wedding of your dreams without stress.', 'Planning Tips', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800'),
('2025 Wedding Trends You Need to Know', 'As we move into 2025, wedding trends are evolving to embrace sustainability, personalization, and unique experiences...\n\nSustainable Weddings: Eco-friendly venues and locally sourced flowers\nMicro Weddings: Intimate celebrations with close family and friends\nBold Colors: Moving away from traditional pastels to vibrant hues\nTech Integration: Live streaming for distant relatives and digital guest books\nPersonalized Experiences: Custom cocktails and personalized favors\nNon-Traditional Venues: Museums, art galleries, and unique locations\nStatement Sleeves: Dramatic sleeves are making a comeback\nSustainable Fashion: Vintage dresses and rental options', 'Discover the hottest wedding trends for 2025 and get inspired for your special day.', 'Trends', 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800'),
('How to Choose the Perfect Wedding Venue', 'Selecting the right venue is one of the most important decisions you''ll make for your wedding...\n\nConsider Your Guest Count: Make sure the venue can comfortably accommodate everyone\nThink About Your Style: Choose a venue that matches your wedding theme\nCheck Availability: Popular venues book up quickly, especially during peak season\nConsider the Location: Think about convenience for your guests\nReview the Amenities: What''s included and what will you need to rent?\nVisit Multiple Options: Don''t settle on the first venue you see\nRead Reviews: Check what other couples have said about their experience\nUnderstand the Contract: Make sure you understand all terms and conditions', 'A comprehensive guide to finding and selecting the perfect venue for your wedding day.', 'Venues', 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=800');