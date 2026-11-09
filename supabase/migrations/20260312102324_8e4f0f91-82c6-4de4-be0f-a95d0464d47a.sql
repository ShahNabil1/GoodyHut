-- Delete all order-related data while keeping everything else intact
-- Order: child tables first, then parent

DELETE FROM order_status_history;
DELETE FROM order_items;
DELETE FROM wallet_transactions WHERE order_id IS NOT NULL;
DELETE FROM orders;
