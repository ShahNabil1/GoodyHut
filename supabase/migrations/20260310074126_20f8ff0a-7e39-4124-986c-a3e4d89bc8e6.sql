
-- Create page_contents table
CREATE TABLE public.page_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_contents ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Page contents publicly readable"
  ON public.page_contents FOR SELECT TO public
  USING (true);

-- Admin write
CREATE POLICY "Admins can update page contents"
  ON public.page_contents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert page contents"
  ON public.page_contents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete page contents"
  ON public.page_contents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed data
INSERT INTO public.page_contents (page_slug, title, subtitle, content) VALUES

('contact', 'Contact Us', 'Have a question or need help? We''re here for you. Reach out through any of the channels below.', '{
  "methods": [
    {"iconName":"Phone","title":"Phone","detail":"+880 1XXX-XXXXXX","sub":"Sun – Thu, 10AM – 8PM (BST)"},
    {"iconName":"Mail","title":"Email","detail":"support@goodyhut.com","sub":"We reply within 24 hours"},
    {"iconName":"whatsapp","title":"WhatsApp","detail":"+880 1XXX-XXXXXX","sub":"Quick responses via chat"},
    {"iconName":"MapPin","title":"Office","detail":"Bogura, Bangladesh","sub":"By appointment only"}
  ],
  "businessHours": "Sunday – Thursday: 10:00 AM – 8:00 PM (BST) · Friday – Saturday: Closed"
}'::jsonb),

('help', 'Help Center', 'Find answers to commonly asked questions about orders, shipping, payments, and more.', '{
  "sections": [
    {"iconName":"Package","title":"Ordering","faqs":[
      {"q":"How do I place an order?","a":"Browse our products, add items to your cart, and proceed to checkout. You can pay via bKash, Nagad, or bank transfer."},
      {"q":"Is there a minimum order quantity?","a":"Some products have a minimum order quantity which is shown on the product page. Most items can be ordered in any quantity."},
      {"q":"Can I modify my order after placing it?","a":"You can request changes by contacting us within 2 hours of placing your order. After that, the order may already be in processing."},
      {"q":"How do I track my order?","a":"Go to the Track Order page and enter the phone number you used while ordering. You''ll see the status of all your orders."}
    ]},
    {"iconName":"Truck","title":"Shipping & Delivery","faqs":[
      {"q":"How long does delivery take?","a":"Domestic orders typically take 3-7 business days. International shipments from China take 15-30 days depending on the shipping method."},
      {"q":"Do you deliver outside Dhaka?","a":"Yes, we deliver all across Bangladesh. Delivery times may vary for areas outside Dhaka."},
      {"q":"How much is the shipping cost?","a":"Shipping cost depends on the product weight and your location. The exact cost is shown at checkout before you confirm your order."},
      {"q":"What happens if my package is delayed?","a":"If your order is delayed beyond the estimated delivery date, please contact us and we''ll investigate with our logistics partner."}
    ]},
    {"iconName":"CreditCard","title":"Payment","faqs":[
      {"q":"What payment methods do you accept?","a":"We accept bKash, Nagad, and IFIC Bank transfer. You can also make partial payments on select orders."},
      {"q":"Is my payment information secure?","a":"Yes. We never store your payment credentials. All transactions go through secure, verified payment gateways."},
      {"q":"Can I pay in installments?","a":"For qualifying orders, you may be able to make a partial payment upfront and pay the rest on delivery. Check the payment page for options."}
    ]},
    {"iconName":"RotateCcw","title":"Returns & Refunds","faqs":[
      {"q":"What is your return policy?","a":"We accept returns within 3 days of delivery for defective or incorrect items. Please visit our Returns Policy page for full details."},
      {"q":"How do I request a refund?","a":"Contact our support team with your order ID and reason. Approved refunds are processed within 5-7 business days."},
      {"q":"Can I exchange a product?","a":"Exchanges are available for size or color issues on eligible products. Contact us within 3 days of receiving your order."}
    ]},
    {"iconName":"ShieldCheck","title":"Account & Security","faqs":[
      {"q":"How do I create an account?","a":"Click the profile icon and sign up using your phone number. You''ll receive an OTP to verify your account."},
      {"q":"I forgot my password. What do I do?","a":"We use phone-based OTP authentication, so there''s no password to forget. Simply log in with your phone number and verify with the OTP sent to you."},
      {"q":"Is my personal information safe?","a":"Absolutely. We follow strict data protection practices. Your information is never shared with third parties. See our Privacy Policy for details."}
    ]}
  ],
  "ctaTitle": "Still need help?",
  "ctaText": "Can''t find what you''re looking for? Our support team is ready to assist."
}'::jsonb),

('how-it-works', 'How It Works', 'Getting your favorite products from China to your doorstep in Bangladesh — simplified in 5 easy steps.', '{
  "steps": [
    {"iconName":"Search","title":"Browse & Choose","description":"Explore our curated collection of wholesale products imported directly from China. Filter by category, price, or popularity to find exactly what you need."},
    {"iconName":"Package","title":"Place Your Order","description":"Add items to your cart and proceed to checkout. Enter your shipping details and choose your preferred payment method — bKash, Nagad, or bank transfer."},
    {"iconName":"CreditCard","title":"Make Payment","description":"Complete your payment securely. You can pay the full amount upfront or choose partial payment on eligible orders. Upload your payment proof for verification."},
    {"iconName":"Truck","title":"We Ship To You","description":"Once your payment is verified, we process and ship your order. Track your package in real-time using the phone number you ordered with."},
    {"iconName":"CheckCircle","title":"Receive & Enjoy","description":"Your order arrives at your doorstep. Inspect your items and enjoy! If there''s any issue, our support team is here to help within the return window."}
  ]
}'::jsonb),

('shipping', 'Shipping Information', 'Everything you need to know about how we deliver your orders across Bangladesh.', '{
  "zones": [
    {"zone":"Dhaka City","time":"2–4 business days","cost":"৳80–150"},
    {"zone":"Dhaka Suburbs","time":"3–5 business days","cost":"৳100–180"},
    {"zone":"Chittagong Division","time":"4–6 business days","cost":"৳120–200"},
    {"zone":"Other Divisions","time":"5–7 business days","cost":"৳130–250"}
  ],
  "policies": [
    {"iconName":"Package","title":"Order Processing","text":"Orders are processed within 24–48 hours after payment verification. You''ll receive a tracking update once your order is shipped."},
    {"iconName":"Clock","title":"International Shipping","text":"Products imported from China typically take 15–30 days to arrive in Bangladesh, depending on the shipping method (air freight or sea freight)."},
    {"iconName":"AlertCircle","title":"Customs & Duties","text":"All applicable customs duties are included in our product pricing. You won''t be charged any extra fees upon delivery."},
    {"iconName":"CheckCircle","title":"Package Inspection","text":"We carefully inspect and repackage all items at our warehouse before dispatching to ensure quality and safe delivery."}
  ]
}'::jsonb),

('customs-guide', 'Customs Guide', 'Understanding customs duties and the import process for products shipped from China to Bangladesh.', '{
  "guidelines": [
    {"iconName":"FileText","title":"What Are Customs Duties?","text":"Customs duties are taxes imposed by the Bangladesh government on goods imported from other countries. The rate depends on the product category, value, and weight."},
    {"iconName":"CheckCircle","title":"Duties Included in Pricing","text":"At GoodyHut, all customs duties and import taxes are already factored into our product prices. You pay what you see — no hidden charges at delivery."},
    {"iconName":"AlertTriangle","title":"Restricted Items","text":"Certain items are restricted or prohibited from import into Bangladesh. These include weapons, hazardous materials, counterfeit goods, and certain electronics without proper certifications."},
    {"iconName":"Package","title":"Customs Clearance Process","text":"Our logistics team handles the entire customs clearance process. Once your shipment clears customs, it is forwarded to our local warehouse for final dispatch."}
  ],
  "faqs": [
    {"q":"Will I need to pay extra customs fees on delivery?","a":"No. All customs duties are included in the listed price. You won''t be charged anything extra upon delivery."},
    {"q":"How long does customs clearance take?","a":"Customs clearance typically takes 2–5 business days depending on the volume and type of goods. Delays may occur during peak seasons."},
    {"q":"What if my shipment gets stuck in customs?","a":"In rare cases where shipments face delays, our team will proactively communicate with you and work to resolve the issue as quickly as possible."},
    {"q":"Do I need to provide any documents?","a":"No. As a retail customer, you don''t need to provide any import documents. We handle all paperwork on your behalf."},
    {"q":"Are there product weight or value limits?","a":"For personal imports, there are no strict limits. However, bulk commercial orders may require additional documentation which our team can assist with."}
  ]
}'::jsonb),

('about', 'About GoodyHut', 'Your trusted partner for importing quality wholesale products from China to Bangladesh — smarter, faster, and more affordable.', '{
  "story": [
    "GoodyHut was founded with a simple mission — to make international wholesale shopping accessible to everyone in Bangladesh. We noticed how difficult and expensive it was for individuals and small businesses to import products from China, so we built a platform to simplify the entire process.",
    "From sourcing and quality checks to customs clearance and doorstep delivery, we handle everything so you don''t have to. Our growing catalog features thousands of products across dozens of categories, all at prices that make sense.",
    "Based in Bogura, Bangladesh, our dedicated team works around the clock to ensure every order is processed with care and delivered on time. We''re not just an e-commerce platform — we''re your import partner."
  ],
  "stats": [
    {"value":"10,000+","label":"Happy Customers"},
    {"value":"5,000+","label":"Products Delivered"},
    {"value":"50+","label":"Product Categories"},
    {"value":"2+","label":"Years in Business"}
  ],
  "values": [
    {"iconName":"Globe","title":"Direct Import","text":"We source products directly from verified manufacturers in China, cutting out middlemen to bring you the best prices."},
    {"iconName":"ShieldCheck","title":"Quality Assured","text":"Every product is inspected and repackaged at our warehouse before shipping to ensure it meets our quality standards."},
    {"iconName":"Heart","title":"Customer First","text":"From easy ordering to responsive support, everything we do is designed around making your experience seamless."},
    {"iconName":"Sparkles","title":"Transparency","text":"No hidden fees, no surprise charges. Customs duties and shipping costs are included in our listed prices."}
  ],
  "ctaTitle": "Join Thousands of Happy Customers",
  "ctaText": "Start shopping today and experience hassle-free importing."
}'::jsonb),

('returns-policy', 'Returns & Refund Policy', NULL, '{
  "sections": [
    {"title":"1. Return Policy","content":"You can request a return for any product purchased from GoodyHut within 3 days of delivery. The product must be unused and in its original packaging."},
    {"title":"2. Refund Eligibility","content":"","items":["Wrong product delivered","Product damaged during delivery","Product quality does not match the description","Product is defective"]},
    {"title":"3. Refund Process","content":"Once a return is approved, the refund will be processed to your payment method (bKash/Nagad/Bank) within 5–7 business days."},
    {"title":"4. Non-Returnable Products","content":"","items":["Used or damaged products (buyer''s fault)","Custom order products","Requests made more than 3 days after delivery"]},
    {"title":"5. Contact Us","content":"For any return or refund related issues, please contact our customer service. We are available 24/7 to assist you."}
  ]
}'::jsonb),

('terms', 'Terms of Service', NULL, '{
  "lastUpdated": "March 8, 2026",
  "sections": [
    {"title":"1. Acceptance of Terms","content":"By accessing or using GoodyHut (\"the Platform\"), you agree to be bound by these Terms of Service. GoodyHut is a cross-border import platform based in Bangladesh, facilitating wholesale product purchases from China. If you do not agree to these terms, please do not use our services."},
    {"title":"2. Services Overview","content":"GoodyHut provides:","items":["A marketplace for browsing and purchasing wholesale products from Chinese suppliers","Cross-border shipping and logistics from China to Bangladesh","Order tracking and delivery coordination","Product categories including Electronics, Fashion, Gadgets, and Home & Living","Payment processing via bKash, Nagad, Rocket, Visa, and Mastercard"]},
    {"title":"3. Account Registration","content":"You may create an account using your email or Google Sign-In. You are responsible for:","items":["Providing accurate and complete registration information","Maintaining the confidentiality of your account credentials","All activities that occur under your account","Notifying us immediately of any unauthorized access"]},
    {"title":"4. Orders and Payments","content":"","items":["All prices are displayed in Bangladeshi Taka (৳ BDT)","Prices include product cost and may not include shipping, customs duties, or import taxes","Payment must be completed at the time of order through accepted methods (bKash, Nagad, Rocket, Visa, Mastercard)","We reserve the right to cancel orders if products become unavailable or pricing errors occur","Order confirmation does not guarantee availability; confirmation is final upon shipment"]},
    {"title":"5. Shipping and Delivery","content":"","items":["Products ship from China to Bangladesh, typical delivery takes 15–30 business days","Delivery times are estimates and may vary due to customs processing","You are responsible for providing a valid shipping address within Bangladesh","Risk of loss transfers to you upon delivery to the shipping carrier"]},
    {"title":"6. Import Duties and Customs","content":"As a cross-border import platform:","items":["Import duties and taxes may apply as per Bangladesh Customs regulations","The buyer is responsible for any applicable customs duties and import taxes","GoodyHut will provide guidance on estimated customs charges but cannot guarantee exact amounts","Delays due to customs processing are beyond our control"]},
    {"title":"7. Returns and Refunds","content":"","items":["Returns are accepted within 7 days of delivery for defective or incorrect items","Products must be unused and in original packaging for return eligibility","Return shipping costs may be the responsibility of the buyer","Refunds are processed to the original payment method within 7–14 business days","Buyer Protection covers eligible claims for items not received or significantly not as described"]},
    {"title":"8. Product Information","content":"We strive to display accurate product information including descriptions, images, and pricing. However:","items":["Colors may vary slightly due to screen differences","Product sizes and specifications are provided by suppliers and may have minor variations","We do not manufacture products and rely on supplier-provided information"]},
    {"title":"9. Prohibited Activities","content":"You agree not to:","items":["Use the platform for any illegal purpose","Attempt to gain unauthorized access to our systems","Submit false or misleading information","Resell products in violation of applicable laws","Interfere with the platform''s operation"]},
    {"title":"10. Limitation of Liability","content":"GoodyHut acts as an intermediary between Chinese suppliers and Bangladeshi buyers. We are not liable for:","items":["Product quality issues beyond our Buyer Protection guarantee","Delays caused by customs or shipping carriers","Changes in import regulations or duties","Indirect, incidental, or consequential damages"]},
    {"title":"11. Governing Law","content":"These Terms are governed by the laws of the People''s Republic of Bangladesh. Any disputes shall be resolved through the courts of Dhaka, Bangladesh."},
    {"title":"12. Changes to Terms","content":"We may update these Terms at any time. Continued use of the platform after changes constitutes acceptance. We will notify users of significant changes via email or platform notification."},
    {"title":"13. Contact Us","content":"For questions about these Terms, contact us at:\n\nGoodyHut\nEmail: support@goodyhut.com\nBangladesh"}
  ]
}'::jsonb),

('privacy', 'Privacy Policy', NULL, '{
  "lastUpdated": "March 8, 2026",
  "sections": [
    {"title":"1. Introduction","content":"GoodyHut (\"we,\" \"our,\" or \"us\") operates goodyHut.com, Bangladesh''s trusted cross-border import platform for wholesale products from China. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services."},
    {"title":"2. Information We Collect","content":"","subsections":[
      {"title":"Personal Information","items":["Name, email address, and phone number","Shipping and billing address in Bangladesh","Payment information (bKash, Nagad, Rocket, Visa, Mastercard details)","Order history and product preferences","Google account information (if you sign in with Google)"]},
      {"title":"Automatically Collected Information","items":["Device type, browser type, and operating system","IP address and approximate location","Pages visited, time spent, and browsing patterns","Cookies and similar tracking technologies"]}
    ]},
    {"title":"3. How We Use Your Information","content":"","items":["Process and fulfill your cross-border import orders","Facilitate payments through bKash, Nagad, Rocket, Visa, and Mastercard","Provide order tracking and shipping updates from China to Bangladesh","Communicate about customs clearance and import duty information","Improve our product recommendations and platform experience","Send promotional offers and deals (with your consent)","Authenticate your identity via Google Sign-In","Prevent fraud and ensure platform security"]},
    {"title":"4. Google OAuth & Third-Party Authentication","content":"When you sign in using Google, we receive your name, email address, and profile picture from your Google account. We use this information solely for account creation and authentication purposes. We do not access your Google contacts, emails, or any other Google services data. You can revoke GoodyHut''s access to your Google account at any time through your Google Account settings."},
    {"title":"5. Information Sharing","content":"We may share your information with:","items":["Shipping partners: To deliver products from China to your address in Bangladesh","Payment processors: bKash, Nagad, Rocket, and card payment gateways for transaction processing","Customs authorities: As required for import clearance into Bangladesh","Service providers: Who help us operate our platform (hosting, analytics, customer support)"],"extraText":"We do not sell your personal information to third parties."},
    {"title":"6. Data Security","content":"We implement SSL encryption, secure payment processing, and buyer protection measures to safeguard your data. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security."},
    {"title":"7. Cookies","content":"We use cookies to maintain your session, remember your cart, and improve your browsing experience. You can control cookie settings through your browser preferences."},
    {"title":"8. Your Rights","content":"","items":["Access and review your personal data","Request correction of inaccurate information","Request deletion of your account and data","Opt out of marketing communications","Withdraw consent for data processing"]},
    {"title":"9. Contact Us","content":"For privacy-related inquiries, contact us at:\n\nGoodyHut\nEmail: privacy@goodyhut.com\nBangladesh"}
  ]
}'::jsonb);
