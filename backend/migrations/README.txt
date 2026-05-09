Migrasi database (urutan di run_order.txt)
==========================================

Menambah perubahan tabel baru:
1. Buat file .sql di folder ini (satu topik per file, nama deskriptif).
2. Tambahkan nama file tersebut ke migrations/run_order.txt di posisi yang tepat
   (tabel yang dibutuhkan harus sudah dibuat di migrasi sebelumnya).
3. Jalankan:  cd backend && npm run migrate
   Atau cukup restart server — migrasi juga dijalankan saat startup (initializeDatabase).

Pelacakan: tabel schema_migrations menyimpan nama file yang sudah pernah dijalankan.
File yang sama tidak akan dijalankan ulang.

Catatan: ADD COLUMN IF NOT EXISTS membutuhkan MySQL 8.0.29+ atau MariaDB 10.5.2+.
Variabel lingkungan opsional untuk migrate.js: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME.
