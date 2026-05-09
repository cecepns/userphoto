# Wedding Organizer Website

A comprehensive wedding organizer website built with React, Express.js, and MySQL database.

## Features

### Frontend
- Beautiful animated landing page with wedding theme
- Service browsing and booking system
- Gallery, about, and articles sections
- Custom service request functionality
- Responsive design with Tailwind CSS
- SEO optimization with React Helmet

### Admin Dashboard
- Secure admin authentication
- Service management with customizable items and pricing
- Order management and status tracking
- Payment method configuration (bank accounts, QRIS, e-wallets)
- Article/blog management
- Custom request management

### Backend
- Express.js REST API
- MySQL database with comprehensive schema
- JWT authentication for admin routes
- CORS enabled for frontend communication

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server
- npm or yarn

### Database Setup
1. Install MySQL Server on your system
2. Create a MySQL user and database
3. Update the database configuration in `backend/server.js`:
   ```javascript
   const dbConfig = {
     host: 'localhost',
     user: 'your_mysql_username',
     password: 'your_mysql_password',
     database: 'wedding_organizer',
     // ... other config
   };
   ```

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the backend server:
   ```bash
   npm run server
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```

### Default Admin Credentials
- Email: admin@weddingbliss.com
- Password: admin123

## Database Schema

The MySQL database includes the following tables:
- `admins` - Admin user authentication
- `services` - Main wedding services
- `service_items` - Individual items within each service
- `payment_methods` - Payment options (bank, QRIS, e-wallet)
- `orders` - Customer orders and bookings
- `custom_requests` - Custom service requests from users
- `articles` - Blog articles and wedding tips
- `contact_messages` - Contact form submissions

## API Endpoints

### Public Endpoints
- `GET /api/services` - Get all services
- `GET /api/services/:id/items` - Get service items
- `POST /api/orders` - Create new order
- `POST /api/custom-requests` - Submit custom request
- `GET /api/articles` - Get all articles
- `GET /api/articles/:id` - Get specific article
- `POST /api/contact` - Submit contact form

### Admin Endpoints (Requires Authentication)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/stats` - Dashboard statistics
- `POST/PUT/DELETE /api/services` - Manage services
- `POST/PUT/DELETE /api/service-items` - Manage service items
- `POST/PUT/DELETE /api/payment-methods` - Manage payment methods
- `GET /api/orders` - View all orders
- `PUT /api/orders/:id/status` - Update order status
- `POST/PUT/DELETE /api/articles` - Manage articles

## Technologies Used

### Frontend
- React 18
- React Router DOM
- React Helmet Async
- Tailwind CSS
- Vite

### Backend
- Express.js
- MySQL2
- bcryptjs
- jsonwebtoken
- cors

## Project Structure
```
├── src/
│   ├── components/          # Reusable components
│   ├── pages/              # Page components
│   │   └── admin/          # Admin dashboard pages
│   ├── App.jsx             # Main app component
│   └── main.jsx            # Entry point
├── backend/
│   ├── server.js           # Express server
│   └── schema.sql          # MySQL database schema
└── package.json
```

## License
This project is licensed under the MIT License.