-- Add discount column to order_financials
ALTER TABLE order_financials ADD COLUMN discount DECIMAL(12,2) DEFAULT NULL;
