import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import CartDrawer from "@/components/CartDrawer";
import ScrollToTop from "@/components/ScrollToTop";
import AuthModal from "@/components/AuthModal";
import TrackingHead from "@/components/TrackingHead";
import Index from "./pages/Index";

// Lazy load all non-home pages
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Payment = lazy(() => import("./pages/Payment"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const ReturnsPolicy = lazy(() => import("./pages/ReturnsPolicy"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const TrackOrderByPhone = lazy(() => import("./pages/TrackOrderByPhone"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const CampaignPage = lazy(() => import("./pages/CampaignPage"));
const DealsPage = lazy(() => import("./pages/DealsPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const ShippingInfo = lazy(() => import("./pages/ShippingInfo"));
const CustomsGuide = lazy(() => import("./pages/CustomsGuide"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ProductManagement = lazy(() => import("./pages/admin/ProductManagement"));
const ProductForm = lazy(() => import("./pages/admin/ProductForm"));
const OrderManagement = lazy(() => import("./pages/admin/OrderManagement"));
const CategoryManagement = lazy(() => import("./pages/admin/CategoryManagement"));
const ReviewManagement = lazy(() => import("./pages/admin/ReviewManagement"));
const CRM = lazy(() => import("./pages/admin/CRM"));
const AdminManagement = lazy(() => import("./pages/admin/AdminManagement"));
const BulkSMS = lazy(() => import("./pages/admin/BulkSMS"));
const CampaignManagement = lazy(() => import("./pages/admin/CampaignManagement"));
const DealManagement = lazy(() => import("./pages/admin/DealManagement"));
const WebsiteSettings = lazy(() => import("./pages/admin/WebsiteSettings"));
const BlockedIPs = lazy(() => import("./pages/admin/BlockedIPs"));
const DevLayout = lazy(() => import("./pages/dev/DevLayout"));
const ApiManagement = lazy(() => import("./pages/dev/ApiManagement"));
const EmailTemplates = lazy(() => import("./pages/dev/EmailTemplates"));
const CloudinaryManager = lazy(() => import("./pages/dev/CloudinaryManager"));
const TrackingSettings = lazy(() => import("./pages/dev/TrackingSettings"));
const TrackingAnalytics = lazy(() => import("./pages/dev/TrackingAnalytics"));
const SmsTemplates = lazy(() => import("./pages/dev/SmsTemplates"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <ScrollToTop />
          <TrackingHead />
          <CartDrawer />
          <AuthModal />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/p/:id" element={<ProductDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment/:id" element={<Payment />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/returns-policy" element={<ReturnsPolicy />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/shipping" element={<ShippingInfo />} />
            <Route path="/customs-guide" element={<CustomsGuide />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/track-order" element={<TrackOrderByPhone />} />
            <Route path="/track-order/:id" element={<TrackOrder />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/campaign/:id" element={<CampaignPage />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/search" element={<SearchResults />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<ProductManagement />} />
              <Route path="orders" element={<OrderManagement />} />
              <Route path="categories" element={<CategoryManagement />} />
              <Route path="reviews" element={<ReviewManagement />} />
              <Route path="crm" element={<CRM />} />
              <Route path="users" element={<CRM />} />
              <Route path="management" element={<AdminManagement />} />
              <Route path="bulk-sms" element={<BulkSMS />} />
              <Route path="campaigns" element={<CampaignManagement />} />
              <Route path="deals" element={<DealManagement />} />
              <Route path="website" element={<WebsiteSettings />} />
              <Route path="blocked-ips" element={<BlockedIPs />} />
            </Route>

            {/* Developer Routes — stealth mode */}
            <Route path="/dev" element={<DevLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<ProductManagement />} />
              <Route path="orders" element={<OrderManagement />} />
              <Route path="categories" element={<CategoryManagement />} />
              <Route path="reviews" element={<ReviewManagement />} />
              <Route path="crm" element={<CRM />} />
              <Route path="campaigns" element={<CampaignManagement />} />
              <Route path="deals" element={<DealManagement />} />
              <Route path="website" element={<WebsiteSettings />} />
              <Route path="management" element={<AdminManagement />} />
              <Route path="api-keys" element={<ApiManagement />} />
              <Route path="email-templates" element={<EmailTemplates />} />
              <Route path="cloudinary" element={<CloudinaryManager />} />
              <Route path="tracking" element={<TrackingSettings />} />
              <Route path="tracking-events" element={<TrackingAnalytics />} />
              <Route path="sms-templates" element={<SmsTemplates />} />
            </Route>

            {/* Admin Product Form - fullscreen, outside admin layout */}
            <Route path="/product-form/new" element={<ProductForm />} />
            <Route path="/product-form/edit/:id" element={<ProductForm />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
