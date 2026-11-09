-- Allow admins to delete orders and related data
CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete order items" ON public.order_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete order history" ON public.order_status_history FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));