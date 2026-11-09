
INSERT INTO sms_templates (title, slug, message, variables) VALUES
('Order Received - Payment Proof Submitted', 'order_payment_submitted', E'GoodyHut: প্রিয় {name}, আপনার অর্ডার #{order_id} সফলভাবে গ্রহণ করা হয়েছে! পেমেন্ট ভেরিফিকেশন চলছে, শীঘ্রই কনফার্ম করা হবে। ট্র্যাক করুন: {tracking_link}', ARRAY['name','order_id','tracking_link']),
('Order Confirmed', 'order_confirmed', E'GoodyHut: প্রিয় {name}, আপনার অর্ডার #{order_id} কনফার্ম হয়েছে! আমরা আপনার প্রোডাক্ট প্রসেস করছি। ট্র্যাক করুন: {tracking_link}', ARRAY['name','order_id','tracking_link']),
('Order Cancelled', 'order_cancelled', E'GoodyHut: প্রিয় {name}, দুঃখিত! আপনার অর্ডার #{order_id} বাতিল করা হয়েছে। কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন।', ARRAY['name','order_id']),
('Weight Adjustment Due', 'order_adjustment_due', E'GoodyHut: প্রিয় {name}, অর্ডার #{order_id} এর ওজন হিসাব হয়েছে। আনুমানিক ওজন: {estimated_weight}gm, আসল ওজন: {actual_weight}gm। আপনি ৳{paid_amount} পে করেছেন, বাকি ৳{due_amount} পরিশোধ করুন: {payment_link}', ARRAY['name','order_id','estimated_weight','actual_weight','paid_amount','due_amount','payment_link']),
('OTP Verification', 'otp_signup', E'GoodyHut: আপনার OTP কোড হলো {otp}। ৫ মিনিটের মধ্যে ব্যবহার করুন। কাউকে শেয়ার করবেন না।', ARRAY['otp']),
('Password Reset OTP', 'otp_reset', E'GoodyHut: আপনার পাসওয়ার্ড রিসেট OTP হলো {otp}। ৫ মিনিটের মধ্যে ব্যবহার করুন।', ARRAY['otp'])
ON CONFLICT (slug) DO NOTHING;
