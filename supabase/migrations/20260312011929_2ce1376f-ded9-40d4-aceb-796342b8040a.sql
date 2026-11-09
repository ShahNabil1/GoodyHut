-- Add new order status enum values
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'received_at_warehouse';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'shipped_via_air';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'arrived_in_bd';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'at_bd_warehouse';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'handed_to_steadfast';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
