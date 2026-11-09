
-- Remove admin role for developer shahriarnabil94@gmail.com
DELETE FROM public.user_roles WHERE user_id = 'b07c5834-0872-47c1-9bc6-6fd49f4c4b46' AND role = 'admin';
-- Also remove any admin_permissions entry
DELETE FROM public.admin_permissions WHERE user_id = 'b07c5834-0872-47c1-9bc6-6fd49f4c4b46';
