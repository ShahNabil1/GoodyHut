-- Delete all related data first (foreign key dependencies)
DELETE FROM order_status_history;
DELETE FROM order_items;
DELETE FROM orders;