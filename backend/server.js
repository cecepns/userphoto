const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { runMigrations } = require('./lib/runMigrations');

const app = express();

// Upload directory: only filename stored in DB; folder = uploads-weddingsapp
const UPLOAD_DIR = path.join(__dirname, 'uploads-weddingsapp');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (file.originalname && path.extname(file.originalname)) || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    cb(null, name);
  }
});
const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|png|gif|webp)/.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error('Hanya file gambar (JPEG, PNG, GIF, WebP) yang diizinkan.'), false);
  }
});

function isStoredFilename(value) {
  return value && typeof value === 'string' && !value.startsWith('http');
}

function unlinkUploadIfStored(value) {
  if (!isStoredFilename(value)) return;
  const filePath = path.join(UPLOAD_DIR, value);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    console.error('Unlink upload error:', e);
  }
}

// Serve uploaded files (only filename in DB; URL = /uploads-weddingsapp/filename)
app.use('/uploads-weddingsapp', express.static(UPLOAD_DIR));
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Database connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Change this to your MySQL password
  database: 'wedding_organizer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let db;

// Initialize database connection
async function initializeDatabase() {
  try {
    // Create connection without database first
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.end();

    // Create connection pool with database
    db = mysql.createPool(dbConfig);

    // Read and execute SQL schema
    const fs = require('fs');
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    // Split SQL statements and execute them
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(statement);
        } catch (error) {
          // Ignore errors for existing tables/data
          if (!error.message.includes('already exists') && !error.message.includes('Duplicate entry')) {
            console.error('SQL execution error:', error);
          }
        }
      }
    }

    // Create default admin user
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await db.execute(
      `INSERT IGNORE INTO admins (email, password) VALUES (?, ?)`, 
      ['admin@weddingbliss.com', hashedPassword]
    );

    // Create surat_jalan table if not exists
    await db.execute(`
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
        vendor_name VARCHAR(255) DEFAULT 'Chekusphoto',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
      )
    `);

    await runMigrations(db);


    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize database on startup
initializeDatabase();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

const PHOTO_STATUSES = new Set([
  'photo_progress', 'editing', 'draft_album', 'printing', 'shipping', 'completed'
]);
const VIDEO_STATUSES = new Set([
  'video_progress', 'processing', 'revision', 'completed'
]);
const REFERENCE_SOURCES = new Set([
  'instagram', 'tiktok', 'facebook', 'google', 'teman', 'lainnya'
]);

function parseOrderSource(value) {
  const v = String(value || '').trim();
  return v === 'custom_request' ? 'custom_request' : 'order';
}

// Routes

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
    const admin = rows[0];

    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, admin: { id: admin.id, email: admin.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/admin/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Password saat ini dan password baru wajib diisi' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: 'Password baru minimal 6 karakter' });
  }
  try {
    const [rows] = await db.execute('SELECT id, password FROM admins WHERE id = ?', [req.user.id]);
    const admin = rows[0];
    if (!admin || !bcrypt.compareSync(currentPassword, admin.password)) {
      return res.status(401).json({ message: 'Password saat ini tidak benar' });
    }
    const hashed = bcrypt.hashSync(newPassword, 10);
    await db.execute('UPDATE admins SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get admin stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    const stats = {};

    const [orderCount] = await db.execute('SELECT COUNT(*) as count FROM orders');
    stats.orders = orderCount[0].count;

    const [serviceCount] = await db.execute('SELECT COUNT(*) as count FROM services');
    stats.services = serviceCount[0].count;

    const [requestCount] = await db.execute('SELECT COUNT(*) as count FROM custom_requests');
    stats.customRequests = requestCount[0].count;

    const [revenueResult] = await db.execute('SELECT SUM(total_amount) as total FROM orders WHERE status = "completed"');
    stats.revenue = revenueResult[0].total || 0;

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Upload file (multer); store only filename; folder = uploads-weddingsapp
app.post('/api/upload', authenticateToken, (req, res, next) => {
  uploadMiddleware.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File terlalu besar (maks 10MB)' });
      if (err.message) return res.status(400).json({ message: err.message });
      return res.status(400).json({ message: 'Upload gagal' });
    }
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    res.json({ filename: req.file.filename });
  });
});

// Services routes
app.get('/api/services', async (req, res) => {
  try {
    const q = (req.query.q || req.query.search || '').trim();
    if (q) {
      const pattern = `%${q}%`;
      const [services] = await db.execute(
        'SELECT * FROM services WHERE name LIKE ? OR description LIKE ? ORDER BY created_at DESC',
        [pattern, pattern]
      );
      return res.json(services);
    }
    const [services] = await db.execute('SELECT * FROM services ORDER BY created_at DESC');
    res.json(services);
  } catch (error) {
    console.error('Services error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT * FROM services WHERE id = ?', [id]);
    const service = rows[0];
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    console.error('Service detail error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/services', authenticateToken, async (req, res) => {
  const { name, description, base_price, image } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO services (name, description, base_price, image) VALUES (?, ?, ?, ?)',
      [name, description, base_price, image]
    );
    res.json({ id: result.insertId, message: 'Service created successfully' });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/services/:id', authenticateToken, async (req, res) => {
  const { name, description, base_price, image } = req.body;
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT image FROM services WHERE id = ?', [id]);
    const oldImage = rows[0] && rows[0].image;
    const [result] = await db.execute(
      'UPDATE services SET name = ?, description = ?, base_price = ?, image = ? WHERE id = ?',
      [name, description, base_price, image, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (oldImage && oldImage !== image && isStoredFilename(oldImage)) unlinkUploadIfStored(oldImage);
    res.json({ message: 'Service updated successfully' });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/services/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT image FROM services WHERE id = ?', [id]);
    const row = rows[0];
    const [result] = await db.execute('DELETE FROM services WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (row && row.image) unlinkUploadIfStored(row.image);
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Helper: parse item images JSON to array
function parseItemImages(rows) {
  if (!rows || !Array.isArray(rows)) return rows;
  return rows.map((row) => {
    if (row.images != null && typeof row.images === 'string') {
      try {
        row.images = JSON.parse(row.images);
        if (!Array.isArray(row.images)) row.images = [];
      } catch (_) {
        row.images = [];
      }
    } else if (row.images == null) {
      row.images = [];
    }
    return row;
  });
}

// Items routes (master items management)
app.get('/api/items', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM items WHERE is_active = true';
    const params = [];
    
    // Add category filter if provided
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY category, name';
    
    const [items] = await db.execute(query, params);
    res.json(parseItemImages(items));
  } catch (error) {
    console.error('Items error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get item categories (must be before /:id route)
app.get('/api/items/categories', async (req, res) => {
  try {
    const [categories] = await db.execute('SELECT DISTINCT category FROM items WHERE is_active = true AND category IS NOT NULL ORDER BY category');
    res.json(categories.map(cat => cat.category));
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT * FROM items WHERE id = ?', [id]);
    const item = rows[0];
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    const [parsed] = parseItemImages([item]);
    res.json(parsed);
  } catch (error) {
    console.error('Item detail error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/items', authenticateToken, async (req, res) => {
  const { name, description, price, category, images } = req.body;
  const imagesJson = Array.isArray(images) ? JSON.stringify(images) : (images && typeof images === 'string' ? images : '[]');
  
  try {
    const [result] = await db.execute(
      'INSERT INTO items (name, description, price, category, images) VALUES (?, ?, ?, ?, ?)',
      [name, description, price, category, imagesJson]
    );
    res.json({ id: result.insertId, message: 'Item created successfully' });
  } catch (error) {
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      // Column images may not exist yet; insert without it
      const [result] = await db.execute(
        'INSERT INTO items (name, description, price, category) VALUES (?, ?, ?, ?)',
        [name, description, price, category]
      );
      return res.json({ id: result.insertId, message: 'Item created successfully' });
    }
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/items/:id', authenticateToken, async (req, res) => {
  const { name, description, price, category, is_active, images } = req.body;
  const { id } = req.params;
  const imagesJson = Array.isArray(images) ? JSON.stringify(images) : (images && typeof images === 'string' ? images : null);
  
  try {
    const [oldRows] = await db.execute('SELECT images FROM items WHERE id = ?', [id]);
    const oldImagesRaw = oldRows[0] && oldRows[0].images;
    let oldFilenames = [];
    if (oldImagesRaw) {
      try {
        const arr = typeof oldImagesRaw === 'string' ? JSON.parse(oldImagesRaw) : oldImagesRaw;
        if (Array.isArray(arr)) oldFilenames = arr.map((f) => (typeof f === 'string' ? f : (f && (f.url || f.filename)) || '')).filter(Boolean);
      } catch (_) { /* ignore */ }
    }
    const newFilenames = Array.isArray(images) ? images.map((f) => (typeof f === 'string' ? f : (f && (f.url || f.filename)) || '')).filter(Boolean) : [];
    const removed = oldFilenames.filter((f) => !newFilenames.includes(f));

    let result;
    if (imagesJson !== null) {
      try {
        [result] = await db.execute(
          'UPDATE items SET name = ?, description = ?, price = ?, category = ?, is_active = ?, images = ? WHERE id = ?',
          [name, description, price, category, is_active, imagesJson, id]
        );
      } catch (err) {
        if (err.code === 'ER_BAD_FIELD_ERROR') {
          [result] = await db.execute(
            'UPDATE items SET name = ?, description = ?, price = ?, category = ?, is_active = ? WHERE id = ?',
            [name, description, price, category, is_active, id]
          );
        } else throw err;
      }
    } else {
      [result] = await db.execute(
        'UPDATE items SET name = ?, description = ?, price = ?, category = ?, is_active = ? WHERE id = ?',
        [name, description, price, category, is_active, id]
      );
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    removed.forEach((f) => unlinkUploadIfStored(f));
    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if item is used in any service
    const [usageCheck] = await db.execute('SELECT COUNT(*) as count FROM service_items WHERE item_id = ?', [id]);
    
    if (usageCheck[0].count > 0) {
      return res.status(400).json({ message: 'Cannot delete item that is used in services. Deactivate it instead.' });
    }
    
    const [rows] = await db.execute('SELECT images FROM items WHERE id = ?', [id]);
    const row = rows[0];
    const [result] = await db.execute('DELETE FROM items WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    if (row && row.images) {
      try {
        const arr = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
        if (Array.isArray(arr)) {
          arr.forEach((f) => unlinkUploadIfStored(typeof f === 'string' ? f : (f && (f.url || f.filename))));
        }
      } catch (_) { /* ignore parse errors */ }
    }
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Service items routes (updated for new schema)
app.get('/api/services/:serviceId/items', async (req, res) => {
  const { serviceId } = req.params;
  
  try {
    const [items] = await db.execute(`
      SELECT si.*, i.name, i.description, i.price as item_price, i.category,
             COALESCE(si.custom_price, i.price) as final_price
      FROM service_items si
      JOIN items i ON si.item_id = i.id
      WHERE si.service_id = ? AND i.is_active = true
      ORDER BY si.sort_order, i.name
    `, [serviceId]);
    res.json(items);
  } catch (error) {
    console.error('Service items error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/services/:serviceId/items', authenticateToken, async (req, res) => {
  const { serviceId } = req.params;
  const { item_id, custom_price, is_required, sort_order } = req.body;
  
  try {
    // Check if item exists
    const [itemCheck] = await db.execute('SELECT id FROM items WHERE id = ? AND is_active = true', [item_id]);
    if (itemCheck.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Check if service exists
    const [serviceCheck] = await db.execute('SELECT id FROM services WHERE id = ?', [serviceId]);
    if (serviceCheck.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    const [result] = await db.execute(
      'INSERT INTO service_items (service_id, item_id, custom_price, is_required, sort_order) VALUES (?, ?, ?, ?, ?)',
      [serviceId, item_id, custom_price, is_required, sort_order]
    );
    res.json({ id: result.insertId, message: 'Service item added successfully' });
  } catch (error) {
    console.error('Add service item error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Item already exists in this service' });
    } else {
      res.status(500).json({ message: 'Database error' });
    }
  }
});

app.put('/api/service-items/:id', authenticateToken, async (req, res) => {
  const { custom_price, is_required, sort_order } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE service_items SET custom_price = ?, is_required = ?, sort_order = ? WHERE id = ?',
      [custom_price, is_required, sort_order, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service item not found' });
    }
    
    res.json({ message: 'Service item updated successfully' });
  } catch (error) {
    console.error('Update service item error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/service-items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM service_items WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service item not found' });
    }
    
    res.json({ message: 'Service item removed successfully' });
  } catch (error) {
    console.error('Remove service item error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Payment methods routes
app.get('/api/payment-methods', async (req, res) => {
  try {
    const [methods] = await db.execute('SELECT * FROM payment_methods ORDER BY created_at DESC');
    res.json(methods);
  } catch (error) {
    console.error('Payment methods error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/payment-methods', authenticateToken, async (req, res) => {
  const { type, name, account_number, details } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO payment_methods (type, name, account_number, details) VALUES (?, ?, ?, ?)',
      [type, name, account_number, details]
    );
    res.json({ id: result.insertId, message: 'Payment method created successfully' });
  } catch (error) {
    console.error('Create payment method error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/payment-methods/:id', authenticateToken, async (req, res) => {
  const { type, name, account_number, details } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE payment_methods SET type = ?, name = ?, account_number = ?, details = ? WHERE id = ?',
      [type, name, account_number, details, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Payment method not found' });
    }
    
    res.json({ message: 'Payment method updated successfully' });
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/payment-methods/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM payment_methods WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Payment method not found' });
    }
    
    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Orders routes
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { status } = req.query;

    // Optional status filter (mendukung satu atau beberapa status, dipisahkan koma)
    const whereClauses = [];
    const params = [];

    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);

      if (statuses.length === 1) {
        whereClauses.push('status = ?');
        params.push(statuses[0]);
      } else if (statuses.length > 1) {
        whereClauses.push(`status IN (${statuses.map(() => '?').join(',')})`);
        params.push(...statuses);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    // Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM orders ${whereSql}`,
      params
    );
    const total = countResult[0].total;
    
    // Get paginated orders with service base_price
    const [orders] = await db.execute(`
      SELECT o.*, s.base_price 
      FROM orders o 
      LEFT JOIN services s ON o.service_id = s.id 
      ${whereSql ? whereSql.replace(/status/g, 'o.status') : ''}
      ORDER BY o.created_at DESC 
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/orders/public/:id', async (req, res) => {
  const { id } = req.params;
  const phoneInput = String(req.query.phone || '').trim();
  const normalizePhoneNumber = (value) => String(value || '').replace(/\D/g, '');
  const orderId = Number(id);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return res.status(400).json({ message: 'ID pesanan tidak valid' });
  }
  if (!phoneInput) {
    return res.status(400).json({ message: 'Nomor HP wajib diisi' });
  }

  try {
    const [rows] = await db.execute(
      `SELECT o.*, s.base_price, s.image AS service_image
       FROM orders o
       LEFT JOIN services s ON o.service_id = s.id
       WHERE o.id = ?
       LIMIT 1`,
      [orderId]
    );
    const order = rows[0];
    if (!order) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }
    if (normalizePhoneNumber(order.phone) !== normalizePhoneNumber(phoneInput)) {
      return res.status(403).json({ message: 'Nomor HP tidak sesuai dengan pesanan' });
    }

    order.selected_items = parseSelectedItemsArray(order.selected_items);
    res.json(order);
  } catch (error) {
    console.error('Public order detail error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/orders/public/:id', async (req, res) => {
  const { id } = req.params;
  const normalizePhoneNumber = (value) => String(value || '').replace(/\D/g, '');
  const orderId = Number(id);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return res.status(400).json({ message: 'ID pesanan tidak valid' });
  }

  const {
    name,
    email,
    phone,
    address,
    wedding_date,
    notes,
    selected_items,
    verification_phone,
    service_id
  } = req.body || {};

  if (!name || !email || !wedding_date) {
    return res.status(400).json({ message: 'Nama, email, dan tanggal acara wajib diisi' });
  }
  if (!verification_phone) {
    return res.status(400).json({ message: 'Nomor HP verifikasi wajib diisi' });
  }

  try {
    const [existingRows] = await db.execute(
      'SELECT id, status, service_id, booking_amount, phone FROM orders WHERE id = ? LIMIT 1',
      [orderId]
    );
    const existingOrder = existingRows[0];
    if (!existingOrder) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }
    if (existingOrder.status !== 'pending') {
      return res.status(400).json({ message: 'Pesanan hanya bisa diedit saat status masih pending' });
    }
    if (normalizePhoneNumber(existingOrder.phone) !== normalizePhoneNumber(verification_phone)) {
      return res.status(403).json({ message: 'Nomor HP verifikasi tidak sesuai' });
    }

    const nextServiceId = Number(service_id || existingOrder.service_id);
    if (!Number.isFinite(nextServiceId) || nextServiceId <= 0) {
      return res.status(400).json({ message: 'Layanan tidak valid' });
    }
    const [serviceRows] = await db.execute(
      'SELECT id, name, base_price FROM services WHERE id = ? LIMIT 1',
      [nextServiceId]
    );
    const selectedService = serviceRows[0];
    if (!selectedService) {
      return res.status(404).json({ message: 'Layanan tidak ditemukan' });
    }
    const basePrice = Number(selectedService.base_price || 0);

    const incomingItems = Array.isArray(selected_items) ? selected_items : [];
    const normalizedItems = incomingItems
      .map((item) => {
        const parsedPrice = Number(
          item?.final_price ?? item?.item_price ?? item?.price ?? item?.custom_price ?? 0
        );
        const itemPrice = Number.isFinite(parsedPrice) ? parsedPrice : 0;
        return {
          ...item,
          quantity: 1,
          final_price: itemPrice
        };
      })
      .filter((item) => {
        const hasName = Boolean((item?.name || item?.item_name || item?.title || '').toString().trim());
        const hasId = Number.isFinite(Number(item?.id)) || Number.isFinite(Number(item?.item_id));
        return hasName || hasId;
      });

    const selectedItemsTotal = normalizedItems.reduce(
      (sum, item) => sum + Number(item.final_price || 0),
      0
    );
    const totalAmount = basePrice + selectedItemsTotal;

    await db.execute(
      `UPDATE orders
       SET name = ?, email = ?, phone = ?, address = ?, wedding_date = ?, notes = ?,
           service_id = ?, service_name = ?, selected_items = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        String(name).trim(),
        String(email).trim(),
        phone || '',
        address || '',
        wedding_date,
        notes || '',
        selectedService.id,
        selectedService.name,
        JSON.stringify(normalizedItems),
        totalAmount,
        orderId
      ]
    );

    res.json({
      message: 'Pesanan berhasil diperbarui',
      order: {
        id: orderId,
        selected_items: normalizedItems,
        total_amount: totalAmount,
        booking_amount: existingOrder.booking_amount
      }
    });
  } catch (error) {
    console.error('Public order update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/custom-requests/public/:id', async (req, res) => {
  const { id } = req.params;
  const phoneInput = String(req.query.phone || '').trim();
  const normalizePhoneNumber = (value) => String(value || '').replace(/\D/g, '');
  const requestId = Number(id);
  if (!Number.isFinite(requestId) || requestId <= 0) {
    return res.status(400).json({ message: 'ID pesanan custom tidak valid' });
  }
  if (!phoneInput) {
    return res.status(400).json({ message: 'Nomor HP wajib diisi' });
  }

  try {
    const [rows] = await db.execute(
      `SELECT id, name, email, phone, wedding_date, booking_amount, services, additional_requests, status, created_at
       FROM custom_requests
       WHERE id = ?
       LIMIT 1`,
      [requestId]
    );
    const request = rows[0];
    if (!request) {
      return res.status(404).json({ message: 'Pesanan custom tidak ditemukan' });
    }
    if (normalizePhoneNumber(request.phone) !== normalizePhoneNumber(phoneInput)) {
      return res.status(403).json({ message: 'Nomor HP tidak sesuai dengan pesanan' });
    }

    res.json({
      ...request,
      order_source: 'custom_request'
    });
  } catch (error) {
    console.error('Public custom request detail error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/custom-requests/public/:id', async (req, res) => {
  const { id } = req.params;
  const normalizePhoneNumber = (value) => String(value || '').replace(/\D/g, '');
  const requestId = Number(id);
  if (!Number.isFinite(requestId) || requestId <= 0) {
    return res.status(400).json({ message: 'ID pesanan custom tidak valid' });
  }

  const {
    name,
    email,
    phone,
    wedding_date,
    services,
    additional_requests,
    notes,
    verification_phone
  } = req.body || {};

  if (!name || !email || !wedding_date) {
    return res.status(400).json({ message: 'Nama, email, dan tanggal acara wajib diisi' });
  }
  if (!verification_phone) {
    return res.status(400).json({ message: 'Nomor HP verifikasi wajib diisi' });
  }

  try {
    const [existingRows] = await db.execute(
      'SELECT id, status, phone, services, additional_requests FROM custom_requests WHERE id = ? LIMIT 1',
      [requestId]
    );
    const existingRequest = existingRows[0];
    if (!existingRequest) {
      return res.status(404).json({ message: 'Pesanan custom tidak ditemukan' });
    }
    if (existingRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Pesanan custom hanya bisa diedit saat status masih pending' });
    }
    if (normalizePhoneNumber(existingRequest.phone) !== normalizePhoneNumber(verification_phone)) {
      return res.status(403).json({ message: 'Nomor HP verifikasi tidak sesuai' });
    }

    const nextServices = services != null ? String(services).trim() : (existingRequest.services || '');
    const nextAdditionalRequests = additional_requests != null
      ? String(additional_requests).trim()
      : (notes != null ? String(notes).trim() : (existingRequest.additional_requests || ''));

    await db.execute(
      `UPDATE custom_requests
       SET name = ?, email = ?, phone = ?, wedding_date = ?, services = ?, additional_requests = ?
       WHERE id = ?`,
      [
        String(name).trim(),
        String(email).trim(),
        phone || '',
        wedding_date,
        nextServices,
        nextAdditionalRequests,
        requestId
      ]
    );

    res.json({
      message: 'Pesanan custom berhasil diperbarui',
      order: {
        id: requestId,
        services: nextServices,
        additional_requests: nextAdditionalRequests
      }
    });
  } catch (error) {
    console.error('Public custom request update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/vendor-calendar', authenticateToken, async (req, res) => {
  try {
    const [toppingItems] = await db.execute(
      `SELECT id, name, category
       FROM items
       WHERE is_active = true
         AND LOWER(TRIM(COALESCE(category, ''))) = 'topping'`
    );

    const toppingById = new Map(
      toppingItems
        .map((item) => [Number(item.id), item])
        .filter(([id]) => Number.isFinite(id))
    );

    const [orders] = await db.execute(
      `SELECT o.id, o.name, o.phone, o.email, DATE_FORMAT(o.wedding_date, '%Y-%m-%d') AS wedding_date,
              o.status, o.selected_items, o.vendor_id, v.name AS assigned_vendor_name
       FROM orders o
       LEFT JOIN vendors v ON o.vendor_id = v.id
       WHERE o.wedding_date IS NOT NULL
         AND o.status IN ('pending', 'confirmed', 'completed')
       ORDER BY o.wedding_date ASC`
    );

    const [customRequests] = await db.execute(
      `SELECT cr.id, cr.name, cr.phone, cr.email, DATE_FORMAT(cr.wedding_date, '%Y-%m-%d') AS wedding_date,
              cr.status, cr.services, cr.vendor_id, v.name AS assigned_vendor_name
       FROM custom_requests cr
       LEFT JOIN vendors v ON cr.vendor_id = v.id
       WHERE cr.wedding_date IS NOT NULL
         AND cr.status IN ('pending', 'confirmed', 'completed')
       ORDER BY cr.wedding_date ASC`
    );

    const [adminVendors] = await db.execute(
      'SELECT id, name FROM vendors WHERE is_active = 1 ORDER BY name ASC'
    );

    const events = [];

    for (const order of orders) {
      const selectedItems = parseSelectedItemsArray(order.selected_items);
      for (const selectedItem of selectedItems) {
        // IMPORTANT:
        // selected_items bisa punya:
        // - id      => id dari tabel relasi service_items
        // - item_id => id dari tabel master items
        // Vendor calendar harus pakai item_id terlebih dulu.
        const selectedItemId = Number(selectedItem?.item_id ?? selectedItem?.id);
        const selectedItemName = selectedItem?.name || selectedItem?.item_name || selectedItem?.title || '';

        let matchedTopping = null;
        if (Number.isFinite(selectedItemId) && selectedItemId > 0) {
          // Strict by ID: hanya item dengan category TOPPING yang masuk vendor calendar.
          matchedTopping = toppingById.get(selectedItemId) || null;
        } else {
          // Fallback untuk data legacy tanpa item_id.
          matchedTopping = findToppingByName(selectedItemName, toppingItems);
        }
        if (!matchedTopping) continue;

        events.push({
          event_type: 'order',
          source_id: order.id,
          client_name: order.name,
          client_phone: order.phone,
          client_email: order.email,
          wedding_date: order.wedding_date,
          status: order.status,
          vendor_key: `item_${matchedTopping.id}`,
          vendor_name: matchedTopping.name,
          source_item_name: selectedItemName || matchedTopping.name,
          vendor_id: order.vendor_id || null,
          assigned_vendor_name: order.assigned_vendor_name || ''
        });
      }
    }

    for (const request of customRequests) {
      const servicesText = request.services || '';
      const chunks = servicesText
        .split(',')
        .map((chunk) => chunk.trim())
        .filter(Boolean);

      for (const chunk of chunks) {
        const matchedTopping = findToppingByName(chunk, toppingItems);
        if (!matchedTopping) continue;

        events.push({
          event_type: 'custom_request',
          source_id: request.id,
          client_name: request.name,
          client_phone: request.phone,
          client_email: request.email,
          wedding_date: request.wedding_date,
          status: request.status,
          vendor_key: `item_${matchedTopping.id}`,
          vendor_name: matchedTopping.name,
          source_item_name: chunk,
          vendor_id: request.vendor_id || null,
          assigned_vendor_name: request.assigned_vendor_name || ''
        });
      }
    }

    const [overrideRows] = await db.execute(
      `SELECT event_type, source_id, vendor_key, DATE_FORMAT(wedding_date, '%Y-%m-%d') AS wedding_date, custom_vendor_name
       FROM vendor_calendar_overrides`
    );
    const overrideByKey = new Map(
      overrideRows.map((row) => [
        [
          row.event_type,
          Number(row.source_id),
          row.vendor_key,
          String(row.wedding_date || '').slice(0, 10)
        ].join('|'),
        row.custom_vendor_name
      ])
    );

    const uniqueEvents = [];
    const seenKeys = new Set();
    for (const event of events) {
      const weddingDateKey = event.wedding_date
        ? String(event.wedding_date).slice(0, 10)
        : '';
      const overrideKey = [
        event.event_type,
        Number(event.source_id),
        event.vendor_key,
        weddingDateKey
      ].join('|');
      const customVendorName = overrideByKey.get(overrideKey);
      event.custom_vendor_name = customVendorName
        ? String(customVendorName).trim()
        : '';

      const key = [
        event.event_type,
        event.source_id,
        event.vendor_key,
        event.wedding_date
      ].join('|');
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      uniqueEvents.push(event);
    }

    res.json({
      vendors: toppingItems.map((item) => ({ key: `item_${item.id}`, label: item.name })),
      admin_vendors: adminVendors,
      events: uniqueEvents
    });
  } catch (error) {
    console.error('Vendor calendar error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/vendor-calendar/vendor-name', authenticateToken, async (req, res) => {
  const { event_type, source_id, vendor_key, wedding_date, vendor_name } = req.body || {};
  const normalizedEventType = String(event_type || '').trim();
  const normalizedVendorKey = String(vendor_key || '').trim();
  const normalizedVendorName = String(vendor_name || '').trim();
  const parsedSourceId = Number(source_id);
  const weddingDateRaw = String(wedding_date || '').trim();

  if (!['order', 'custom_request'].includes(normalizedEventType)) {
    return res.status(400).json({ message: 'event_type tidak valid' });
  }
  if (!Number.isFinite(parsedSourceId) || parsedSourceId <= 0) {
    return res.status(400).json({ message: 'source_id tidak valid' });
  }
  if (!normalizedVendorKey) {
    return res.status(400).json({ message: 'vendor_key wajib diisi' });
  }
  if (!normalizedVendorName) {
    return res.status(400).json({ message: 'vendor_name wajib diisi' });
  }
  const weddingDateSql = weddingDateRaw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weddingDateSql)) {
    return res.status(400).json({ message: 'wedding_date tidak valid' });
  }

  try {
    await db.execute(
      `INSERT INTO vendor_calendar_overrides (
        event_type, source_id, vendor_key, wedding_date, custom_vendor_name
      ) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        custom_vendor_name = VALUES(custom_vendor_name),
        updated_at = CURRENT_TIMESTAMP`,
      [
        normalizedEventType,
        parsedSourceId,
        normalizedVendorKey,
        weddingDateSql,
        normalizedVendorName
      ]
    );
    res.json({ message: 'Nama vendor berhasil disimpan' });
  } catch (error) {
    console.error('Vendor calendar override upsert error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/orders', async (req, res) => {
  const {
    name, email, phone, address, wedding_date, notes, service_id, service_name,
    selected_items, total_amount, booking_amount,
    bride_name, groom_name, reference_source
  } = req.body;

  if (!bride_name?.trim() || !groom_name?.trim()) {
    return res.status(400).json({ message: 'Nama pasangan wanita dan pria wajib diisi' });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO orders (
        name, email, phone, address, wedding_date, notes, service_id, service_name,
        selected_items, total_amount, booking_amount, status,
        bride_name, groom_name, reference_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, email, phone, address, wedding_date, notes, service_id, service_name,
        JSON.stringify(selected_items), total_amount, booking_amount || 300000, 'pending',
        bride_name.trim(), groom_name.trim(), reference_source || null
      ]
    );
    res.json({ id: result.insertId, message: 'Order created successfully' });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM orders WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/orders/:id/booking-amount', authenticateToken, async (req, res) => {
  const { booking_amount } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE orders SET booking_amount = ? WHERE id = ?',
      [booking_amount, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json({ message: 'Booking amount updated successfully' });
  } catch (error) {
    console.error('Update booking amount error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/orders/:id/selected-items', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { selected_items } = req.body || {};
  const orderId = Number(id);

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return res.status(400).json({ message: 'ID pesanan tidak valid' });
  }

  const normalizedItems = (Array.isArray(selected_items) ? selected_items : [])
    .map((item) => {
      const parsedPrice = Number(
        item?.final_price ?? item?.item_price ?? item?.price ?? item?.custom_price ?? 0
      );
      return {
        ...item,
        final_price: Number.isFinite(parsedPrice) ? parsedPrice : 0
      };
    })
    .filter((item) => {
      const hasName = Boolean((item?.name || item?.item_name || item?.title || '').toString().trim());
      const hasId = Number.isFinite(Number(item?.id)) || Number.isFinite(Number(item?.item_id));
      return hasName || hasId;
    });

  try {
    const [rows] = await db.execute(
      'SELECT id, service_id, status FROM orders WHERE id = ? LIMIT 1',
      [orderId]
    );
    const order = rows[0];
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Item layanan hanya bisa diubah saat status pending' });
    }

    const [serviceRows] = await db.execute(
      'SELECT base_price FROM services WHERE id = ? LIMIT 1',
      [order.service_id]
    );
    const basePrice = Number(serviceRows[0]?.base_price || 0);
    const selectedItemsTotal = normalizedItems.reduce(
      (sum, item) => sum + Number(item.final_price || 0),
      0
    );
    const totalAmount = basePrice + selectedItemsTotal;

    await db.execute(
      `UPDATE orders
       SET selected_items = ?, total_amount = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [JSON.stringify(normalizedItems), totalAmount, orderId]
    );

    res.json({
      message: 'Item pesanan berhasil diperbarui',
      order: {
        id: orderId,
        selected_items: normalizedItems,
        total_amount: totalAmount
      }
    });
  } catch (error) {
    console.error('Update order selected items error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Custom requests routes
app.post('/api/custom-requests', async (req, res) => {
  const {
    name, email, phone, wedding_date, booking_amount, services, additional_requests,
    bride_name, groom_name, reference_source
  } = req.body;
  
  // Debug: Log the received data
  console.log('Received custom request data:', {
    name, email, phone, wedding_date, booking_amount, services, additional_requests
  });
  
  // Debug: Check for undefined values
  const fields = { name, email, phone, wedding_date, booking_amount, services, additional_requests };
  Object.keys(fields).forEach(key => {
    if (fields[key] === undefined) {
      console.log(`WARNING: ${key} is undefined`);
    }
  });
  
  // Validate required fields
  if (!name || !email || !phone || !wedding_date ||
      name.trim() === '' || email.trim() === '' || phone.trim() === '' || wedding_date.trim() === '') {
    return res.status(400).json({ message: 'Missing required fields: name, email, phone, wedding_date' });
  }
  if (!bride_name?.trim() || !groom_name?.trim()) {
    return res.status(400).json({ message: 'Nama pasangan wanita dan pria wajib diisi' });
  }

  const params = [
    name || null,
    email || null,
    phone || null,
    wedding_date || null,
    booking_amount ? parseFloat(booking_amount) : 300000,
    services || null,
    additional_requests || null,
    'pending',
    bride_name.trim(),
    groom_name.trim(),
    reference_source || null
  ];
  
  // Debug: Log the parameters being sent to database
  console.log('Database parameters:', params);
  
  try {
    const [result] = await db.execute(
      `INSERT INTO custom_requests (
        name, email, phone, wedding_date, booking_amount, services, additional_requests, status,
        bride_name, groom_name, reference_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params
    );
    res.json({ id: result.insertId, message: 'Custom request submitted successfully' });
  } catch (error) {
    console.error('Create custom request error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Helper function to get items details from services string
async function getItemsDetailsFromServices(servicesString) {
  if (!servicesString || typeof servicesString !== 'string') {
    return { items: [], totalAmount: 0 };
  }

  try {
    // Split services by comma and clean up
    const serviceNames = servicesString
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (serviceNames.length === 0) {
      return { items: [], totalAmount: 0 };
    }

    const items = [];
    let totalAmount = 0;

    // For each service name, try to find matching items
    for (const serviceName of serviceNames) {
      let matchedItem = null;

      // IMPORTANT:
      // Bila ada nama item duplikat (contoh di kategori berbeda),
      // selalu prioritaskan harga paling kecil agar tidak overcharge customer.
      // Exact normalized match diprioritaskan lebih dulu.
      let [candidates] = await db.execute(
        `SELECT id, name, price
         FROM items
         WHERE is_active = true
           AND LOWER(TRIM(name)) = LOWER(TRIM(?))
         ORDER BY CAST(price AS DECIMAL(15,2)) ASC, id DESC`,
        [serviceName]
      );

      // If no exact match, try contains match (case insensitive)
      if (candidates.length === 0) {
        [candidates] = await db.execute(
          `SELECT id, name, price
           FROM items
           WHERE is_active = true
             AND LOWER(name) LIKE LOWER(?)
           ORDER BY CAST(price AS DECIMAL(15,2)) ASC, id DESC
           LIMIT 1`,
          [`%${serviceName}%`]
        );
      }

      // If still no match, try reverse contains
      if (candidates.length === 0) {
        [candidates] = await db.execute(
          `SELECT id, name, price
           FROM items
           WHERE is_active = true
             AND LOWER(?) LIKE CONCAT("%", LOWER(name), "%")
           ORDER BY CAST(price AS DECIMAL(15,2)) ASC, id DESC
           LIMIT 1`,
          [serviceName]
        );
      }

      // If found, add to items list
      if (candidates.length > 0) {
        matchedItem = candidates[0];
        const price = parseFloat(matchedItem.price) || 0;
        items.push({
          name: serviceName, // Use original service name from request
          item_name: matchedItem.name, // Actual item name from database
          price: price
        });
        totalAmount += price;
      } else {
        // If not found, still add with price 0
        items.push({
          name: serviceName,
          item_name: serviceName,
          price: 0
        });
      }
    }

    return { items, totalAmount };
  } catch (error) {
    console.error('Error getting items details from services:', error);
    return { items: [], totalAmount: 0 };
  }
}

// Helper function to calculate total amount from services string
async function calculateTotalAmountFromServices(servicesString) {
  const { totalAmount } = await getItemsDetailsFromServices(servicesString);
  return totalAmount;
}

function normalizeVendorText(value) {
  if (!value || typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSelectedItemsArray(rawSelectedItems) {
  if (!rawSelectedItems) return [];
  if (Array.isArray(rawSelectedItems)) return rawSelectedItems;
  if (typeof rawSelectedItems !== 'string') return [];

  try {
    const parsed = JSON.parse(rawSelectedItems);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function findToppingByName(value, toppings) {
  const normalized = normalizeVendorText(value);
  if (!normalized) return null;

  const exact = toppings.find((item) => normalizeVendorText(item.name) === normalized);
  if (exact) return exact;

  return null;
}

app.get('/api/custom-requests', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { status } = req.query;

    const whereClauses = [];
    const countParams = [];
    const listParams = [];

    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        whereClauses.push('status = ?');
        countParams.push(statuses[0]);
        listParams.push(statuses[0]);
      } else if (statuses.length > 1) {
        whereClauses.push(`status IN (${statuses.map(() => '?').join(',')})`);
        countParams.push(...statuses);
        listParams.push(...statuses);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM custom_requests ${whereSql}`,
      countParams
    );
    const total = countResult[0].total;

    // Get paginated custom requests
    const [requests] = await db.execute(
      `SELECT * FROM custom_requests ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...listParams, limit, offset]
    );
    
    // Calculate total_amount and items details for each request based on services
    const requestsWithTotal = await Promise.all(
      requests.map(async (request) => {
        const { items, totalAmount } = await getItemsDetailsFromServices(request.services);
        return {
          ...request,
          total_amount: totalAmount,
          items_details: items // Include items breakdown for invoice
        };
      })
    );
    
    res.json({
      requests: requestsWithTotal,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Custom requests error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/custom-requests/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM custom_requests WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Custom request not found' });
    }
    
    res.json({ message: 'Custom request deleted successfully' });
  } catch (error) {
    console.error('Delete custom request error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/custom-requests/:id/booking-amount', authenticateToken, async (req, res) => {
  const { booking_amount } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE custom_requests SET booking_amount = ? WHERE id = ?',
      [booking_amount, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Custom request not found' });
    }
    
    res.json({ message: 'Booking amount updated successfully' });
  } catch (error) {
    console.error('Update booking amount error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/custom-requests/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  
  // Validate status
  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  
  try {
    const [result] = await db.execute(
      'UPDATE custom_requests SET status = ? WHERE id = ?',
      [status, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Custom request not found' });
    }
    
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Articles routes
app.get('/api/articles', async (req, res) => {
  try {
    const [articles] = await db.execute('SELECT * FROM articles ORDER BY created_at DESC');
    res.json(articles);
  } catch (error) {
    console.error('Articles error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/articles/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT * FROM articles WHERE id = ?', [id]);
    const article = rows[0];
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    res.json(article);
  } catch (error) {
    console.error('Article error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/articles', authenticateToken, async (req, res) => {
  const { title, content, excerpt, image, category } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO articles (title, content, excerpt, image, category) VALUES (?, ?, ?, ?, ?)',
      [title, content, excerpt, image, category]
    );
    res.json({ id: result.insertId, message: 'Article created successfully' });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/articles/:id', authenticateToken, async (req, res) => {
  const { title, content, excerpt, image, category } = req.body;
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT image FROM articles WHERE id = ?', [id]);
    const oldImage = rows[0] && rows[0].image;
    const [result] = await db.execute(
      'UPDATE articles SET title = ?, content = ?, excerpt = ?, image = ?, category = ? WHERE id = ?',
      [title, content, excerpt, image, category, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Article not found' });
    }
    if (oldImage && oldImage !== image && isStoredFilename(oldImage)) unlinkUploadIfStored(oldImage);
    res.json({ message: 'Article updated successfully' });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/articles/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT image FROM articles WHERE id = ?', [id]);
    const row = rows[0];
    const [result] = await db.execute('DELETE FROM articles WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Article not found' });
    }
    if (row && row.image) unlinkUploadIfStored(row.image);
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Gallery categories routes
app.get('/api/gallery/categories', async (req, res) => {
  try {
    const [categories] = await db.execute('SELECT * FROM gallery_categories WHERE is_active = true ORDER BY sort_order, name');
    res.json(categories);
  } catch (error) {
    console.error('Gallery categories error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/gallery/categories', authenticateToken, async (req, res) => {
  const { name, description, sort_order } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO gallery_categories (name, description, sort_order) VALUES (?, ?, ?)',
      [name, description, sort_order]
    );
    res.json({ id: result.insertId, message: 'Gallery category created successfully' });
  } catch (error) {
    console.error('Create gallery category error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/gallery/categories/:id', authenticateToken, async (req, res) => {
  const { name, description, is_active, sort_order } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE gallery_categories SET name = ?, description = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [name, description, is_active, sort_order, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Gallery category not found' });
    }
    
    res.json({ message: 'Gallery category updated successfully' });
  } catch (error) {
    console.error('Update gallery category error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/gallery/categories/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if category has images
    const [imageCheck] = await db.execute('SELECT COUNT(*) as count FROM gallery_images WHERE category_id = ?', [id]);
    
    if (imageCheck[0].count > 0) {
      return res.status(400).json({ message: 'Cannot delete category that has images. Deactivate it instead.' });
    }
    
    const [result] = await db.execute('DELETE FROM gallery_categories WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Gallery category not found' });
    }
    
    res.json({ message: 'Gallery category deleted successfully' });
  } catch (error) {
    console.error('Delete gallery category error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Gallery images routes
app.get('/api/gallery/images', async (req, res) => {
  const { category_id, featured } = req.query;
  
  try {
    let query = `
      SELECT gi.*, gc.name as category_name 
      FROM gallery_images gi 
      LEFT JOIN gallery_categories gc ON gi.category_id = gc.id 
      WHERE gi.is_active = true
    `;
    const params = [];
    
    if (category_id) {
      query += ' AND gi.category_id = ?';
      params.push(category_id);
    }
    
    if (featured === 'true') {
      query += ' AND gi.is_featured = true';
    }
    
    query += ' ORDER BY gi.sort_order, gi.created_at DESC';
    
    const [images] = await db.execute(query, params);
    res.json(images);
  } catch (error) {
    console.error('Gallery images error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/gallery/images/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute(`
      SELECT gi.*, gc.name as category_name 
      FROM gallery_images gi 
      LEFT JOIN gallery_categories gc ON gi.category_id = gc.id 
      WHERE gi.id = ?
    `, [id]);
    const image = rows[0];
    
    if (!image) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    
    res.json(image);
  } catch (error) {
    console.error('Gallery image error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/gallery/images', authenticateToken, async (req, res) => {
  const { title, description, image_url, category_id, is_featured, sort_order } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO gallery_images (title, description, image_url, category_id, is_featured, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, image_url, category_id, is_featured, sort_order]
    );
    res.json({ id: result.insertId, message: 'Gallery image created successfully' });
  } catch (error) {
    console.error('Create gallery image error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/gallery/images/:id', authenticateToken, async (req, res) => {
  const { title, description, image_url, category_id, is_featured, is_active, sort_order } = req.body;
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT image_url FROM gallery_images WHERE id = ?', [id]);
    const oldUrl = rows[0] && rows[0].image_url;
    const [result] = await db.execute(
      'UPDATE gallery_images SET title = ?, description = ?, image_url = ?, category_id = ?, is_featured = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [title, description, image_url, category_id, is_featured, is_active, sort_order, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    if (oldUrl && oldUrl !== image_url && isStoredFilename(oldUrl)) unlinkUploadIfStored(oldUrl);
    res.json({ message: 'Gallery image updated successfully' });
  } catch (error) {
    console.error('Update gallery image error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/gallery/images/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT image_url FROM gallery_images WHERE id = ?', [id]);
    const row = rows[0];
    const [result] = await db.execute('DELETE FROM gallery_images WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    if (row && row.image_url) unlinkUploadIfStored(row.image_url);
    res.json({ message: 'Gallery image deleted successfully' });
  } catch (error) {
    console.error('Delete gallery image error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Content sections routes
// Catatan: untuk section_name = 'site_identity', field description dapat berisi JSON
// { "siteContact": { ... }, "footerServices": ["...", "..."] }
// (dikelola dari admin frontend). GET/PUT tidak perlu parsing khusus — disimpan sebagai teks.
app.get('/api/content-sections', async (req, res) => {
  try {
    const [sections] = await db.execute('SELECT * FROM content_sections ORDER BY sort_order, created_at DESC');
    res.json(sections);
  } catch (error) {
    console.error('Content sections error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/content-sections/:sectionName', async (req, res) => {
  const { sectionName } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT * FROM content_sections WHERE section_name = ? AND is_active = true', [sectionName]);
    const section = rows[0];
    
    if (!section) {
      return res.status(404).json({ message: 'Content section not found' });
    }
    
    res.json(section);
  } catch (error) {
    console.error('Content section error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/content-sections', authenticateToken, async (req, res) => {
  const { section_name, title, subtitle, description, image_url, button_text, button_url, sort_order } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO content_sections (section_name, title, subtitle, description, image_url, button_text, button_url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [section_name, title, subtitle, description, image_url, button_text, button_url, sort_order]
    );
    res.json({ id: result.insertId, message: 'Content section created successfully' });
  } catch (error) {
    console.error('Create content section error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Section name already exists' });
    } else {
      res.status(500).json({ message: 'Database error' });
    }
  }
});

app.put('/api/content-sections/:id', authenticateToken, async (req, res) => {
  const { title, subtitle, description, image_url, button_text, button_url, is_active, sort_order } = req.body;
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT image_url FROM content_sections WHERE id = ?', [id]);
    const oldUrl = rows[0] && rows[0].image_url;
    const [result] = await db.execute(
      'UPDATE content_sections SET title = ?, subtitle = ?, description = ?, image_url = ?, button_text = ?, button_url = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [title, subtitle, description, image_url, button_text, button_url, is_active, sort_order, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Content section not found' });
    }
    if (oldUrl && oldUrl !== image_url && isStoredFilename(oldUrl)) unlinkUploadIfStored(oldUrl);
    res.json({ message: 'Content section updated successfully' });
  } catch (error) {
    console.error('Update content section error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/content-sections/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT image_url FROM content_sections WHERE id = ?', [id]);
    const row = rows[0];
    const [result] = await db.execute('DELETE FROM content_sections WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Content section not found' });
    }
    if (row && row.image_url) unlinkUploadIfStored(row.image_url);
    res.json({ message: 'Content section deleted successfully' });
  } catch (error) {
    console.error('Delete content section error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Service cards routes (unified endpoint for all cards)
app.get('/api/service-cards', async (req, res) => {
  try {
    const { card_type } = req.query;
    
    let query = 'SELECT * FROM service_cards WHERE is_active = true';
    const params = [];
    
    // Filter by card_type if provided
    if (card_type) {
      query += ' AND card_type = ?';
      params.push(card_type);
    }
    
    query += ' ORDER BY card_type, sort_order, created_at DESC';
    
    const [cards] = await db.execute(query, params);
    res.json(cards);
  } catch (error) {
    console.error('Service cards error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/service-cards/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT * FROM service_cards WHERE id = ?', [id]);
    const card = rows[0];
    
    if (!card) {
      return res.status(404).json({ message: 'Service card not found' });
    }
    
    res.json(card);
  } catch (error) {
    console.error('Service card error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/service-cards', authenticateToken, async (req, res) => {
  const { title, description, icon, image_url, button_text, button_url, card_type, sort_order } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO service_cards (title, description, icon, image_url, button_text, button_url, card_type, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, icon, image_url, button_text, button_url, card_type || 'service', sort_order]
    );
    res.json({ id: result.insertId, message: 'Card created successfully' });
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/service-cards/:id', authenticateToken, async (req, res) => {
  const { title, description, icon, image_url, button_text, button_url, card_type, is_active, sort_order } = req.body;
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT image_url FROM service_cards WHERE id = ?', [id]);
    const oldUrl = rows[0] && rows[0].image_url;
    const [result] = await db.execute(
      'UPDATE service_cards SET title = ?, description = ?, icon = ?, image_url = ?, button_text = ?, button_url = ?, card_type = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [title, description, icon, image_url, button_text, button_url, card_type, is_active, sort_order, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Card not found' });
    }
    if (oldUrl && oldUrl !== image_url && isStoredFilename(oldUrl)) unlinkUploadIfStored(oldUrl);
    res.json({ message: 'Card updated successfully' });
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/service-cards/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT image_url FROM service_cards WHERE id = ?', [id]);
    const row = rows[0];
    const [result] = await db.execute('DELETE FROM service_cards WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service card not found' });
    }
    if (row && row.image_url) unlinkUploadIfStored(row.image_url);
    res.json({ message: 'Service card deleted successfully' });
  } catch (error) {
    console.error('Delete service card error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Service features routes
app.get('/api/service-features', async (req, res) => {
  try {
    const [features] = await db.execute('SELECT * FROM service_features WHERE is_active = true ORDER BY sort_order, created_at DESC');
    res.json(features);
  } catch (error) {
    console.error('Service features error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/service-features/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT * FROM service_features WHERE id = ?', [id]);
    const feature = rows[0];
    
    if (!feature) {
      return res.status(404).json({ message: 'Service feature not found' });
    }
    
    res.json(feature);
  } catch (error) {
    console.error('Service feature error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/service-features', authenticateToken, async (req, res) => {
  const { title, description, icon, sort_order } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO service_features (title, description, icon, sort_order) VALUES (?, ?, ?, ?)',
      [title, description, icon, sort_order]
    );
    res.json({ id: result.insertId, message: 'Service feature created successfully' });
  } catch (error) {
    console.error('Create service feature error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/service-features/:id', authenticateToken, async (req, res) => {
  const { title, description, icon, is_active, sort_order } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE service_features SET title = ?, description = ?, icon = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [title, description, icon, is_active, sort_order, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service feature not found' });
    }
    
    res.json({ message: 'Service feature updated successfully' });
  } catch (error) {
    console.error('Update service feature error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/service-features/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM service_features WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service feature not found' });
    }
    
    res.json({ message: 'Service feature deleted successfully' });
  } catch (error) {
    console.error('Delete service feature error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// About cards routes - REMOVED (now handled by unified service-cards endpoint)

// Orders search route (for surat jalan dropdown) — orders + custom_requests
app.get('/api/orders/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    const hasQ = q && String(q).trim();
    const searchTerm = hasQ ? `%${String(q).trim()}%` : null;
    const limitEach = 15;

    let orderSql = `
      SELECT id, name, email, phone, address, wedding_date, service_name, total_amount, booking_amount, status, created_at
      FROM orders
    `;
    let orderParams = [];
    if (hasQ) {
      orderSql += ` WHERE 
        name LIKE ? OR 
        email LIKE ? OR 
        phone LIKE ? OR 
        service_name LIKE ? OR
        CAST(id AS CHAR) LIKE ?
      `;
      orderParams = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
    }
    orderSql += ` ORDER BY created_at DESC LIMIT ${limitEach}`;

    let customSql = `
      SELECT id, name, email, phone, wedding_date, services, additional_requests, booking_amount, status, created_at
      FROM custom_requests
    `;
    let customParams = [];
    if (hasQ) {
      customSql += ` WHERE 
        name LIKE ? OR 
        email LIKE ? OR 
        phone LIKE ? OR 
        services LIKE ? OR
        additional_requests LIKE ? OR
        CAST(id AS CHAR) LIKE ?
      `;
      customParams = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
    }
    customSql += ` ORDER BY created_at DESC LIMIT ${limitEach}`;

    const [[orderRows], [customRows]] = await Promise.all([
      db.execute(orderSql, orderParams),
      db.execute(customSql, customParams)
    ]);

    const normalizedOrders = (orderRows || []).map((row) => ({
      ...row,
      order_source: 'order'
    }));

    const normalizedCustom = (customRows || []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.additional_requests || '',
      wedding_date: row.wedding_date,
      service_name: row.services || 'Layanan custom',
      total_amount: row.booking_amount,
      booking_amount: row.booking_amount,
      status: row.status,
      created_at: row.created_at,
      order_source: 'custom_request'
    }));

    const merged = [...normalizedOrders, ...normalizedCustom].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    res.json(merged.slice(0, 25));
  } catch (error) {
    console.error('Orders search error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Surat Jalan routes
app.get('/api/surat-jalan', authenticateToken, async (req, res) => {
  try {
    // Auto-delete surat jalan whose event date has passed (e.g. event Feb 7, on Feb 8 it is deleted)
    const [expiredRows] = await db.execute('SELECT plaminan_image, pintu_masuk_image, dekorasi_image FROM surat_jalan WHERE wedding_date < CURDATE()');
    for (const row of expiredRows) {
      unlinkUploadIfStored(row.plaminan_image);
      unlinkUploadIfStored(row.pintu_masuk_image);
      unlinkUploadIfStored(row.dekorasi_image);
    }
    await db.execute('DELETE FROM surat_jalan WHERE wedding_date < CURDATE()');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search || req.query.q || '').trim();
    
    let countSql = 'SELECT COUNT(*) as total FROM surat_jalan';
    let listSql = 'SELECT * FROM surat_jalan';
    const countParams = [];
    const listParams = [];
    
    if (search) {
      const pattern = `%${search}%`;
      countSql += ' WHERE client_name LIKE ?';
      listSql += ' WHERE client_name LIKE ?';
      countParams.push(pattern);
      listParams.push(pattern);
    }
    
    listSql += ' ORDER BY wedding_date ASC, created_at DESC LIMIT ? OFFSET ?';
    listParams.push(limit, offset);
    
    const [countResult] = await db.execute(countSql, countParams);
    const total = countResult[0].total;
    
    const [suratJalan] = await db.execute(listSql, listParams);
    
    res.json({
      suratJalan,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Surat jalan error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/surat-jalan/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT * FROM surat_jalan WHERE id = ?', [id]);
    const suratJalan = rows[0];
    
    if (!suratJalan) {
      return res.status(404).json({ message: 'Surat jalan not found' });
    }
    
    res.json(suratJalan);
  } catch (error) {
    console.error('Surat jalan detail error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/surat-jalan', authenticateToken, async (req, res) => {
  const { 
    order_id, 
    custom_request_id,
    client_name, 
    client_phone, 
    client_address, 
    wedding_date,
    package_name,
    plaminan_image,
    pintu_masuk_image,
    dekorasi_image,
    warna_kain,
    ukuran_tenda,
    piring,
    nama_pasangan,
    vendor_name,
    maps_link,
    notes
  } = req.body;

  const oid = order_id !== undefined && order_id !== '' && order_id != null
    ? parseInt(order_id, 10)
    : null;
  const crid = custom_request_id !== undefined && custom_request_id !== '' && custom_request_id != null
    ? parseInt(custom_request_id, 10)
    : null;

  if ((!oid || Number.isNaN(oid)) && (!crid || Number.isNaN(crid))) {
    return res.status(400).json({ message: 'Pilih pesanan (biasa atau custom) terlebih dahulu' });
  }
  if (oid && crid) {
    return res.status(400).json({ message: 'Hanya satu jenis pesanan yang boleh dipilih' });
  }
  const finalOrderId = oid && !Number.isNaN(oid) ? oid : null;
  const finalCustomId = crid && !Number.isNaN(crid) ? crid : null;
  
  try {
    const [result] = await db.execute(
      `INSERT INTO surat_jalan (
        order_id, custom_request_id, client_name, client_phone, client_address, wedding_date,
        package_name, plaminan_image, pintu_masuk_image, dekorasi_image,
        warna_kain, ukuran_tenda, piring, nama_pasangan, vendor_name, maps_link, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalOrderId, finalCustomId, client_name, client_phone, client_address, wedding_date,
        package_name, plaminan_image, pintu_masuk_image, dekorasi_image,
        warna_kain, ukuran_tenda, piring, nama_pasangan, vendor_name, maps_link || null, notes
      ]
    );
    res.json({ id: result.insertId, message: 'Surat jalan created successfully' });
  } catch (error) {
    console.error('Create surat jalan error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/surat-jalan/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { 
    client_name, 
    client_phone, 
    client_address, 
    wedding_date,
    package_name,
    plaminan_image,
    pintu_masuk_image,
    dekorasi_image,
    warna_kain,
    ukuran_tenda,
    piring,
    nama_pasangan,
    vendor_name,
    maps_link,
    notes
  } = req.body;
  
  try {
    const [oldRows] = await db.execute('SELECT plaminan_image, pintu_masuk_image, dekorasi_image FROM surat_jalan WHERE id = ?', [id]);
    const old = oldRows[0];
    const [result] = await db.execute(
      `UPDATE surat_jalan SET 
        client_name = ?, client_phone = ?, client_address = ?, wedding_date = ?,
        package_name = ?, plaminan_image = ?, pintu_masuk_image = ?, dekorasi_image = ?,
        warna_kain = ?, ukuran_tenda = ?, piring = ?, nama_pasangan = ?, vendor_name = ?, maps_link = ?, notes = ?
      WHERE id = ?`,
      [
        client_name, client_phone, client_address, wedding_date,
        package_name, plaminan_image, pintu_masuk_image, dekorasi_image,
        warna_kain, ukuran_tenda, piring, nama_pasangan, vendor_name, maps_link || null, notes, id
      ]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Surat jalan not found' });
    }
    if (old) {
      if (old.plaminan_image !== plaminan_image && isStoredFilename(old.plaminan_image)) unlinkUploadIfStored(old.plaminan_image);
      if (old.pintu_masuk_image !== pintu_masuk_image && isStoredFilename(old.pintu_masuk_image)) unlinkUploadIfStored(old.pintu_masuk_image);
      if (old.dekorasi_image !== dekorasi_image && isStoredFilename(old.dekorasi_image)) unlinkUploadIfStored(old.dekorasi_image);
    }
    res.json({ message: 'Surat jalan updated successfully' });
  } catch (error) {
    console.error('Update surat jalan error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/surat-jalan/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT plaminan_image, pintu_masuk_image, dekorasi_image FROM surat_jalan WHERE id = ?', [id]);
    const row = rows[0];
    const [result] = await db.execute('DELETE FROM surat_jalan WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Surat jalan not found' });
    }
    if (row) {
      unlinkUploadIfStored(row.plaminan_image);
      unlinkUploadIfStored(row.pintu_masuk_image);
      unlinkUploadIfStored(row.dekorasi_image);
    }
    res.json({ message: 'Surat jalan deleted successfully' });
  } catch (error) {
    console.error('Delete surat jalan error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Album progress (status album untuk klien)
function normalizePhoneNumber(value) {
  return String(value || '').replace(/\D/g, '');
}

const ALBUM_PROGRESS_STATUSES = new Set(['pending', 'diproses', 'selesai']);

app.get('/api/album-progress', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const q = (req.query.q || '').trim();
    const params = [];
    let where = '';
    if (q) {
      const pattern = `%${q}%`;
      where = ` WHERE (
        CAST(ap.order_id AS CHAR) LIKE ? OR
        COALESCE(o.name, cr.name, '') LIKE ? OR
        COALESCE(o.phone, cr.phone, '') LIKE ? OR
        COALESCE(o.email, cr.email, '') LIKE ?
      )`;
      params.push(pattern, pattern, pattern, pattern);
    }

    const [countRows] = await db.execute(
      `SELECT COUNT(*) as total FROM album_progress ap
       LEFT JOIN orders o ON ap.order_source = 'order' AND ap.order_id = o.id
       LEFT JOIN custom_requests cr ON ap.order_source = 'custom_request' AND ap.order_id = cr.id
       ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await db.execute(
      `SELECT ap.*,
        CASE WHEN ap.order_source = 'order' THEN o.name ELSE cr.name END AS client_name,
        CASE WHEN ap.order_source = 'order' THEN o.phone ELSE cr.phone END AS client_phone,
        CASE WHEN ap.order_source = 'order' THEN o.email ELSE cr.email END AS client_email,
        CASE WHEN ap.order_source = 'order' THEN o.service_name ELSE cr.services END AS service_label,
        CASE WHEN ap.order_source = 'order' THEN DATE_FORMAT(o.wedding_date, '%Y-%m-%d') ELSE DATE_FORMAT(cr.wedding_date, '%Y-%m-%d') END AS wedding_date
       FROM album_progress ap
       LEFT JOIN orders o ON ap.order_source = 'order' AND ap.order_id = o.id
       LEFT JOIN custom_requests cr ON ap.order_source = 'custom_request' AND ap.order_id = cr.id
       ${where}
       ORDER BY ap.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      items: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    console.error('Album progress list error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/album-progress/public/:source/:id', async (req, res) => {
  const rawSource = String(req.params.source || '').trim();
  const orderId = Number(req.params.id);
  const phoneInput = String(req.query.phone || '').trim();

  const orderSource = rawSource === 'custom_request' ? 'custom_request' : rawSource === 'order' ? 'order' : null;
  if (!orderSource) {
    return res.status(400).json({ message: 'Sumber pesanan tidak valid' });
  }
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return res.status(400).json({ message: 'ID pesanan tidak valid' });
  }
  if (!phoneInput) {
    return res.status(400).json({ message: 'Nomor HP wajib diisi' });
  }

  try {
    const table = orderSource === 'order' ? 'orders' : 'custom_requests';
    const [ordRows] = await db.execute(`SELECT phone FROM ${table} WHERE id = ? LIMIT 1`, [orderId]);
    const row = ordRows[0];
    if (!row) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }
    if (normalizePhoneNumber(row.phone) !== normalizePhoneNumber(phoneInput)) {
      return res.status(403).json({ message: 'Nomor HP tidak sesuai dengan pesanan' });
    }

    const [prows] = await db.execute(
      `SELECT id, order_source, order_id, status,
        DATE_FORMAT(estimated_completion, '%Y-%m-%d') AS estimated_completion,
        album_link, created_at, updated_at
       FROM album_progress
       WHERE order_source = ? AND order_id = ?
       LIMIT 1`,
      [orderSource, orderId]
    );
    const progress = prows[0] || null;
    res.json({ progress });
  } catch (error) {
    console.error('Album progress public error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/album-progress', authenticateToken, async (req, res) => {
  const { order_source, order_id, status, estimated_completion, album_link } = req.body || {};
  const src = order_source === 'custom_request' ? 'custom_request' : order_source === 'order' ? 'order' : null;
  const oid = Number(order_id);
  if (!src) {
    return res.status(400).json({ message: 'order_source harus order atau custom_request' });
  }
  if (!Number.isFinite(oid) || oid <= 0) {
    return res.status(400).json({ message: 'order_id tidak valid' });
  }
  const st = String(status || 'pending').trim();
  if (!ALBUM_PROGRESS_STATUSES.has(st)) {
    return res.status(400).json({ message: 'Status tidak valid (pending, diproses, selesai)' });
  }
  let estSql = null;
  if (estimated_completion != null && String(estimated_completion).trim() !== '') {
    const d = String(estimated_completion).trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return res.status(400).json({ message: 'Tanggal estimasi tidak valid' });
    }
    estSql = d;
  }
  const link = album_link != null && String(album_link).trim() ? String(album_link).trim().slice(0, 2048) : null;

  try {
    const [result] = await db.execute(
      `INSERT INTO album_progress (order_source, order_id, status, estimated_completion, album_link)
       VALUES (?, ?, ?, ?, ?)`,
      [src, oid, st, estSql, link]
    );
    res.json({ id: result.insertId, message: 'Progress album disimpan' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Progress album untuk pesanan ini sudah ada; gunakan edit.' });
    }
    console.error('Album progress create error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/album-progress/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'ID tidak valid' });
  }
  const { status, estimated_completion, album_link } = req.body || {};
  const st = String(status || '').trim();
  if (st && !ALBUM_PROGRESS_STATUSES.has(st)) {
    return res.status(400).json({ message: 'Status tidak valid (pending, diproses, selesai)' });
  }
  let estSql = undefined;
  if (estimated_completion === null || estimated_completion === '') {
    estSql = null;
  } else if (estimated_completion != null) {
    const d = String(estimated_completion).trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return res.status(400).json({ message: 'Tanggal estimasi tidak valid' });
    }
    estSql = d;
  }
  let link = undefined;
  if (album_link !== undefined) {
    link = album_link != null && String(album_link).trim() ? String(album_link).trim().slice(0, 2048) : null;
  }

  try {
    const fields = [];
    const vals = [];
    if (st) {
      fields.push('status = ?');
      vals.push(st);
    }
    if (estSql !== undefined) {
      fields.push('estimated_completion = ?');
      vals.push(estSql);
    }
    if (link !== undefined) {
      fields.push('album_link = ?');
      vals.push(link);
    }
    if (fields.length === 0) {
      return res.status(400).json({ message: 'Tidak ada field yang diubah' });
    }
    vals.push(id);
    const [result] = await db.execute(
      `UPDATE album_progress SET ${fields.join(', ')} WHERE id = ?`,
      vals
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Progress album diperbarui' });
  } catch (error) {
    console.error('Album progress update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/album-progress/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'ID tidak valid' });
  }
  try {
    const [result] = await db.execute('DELETE FROM album_progress WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Progress album dihapus' });
  } catch (error) {
    console.error('Album progress delete error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Freelance photographer duty calendar (jadwal foto terjun per pesanan)
function padYmPart(n) {
  return String(n).padStart(2, '0');
}

async function validateOrderExistsForFreelance(orderSource, orderId) {
  const oid = Number(orderId);
  if (!Number.isFinite(oid) || oid <= 0) return false;
  if (orderSource === 'order') {
    const [r] = await db.execute('SELECT id FROM orders WHERE id = ? LIMIT 1', [oid]);
    return r.length > 0;
  }
  if (orderSource === 'custom_request') {
    const [r] = await db.execute('SELECT id FROM custom_requests WHERE id = ? LIMIT 1', [oid]);
    return r.length > 0;
  }
  return false;
}

app.get('/api/freelance-calendar', authenticateToken, async (req, res) => {
  const year = parseInt(req.query.year, 10);
  const month = parseInt(req.query.month, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return res.status(400).json({ message: 'Parameter year dan month (1-12) wajib valid' });
  }
  const ymdStart = `${year}-${padYmPart(month)}-01`;
  const lastDom = new Date(year, month, 0).getDate();
  const ymdEnd = `${year}-${padYmPart(month)}-${padYmPart(lastDom)}`;

  try {
    const [rows] = await db.execute(
      `SELECT fa.id, fa.order_source, fa.order_id, fa.photographer_name,
        DATE_FORMAT(fa.duty_date, '%Y-%m-%d') AS duty_date,
        fa.notes, fa.created_at, fa.updated_at,
        CASE WHEN fa.order_source = 'order' THEN o.name ELSE cr.name END AS client_name,
        CASE WHEN fa.order_source = 'order' THEN o.phone ELSE cr.phone END AS client_phone,
        CASE WHEN fa.order_source = 'order' THEN o.service_name ELSE cr.services END AS service_label,
        CASE WHEN fa.order_source = 'order'
          THEN DATE_FORMAT(o.wedding_date, '%Y-%m-%d')
          ELSE DATE_FORMAT(cr.wedding_date, '%Y-%m-%d') END AS order_wedding_date
       FROM freelance_photographer_assignments fa
       LEFT JOIN orders o ON fa.order_source = 'order' AND fa.order_id = o.id
       LEFT JOIN custom_requests cr ON fa.order_source = 'custom_request' AND fa.order_id = cr.id
       WHERE fa.duty_date >= ? AND fa.duty_date <= ?
       ORDER BY fa.duty_date ASC, fa.id ASC`,
      [ymdStart, ymdEnd]
    );
    res.json({ assignments: rows });
  } catch (error) {
    console.error('Freelance calendar list error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/freelance-calendar', authenticateToken, async (req, res) => {
  const { order_source, order_id, photographer_name, duty_date, notes } = req.body || {};
  const src = order_source === 'custom_request' ? 'custom_request' : order_source === 'order' ? 'order' : null;
  const oid = Number(order_id);
  const pname = String(photographer_name || '').trim();
  const dd = String(duty_date || '').trim().slice(0, 10);

  if (!src) {
    return res.status(400).json({ message: 'order_source harus order atau custom_request' });
  }
  if (!Number.isFinite(oid) || oid <= 0) {
    return res.status(400).json({ message: 'order_id tidak valid' });
  }
  if (!pname) {
    return res.status(400).json({ message: 'Nama fotografer wajib diisi' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dd)) {
    return res.status(400).json({ message: 'Tanggal bertugas tidak valid (YYYY-MM-DD)' });
  }

  try {
    const ok = await validateOrderExistsForFreelance(src, oid);
    if (!ok) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    const [result] = await db.execute(
      `INSERT INTO freelance_photographer_assignments
        (order_source, order_id, photographer_name, duty_date, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [src, oid, pname, dd, notes != null ? String(notes).trim().slice(0, 4000) : null]
    );
    res.json({ id: result.insertId, message: 'Jadwal freelance disimpan' });
  } catch (error) {
    console.error('Freelance calendar create error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/freelance-calendar/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'ID tidak valid' });
  }
  const { photographer_name, duty_date, notes } = req.body || {};

  try {
    const fields = [];
    const vals = [];
    if (photographer_name !== undefined) {
      const p = String(photographer_name || '').trim();
      if (!p) return res.status(400).json({ message: 'Nama fotografer tidak boleh kosong' });
      fields.push('photographer_name = ?');
      vals.push(p);
    }
    if (duty_date !== undefined) {
      const dd = String(duty_date || '').trim().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dd)) {
        return res.status(400).json({ message: 'Tanggal bertugas tidak valid (YYYY-MM-DD)' });
      }
      fields.push('duty_date = ?');
      vals.push(dd);
    }
    if (notes !== undefined) {
      fields.push('notes = ?');
      vals.push(notes != null ? String(notes).trim().slice(0, 4000) : null);
    }
    if (!fields.length) {
      return res.status(400).json({ message: 'Tidak ada field yang diubah' });
    }
    vals.push(id);
    const [result] = await db.execute(
      `UPDATE freelance_photographer_assignments SET ${fields.join(', ')} WHERE id = ?`,
      vals
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Jadwal freelance diperbarui' });
  } catch (error) {
    console.error('Freelance calendar update error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/freelance-calendar/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'ID tidak valid' });
  }
  try {
    const [result] = await db.execute('DELETE FROM freelance_photographer_assignments WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Jadwal freelance dihapus' });
  } catch (error) {
    console.error('Freelance calendar delete error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Contact form
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, address, instagram, consultation_date, message } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO contact_messages (name, email, phone, address, instagram, consultation_date, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, address, instagram, consultation_date, message]
    );
    res.json({ id: result.insertId, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact message error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get contact messages with pagination
app.get('/api/contact-messages', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get total count
    const [countResult] = await db.execute('SELECT COUNT(*) as total FROM contact_messages');
    const total = countResult[0].total;
    
    // Get paginated contact messages
    const [messages] = await db.execute(
      'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Contact messages error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Delete contact message
app.delete('/api/contact-messages/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM contact_messages WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Contact message not found' });
    }
    
    res.json({ message: 'Contact message deleted successfully' });
  } catch (error) {
    console.error('Delete contact message error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Client features routes
// --- Package sales chart ---
app.get('/api/admin/package-sales', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT COALESCE(NULLIF(TRIM(service_name), ''), 'Tanpa nama paket') AS package_name,
              COUNT(*) AS order_count,
              COALESCE(SUM(total_amount), 0) AS total_revenue
       FROM orders
       WHERE status IN ('pending', 'confirmed', 'completed')
       GROUP BY package_name
       ORDER BY order_count DESC, total_revenue DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Package sales error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// --- Financial summary ---
app.get('/api/admin/finance/summary', authenticateToken, async (req, res) => {
  const period = String(req.query.period || 'monthly');
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);

  try {
    const [settingsRows] = await db.execute(
      'SELECT accommodation_cost FROM financial_settings WHERE id = 1 LIMIT 1'
    );
    const accommodationDefault = Number(settingsRows[0]?.accommodation_cost || 0);

    let dateFilterOrders = 'YEAR(created_at) = ?';
    let dateFilterCustom = 'YEAR(created_at) = ?';
    const paramsOrders = [year];
    const paramsCustom = [year];

    if (period === 'monthly') {
      dateFilterOrders += ' AND MONTH(created_at) = ?';
      dateFilterCustom += ' AND MONTH(created_at) = ?';
      paramsOrders.push(month);
      paramsCustom.push(month);
    }

    const [orderIncome] = await db.execute(
      `SELECT COALESCE(SUM(total_amount), 0) AS total
       FROM orders WHERE status IN ('confirmed','completed') AND ${dateFilterOrders}`,
      paramsOrders
    );
    const [customIncome] = await db.execute(
      `SELECT COALESCE(SUM(booking_amount), 0) AS total
       FROM custom_requests WHERE status IN ('confirmed','completed') AND ${dateFilterCustom}`,
      paramsCustom
    );

    const grossIncome =
      Number(orderIncome[0]?.total || 0) + Number(customIncome[0]?.total || 0);

    const [costRows] = await db.execute(
      `SELECT COALESCE(SUM(pci.amount), 0) AS production_total,
              COALESCE(SUM(CASE WHEN ofn.accommodation_applied = 1 THEN 1 ELSE 0 END), 0) AS accommodation_count
       FROM order_financials ofn
       LEFT JOIN production_cost_items pci ON pci.order_financial_id = ofn.id
       LEFT JOIN orders o ON ofn.order_source = 'order' AND ofn.order_id = o.id
       LEFT JOIN custom_requests cr ON ofn.order_source = 'custom_request' AND ofn.order_id = cr.id
       WHERE (
         (ofn.order_source = 'order' AND o.id IS NOT NULL AND ${dateFilterOrders.replace(/created_at/g, 'o.created_at')})
         OR (ofn.order_source = 'custom_request' AND cr.id IS NOT NULL AND ${dateFilterCustom.replace(/created_at/g, 'cr.created_at')})
       )`,
      period === 'monthly' ? [...paramsOrders, ...paramsCustom] : [year, year]
    );

    const productionTotal = Number(costRows[0]?.production_total || 0);
    const accommodationTotal =
      Number(costRows[0]?.accommodation_count || 0) * accommodationDefault;
    const totalExpenses = productionTotal + accommodationTotal;
    const netIncome = grossIncome - totalExpenses;

    res.json({
      success: true,
      data: {
        period,
        year,
        month: period === 'monthly' ? month : null,
        grossIncome,
        productionTotal,
        accommodationTotal,
        accommodationDefault,
        totalExpenses,
        netIncome
      }
    });
  } catch (error) {
    console.error('Finance summary error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/admin/finance/settings', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT accommodation_cost FROM financial_settings WHERE id = 1 LIMIT 1'
    );
    res.json({
      accommodation_cost: Number(rows[0]?.accommodation_cost || 0)
    });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/admin/finance/settings', authenticateToken, async (req, res) => {
  const cost = Number(req.body?.accommodation_cost);
  if (!Number.isFinite(cost) || cost < 0) {
    return res.status(400).json({ message: 'Biaya akomodasi tidak valid' });
  }
  try {
    await db.execute(
      `INSERT INTO financial_settings (id, accommodation_cost) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE accommodation_cost = VALUES(accommodation_cost)`,
      [cost]
    );
    res.json({ message: 'Pengaturan akomodasi disimpan' });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/admin/finance/orders', authenticateToken, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  const q = String(req.query.search || req.query.q || '').trim();

  try {
    const [settingsRows] = await db.execute(
      'SELECT accommodation_cost FROM financial_settings WHERE id = 1 LIMIT 1'
    );
    const accommodationDefault = Number(settingsRows[0]?.accommodation_cost || 0);

    let searchSql = '';
    const searchParams = [];
    if (q) {
      searchSql = ` AND (client_name LIKE ? OR package_name LIKE ?) `;
      const pattern = `%${q}%`;
      searchParams.push(pattern, pattern);
    }

    const unionSql = `
      SELECT 'order' AS order_source, o.id AS order_id, o.name AS client_name,
             o.service_name AS package_name, o.total_amount AS gross_amount,
             o.created_at
      FROM orders o WHERE o.status IN ('confirmed','completed','pending')
      UNION ALL
      SELECT 'custom_request', cr.id, cr.name, cr.services,
             cr.booking_amount, cr.created_at
      FROM custom_requests cr WHERE cr.status IN ('confirmed','completed','pending')
    `;

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM (${unionSql}) AS combined WHERE 1=1 ${searchSql}`,
      searchParams
    );
    const total = countRows[0]?.total || 0;

    const [rows] = await db.execute(
      `SELECT * FROM (${unionSql}) AS combined WHERE 1=1 ${searchSql}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...searchParams, limit, offset]
    );

    const enriched = [];
    for (const row of rows) {
      const [finRows] = await db.execute(
        `SELECT id, accommodation_applied, notes FROM order_financials
         WHERE order_source = ? AND order_id = ? LIMIT 1`,
        [row.order_source, row.order_id]
      );
      const fin = finRows[0];
      let items = [];
      if (fin?.id) {
        const [itemRows] = await db.execute(
          `SELECT id, label, amount, sort_order FROM production_cost_items
           WHERE order_financial_id = ? ORDER BY sort_order ASC, id ASC`,
          [fin.id]
        );
        items = itemRows;
      }
      const productionTotal = items.reduce((s, i) => s + Number(i.amount || 0), 0);
      const accommodationCost = fin?.accommodation_applied ? accommodationDefault : 0;
      enriched.push({
        ...row,
        financial_id: fin?.id || null,
        accommodation_applied: Boolean(fin?.accommodation_applied),
        notes: fin?.notes || '',
        production_items: items,
        production_total: productionTotal,
        accommodation_cost: accommodationCost,
        net_amount: Number(row.gross_amount || 0) - productionTotal - accommodationCost
      });
    }

    res.json({
      success: true,
      data: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    console.error('Finance orders error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/admin/finance/orders', authenticateToken, async (req, res) => {
  const orderSource = parseOrderSource(req.body?.order_source);
  const orderId = Number(req.body?.order_id);
  const accommodationApplied = Boolean(req.body?.accommodation_applied);
  const notes = req.body?.notes != null ? String(req.body.notes) : null;
  const items = Array.isArray(req.body?.production_items) ? req.body.production_items : [];

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return res.status(400).json({ message: 'order_id tidak valid' });
  }

  try {
    const [existing] = await db.execute(
      'SELECT id FROM order_financials WHERE order_source = ? AND order_id = ? LIMIT 1',
      [orderSource, orderId]
    );
    let financialId = existing[0]?.id;
    if (!financialId) {
      const [ins] = await db.execute(
        `INSERT INTO order_financials (order_source, order_id, accommodation_applied, notes)
         VALUES (?, ?, ?, ?)`,
        [orderSource, orderId, accommodationApplied ? 1 : 0, notes]
      );
      financialId = ins.insertId;
    } else {
      await db.execute(
        `UPDATE order_financials SET accommodation_applied = ?, notes = ? WHERE id = ?`,
        [accommodationApplied ? 1 : 0, notes, financialId]
      );
      await db.execute('DELETE FROM production_cost_items WHERE order_financial_id = ?', [financialId]);
    }

    for (let i = 0; i < items.length; i += 1) {
      const label = String(items[i]?.label || '').trim();
      const amount = Number(items[i]?.amount);
      if (!label || !Number.isFinite(amount)) continue;
      await db.execute(
        `INSERT INTO production_cost_items (order_financial_id, label, amount, sort_order)
         VALUES (?, ?, ?, ?)`,
        [financialId, label, amount, i]
      );
    }

    res.json({ message: 'Catatan keuangan disimpan', financial_id: financialId });
  } catch (error) {
    console.error('Finance order upsert error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// --- Vendors ---
app.get('/api/vendors', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM vendors WHERE is_active = 1 ORDER BY name ASC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/vendors/all', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM vendors ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/vendors', authenticateToken, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Nama vendor wajib diisi' });
  try {
    const [result] = await db.execute('INSERT INTO vendors (name) VALUES (?)', [name]);
    res.json({ id: result.insertId, message: 'Vendor ditambahkan' });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/vendors/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const name = String(req.body?.name || '').trim();
  const isActive = req.body?.is_active !== false;
  if (!name) return res.status(400).json({ message: 'Nama vendor wajib diisi' });
  try {
    await db.execute('UPDATE vendors SET name = ?, is_active = ? WHERE id = ?', [
      name, isActive ? 1 : 0, id
    ]);
    res.json({ message: 'Vendor diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/vendors/:id', authenticateToken, async (req, res) => {
  try {
    await db.execute('UPDATE vendors SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Vendor dinonaktifkan' });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/orders/:id/vendor', authenticateToken, async (req, res) => {
  const vendorId = req.body?.vendor_id != null ? Number(req.body.vendor_id) : null;
  try {
    await db.execute('UPDATE orders SET vendor_id = ? WHERE id = ?', [vendorId || null, req.params.id]);
    res.json({ message: 'Vendor pesanan diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/custom-requests/:id/vendor', authenticateToken, async (req, res) => {
  const vendorId = req.body?.vendor_id != null ? Number(req.body.vendor_id) : null;
  try {
    await db.execute('UPDATE custom_requests SET vendor_id = ? WHERE id = ?', [
      vendorId || null, req.params.id
    ]);
    res.json({ message: 'Vendor pesanan diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

// --- Order progress ---
app.get('/api/order-progress', authenticateToken, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
  const offset = (page - 1) * limit;
  const q = String(req.query.q || '').trim();

  try {
    let where = '1=1';
    const params = [];
    if (q) {
      where += ` AND (
        (op.order_source = 'order' AND o.name LIKE ?)
        OR (op.order_source = 'custom_request' AND cr.name LIKE ?)
      )`;
      const pattern = `%${q}%`;
      params.push(pattern, pattern);
    }

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM order_progress op
       LEFT JOIN orders o ON op.order_source = 'order' AND op.order_id = o.id
       LEFT JOIN custom_requests cr ON op.order_source = 'custom_request' AND op.order_id = cr.id
       WHERE ${where}`,
      params
    );

    const [rows] = await db.execute(
      `SELECT op.*,
              CASE WHEN op.order_source = 'order' THEN o.name ELSE cr.name END AS client_name,
              CASE WHEN op.order_source = 'order' THEN o.phone ELSE cr.phone END AS client_phone,
              CASE WHEN op.order_source = 'order' THEN o.wedding_date ELSE cr.wedding_date END AS wedding_date
       FROM order_progress op
       LEFT JOIN orders o ON op.order_source = 'order' AND op.order_id = o.id
       LEFT JOIN custom_requests cr ON op.order_source = 'custom_request' AND op.order_id = cr.id
       WHERE ${where}
       ORDER BY op.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      items: rows,
      pagination: {
        page,
        limit,
        total: countRows[0]?.total || 0,
        totalPages: Math.ceil((countRows[0]?.total || 0) / limit) || 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/order-progress/public/:source/:id', async (req, res) => {
  const source = parseOrderSource(req.params.source);
  const id = Number(req.params.id);
  const phone = String(req.query.phone || '').replace(/\D/g, '');

  if (!Number.isFinite(id) || !phone) {
    return res.status(400).json({ message: 'Parameter tidak valid' });
  }

  try {
    const table = source === 'custom_request' ? 'custom_requests' : 'orders';
    const [orderRows] = await db.execute(
      `SELECT phone FROM ${table} WHERE id = ? LIMIT 1`,
      [id]
    );
    const orderPhone = String(orderRows[0]?.phone || '').replace(/\D/g, '');
    if (!orderRows[0] || orderPhone !== phone) {
      return res.status(403).json({ message: 'Akses ditolak' });
    }

    const [rows] = await db.execute(
      'SELECT * FROM order_progress WHERE order_source = ? AND order_id = ? LIMIT 1',
      [source, id]
    );
    res.json({ progress: rows[0] || null });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/order-progress', authenticateToken, async (req, res) => {
  const orderSource = parseOrderSource(req.body?.order_source);
  const orderId = Number(req.body?.order_id);
  const photoStatus = req.body?.photo_status || 'photo_progress';
  const videoStatus = req.body?.video_status || 'video_progress';

  if (!Number.isFinite(orderId)) {
    return res.status(400).json({ message: 'order_id tidak valid' });
  }
  if (!PHOTO_STATUSES.has(photoStatus) || !VIDEO_STATUSES.has(videoStatus)) {
    return res.status(400).json({ message: 'Status tidak valid' });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO order_progress (order_source, order_id, photo_status, video_status, photo_link, video_link)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        orderSource, orderId, photoStatus, videoStatus,
        req.body?.photo_link || null, req.body?.video_link || null
      ]
    );
    res.json({ id: result.insertId, message: 'Progress pesanan dibuat' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Progress untuk pesanan ini sudah ada' });
    }
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/order-progress/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const fields = [];
  const params = [];

  if (req.body?.photo_status != null) {
    if (!PHOTO_STATUSES.has(req.body.photo_status)) {
      return res.status(400).json({ message: 'Status foto tidak valid' });
    }
    fields.push('photo_status = ?');
    params.push(req.body.photo_status);
  }
  if (req.body?.video_status != null) {
    if (!VIDEO_STATUSES.has(req.body.video_status)) {
      return res.status(400).json({ message: 'Status video tidak valid' });
    }
    fields.push('video_status = ?');
    params.push(req.body.video_status);
  }
  if (req.body?.photo_link !== undefined) {
    fields.push('photo_link = ?');
    params.push(req.body.photo_link || null);
  }
  if (req.body?.video_link !== undefined) {
    fields.push('video_link = ?');
    params.push(req.body.video_link || null);
  }

  if (!fields.length) return res.status(400).json({ message: 'Tidak ada data diperbarui' });

  params.push(id);
  try {
    const [result] = await db.execute(
      `UPDATE order_progress SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Data tidak ditemukan' });
    res.json({ message: 'Progress diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/order-progress/:id', authenticateToken, async (req, res) => {
  try {
    await db.execute('DELETE FROM order_progress WHERE id = ?', [req.params.id]);
    res.json({ message: 'Progress dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

// --- Detail acara ---
app.get('/api/detail-acara', authenticateToken, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  const q = String(req.query.q || '').trim();

  try {
    let where = '1=1';
    const params = [];
    if (q) {
      where += ' AND (client_name LIKE ? OR bride_name LIKE ? OR groom_name LIKE ?)';
      const pattern = `%${q}%`;
      params.push(pattern, pattern, pattern);
    }

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM detail_acara WHERE ${where}`,
      params
    );
    const [rows] = await db.execute(
      `SELECT * FROM detail_acara WHERE ${where} ORDER BY wedding_date DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      items: rows,
      pagination: {
        page,
        limit,
        total: countRows[0]?.total || 0,
        totalPages: Math.ceil((countRows[0]?.total || 0) / limit) || 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/detail-acara/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM detail_acara WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Tidak ditemukan' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/detail-acara', authenticateToken, async (req, res) => {
  const b = req.body || {};
  const orderSource = b.order_source ? parseOrderSource(b.order_source) : null;
  const orderId = b.order_id != null ? Number(b.order_id) : null;

  try {
    if (orderSource && orderId) {
      const [existing] = await db.execute(
        'SELECT id FROM detail_acara WHERE order_source = ? AND order_id = ? LIMIT 1',
        [orderSource, orderId]
      );
      if (existing[0]) {
        return res.status(409).json({ message: 'Detail acara untuk pesanan ini sudah ada', id: existing[0].id });
      }
    }

    const [result] = await db.execute(
      `INSERT INTO detail_acara (
        order_source, order_id, client_name, client_phone, client_address,
        bride_name, groom_name, wedding_date, package_name,
        map1_url, map1_note, map2_url, map2_note, map3_url, map3_note, map4_url, map4_note, notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        orderSource, orderId,
        b.client_name || null, b.client_phone || null, b.client_address || null,
        b.bride_name || null, b.groom_name || null, b.wedding_date || null, b.package_name || null,
        b.map1_url || null, b.map1_note || null,
        b.map2_url || null, b.map2_note || null,
        b.map3_url || null, b.map3_note || null,
        b.map4_url || null, b.map4_note || null,
        b.notes || null
      ]
    );
    res.json({ id: result.insertId, message: 'Detail acara disimpan' });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/detail-acara/:id', authenticateToken, async (req, res) => {
  const b = req.body || {};
  try {
    const [result] = await db.execute(
      `UPDATE detail_acara SET
        client_name = ?, client_phone = ?, client_address = ?,
        bride_name = ?, groom_name = ?, wedding_date = ?, package_name = ?,
        map1_url = ?, map1_note = ?, map2_url = ?, map2_note = ?,
        map3_url = ?, map3_note = ?, map4_url = ?, map4_note = ?, notes = ?
       WHERE id = ?`,
      [
        b.client_name || null, b.client_phone || null, b.client_address || null,
        b.bride_name || null, b.groom_name || null, b.wedding_date || null, b.package_name || null,
        b.map1_url || null, b.map1_note || null,
        b.map2_url || null, b.map2_note || null,
        b.map3_url || null, b.map3_note || null,
        b.map4_url || null, b.map4_note || null,
        b.notes || null,
        req.params.id
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Tidak ditemukan' });
    res.json({ message: 'Detail acara diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/detail-acara/:id', authenticateToken, async (req, res) => {
  try {
    await db.execute('DELETE FROM detail_acara WHERE id = ?', [req.params.id]);
    res.json({ message: 'Detail acara dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/detail-acara/from-order', authenticateToken, async (req, res) => {
  const orderSource = parseOrderSource(req.body?.order_source);
  const orderId = Number(req.body?.order_id);
  if (!Number.isFinite(orderId)) {
    return res.status(400).json({ message: 'order_id tidak valid' });
  }

  try {
    const [existing] = await db.execute(
      'SELECT * FROM detail_acara WHERE order_source = ? AND order_id = ? LIMIT 1',
      [orderSource, orderId]
    );
    if (existing[0]) return res.json(existing[0]);

    if (orderSource === 'order') {
      const [rows] = await db.execute(
        `SELECT name, phone, address, bride_name, groom_name, wedding_date, service_name
         FROM orders WHERE id = ? LIMIT 1`,
        [orderId]
      );
      const o = rows[0];
      if (!o) return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
      const [result] = await db.execute(
        `INSERT INTO detail_acara (order_source, order_id, client_name, client_phone, client_address,
          bride_name, groom_name, wedding_date, package_name)
         VALUES ('order', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, o.name, o.phone, o.address, o.bride_name, o.groom_name, o.wedding_date, o.service_name]
      );
      const [created] = await db.execute('SELECT * FROM detail_acara WHERE id = ?', [result.insertId]);
      return res.json(created[0]);
    }

    const [rows] = await db.execute(
      `SELECT name, phone, bride_name, groom_name, wedding_date, services
       FROM custom_requests WHERE id = ? LIMIT 1`,
      [orderId]
    );
    const c = rows[0];
    if (!c) return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    const [result] = await db.execute(
      `INSERT INTO detail_acara (order_source, order_id, client_name, client_phone,
        bride_name, groom_name, wedding_date, package_name)
       VALUES ('custom_request', ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, c.name, c.phone, c.bride_name, c.groom_name, c.wedding_date, c.services]
    );
    const [created] = await db.execute('SELECT * FROM detail_acara WHERE id = ?', [result.insertId]);
    return res.json(created[0]);
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

// --- Freelancers inhouse ---
app.get('/api/freelancers-inhouse', authenticateToken, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  const q = String(req.query.search || req.query.q || '').trim();

  try {
    let where = 'is_active = 1';
    const params = [];
    if (q) {
      where += ' AND name LIKE ?';
      params.push(`%${q}%`);
    }
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM freelancers_inhouse WHERE ${where}`,
      params
    );
    const [rows] = await db.execute(
      `SELECT * FROM freelancers_inhouse WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: countRows[0]?.total || 0,
        totalPages: Math.ceil((countRows[0]?.total || 0) / limit) || 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/freelancers-inhouse/all', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM freelancers_inhouse ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/freelancers-inhouse', authenticateToken, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const photoPrice = Number(req.body?.photo_price) || 0;
  const videoPrice = Number(req.body?.video_price) || 0;
  if (!name) return res.status(400).json({ message: 'Nama freelance wajib diisi' });
  try {
    const [result] = await db.execute(
      'INSERT INTO freelancers_inhouse (name, photo_price, video_price) VALUES (?, ?, ?)',
      [name, photoPrice, videoPrice]
    );
    res.json({ id: result.insertId, message: 'Freelance ditambahkan' });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/freelancers-inhouse/:id', authenticateToken, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const photoPrice = Number(req.body?.photo_price) || 0;
  const videoPrice = Number(req.body?.video_price) || 0;
  const isActive = req.body?.is_active !== false;
  if (!name) return res.status(400).json({ message: 'Nama freelance wajib diisi' });
  try {
    await db.execute(
      'UPDATE freelancers_inhouse SET name = ?, photo_price = ?, video_price = ?, is_active = ? WHERE id = ?',
      [name, photoPrice, videoPrice, isActive ? 1 : 0, req.params.id]
    );
    res.json({ message: 'Freelance diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/freelancers-inhouse/:id', authenticateToken, async (req, res) => {
  try {
    await db.execute('UPDATE freelancers_inhouse SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Freelance dinonaktifkan' });
  } catch (error) {
    res.status(500).json({ message: 'Database error' });
  }
});

// Reference sources list (public)
app.get('/api/reference-sources', async (req, res) => {
  res.json([
    { value: 'instagram', label: 'Instagram' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'google', label: 'Google / Pencarian' },
    { value: 'teman', label: 'Teman / Kerabat' },
    { value: 'lainnya', label: 'Lainnya' }
  ]);
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});