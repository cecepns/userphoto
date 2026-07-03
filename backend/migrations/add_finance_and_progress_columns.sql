-- Add custom accommodation cost to order_financials
ALTER TABLE order_financials ADD COLUMN accommodation_cost DECIMAL(12,2) DEFAULT NULL;

-- Add album progress columns to order_progress
ALTER TABLE order_progress ADD COLUMN album_status ENUM('pending', 'diproses', 'selesai') NOT NULL DEFAULT 'pending';
ALTER TABLE order_progress ADD COLUMN estimated_completion DATE DEFAULT NULL;
ALTER TABLE order_progress ADD COLUMN album_link TEXT DEFAULT NULL;

-- Migrate existing data from album_progress to order_progress
UPDATE order_progress op
JOIN album_progress ap ON op.order_source = ap.order_source AND op.order_id = ap.order_id
SET op.album_status = ap.status,
    op.estimated_completion = ap.estimated_completion,
    op.album_link = ap.album_link;

-- Insert remaining rows from album_progress that don't exist in order_progress
INSERT INTO order_progress (order_source, order_id, photo_status, video_status, album_status, estimated_completion, album_link)
SELECT ap.order_source, ap.order_id, 'photo_progress', 'video_progress', ap.status, ap.estimated_completion, ap.album_link
FROM album_progress ap
LEFT JOIN order_progress op ON op.order_source = ap.order_source AND op.order_id = ap.order_id
WHERE op.id IS NULL;
