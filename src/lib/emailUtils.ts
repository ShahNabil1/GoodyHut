import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://goodyhut.bd";

// Order status to email template slug mapping
const STATUS_TEMPLATE_MAP: Record<string, string> = {
  pending: "order_pending",
  pending_payment: "order_pending",
  auto_saved: "order_pending",
  confirmed: "order_confirmed",
  processing: "order_processing",
  received_at_warehouse: "order_received_warehouse",
  shipped_via_air: "order_shipped_air",
  arrived_in_bd: "order_arrived_bd",
  customs: "order_arrived_bd",
  awaiting_weight: "order_awaiting_weight",
  adjustment_due: "order_adjustment_due",
  at_bd_warehouse: "order_at_bd_warehouse",
  pickup_requested: "order_pickup_requested",
  handed_to_steadfast: "order_handed_steadfast",
  out_for_delivery: "order_out_for_delivery",
  delivered: "order_delivered",
  cancelled: "order_cancelled",
  refunded: "order_refunded",
};

interface SendEmailParams {
  template_slug: string;
  to: string;
  data?: Record<string, string>;
}

export async function sendEmail({ template_slug, to, data = {} }: SendEmailParams): Promise<boolean> {
  try {
    if (!to || !to.includes("@")) return false;

    const { error } = await supabase.functions.invoke("send-email", {
      body: { template_slug, to, data },
    });

    if (error) {
      console.error("sendEmail error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("sendEmail exception:", e);
    return false;
  }
}

// Send order status update email to customer
export async function sendOrderStatusEmail(
  order: {
    id: string;
    user_id: string;
    status: string;
    total_amount: number;
    estimated_cargo_charge?: number | null;
    actual_cargo_charge?: number | null;
    actual_weight_gm?: number | null;
    shipping_adjustment?: number | null;
  },
  orderItems?: { title: string; quantity: number }[]
): Promise<void> {
  const templateSlug = STATUS_TEMPLATE_MAP[order.status];
  if (!templateSlug) return;

  // Get customer profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", order.user_id)
    .maybeSingle();

  if (!profile?.email) return;

  const customerName = profile.full_name || "Customer";
  const shortId = order.id.slice(0, 8).toUpperCase();
  const orderSummary = orderItems
    ? orderItems.map((i) => `${i.title} × ${i.quantity}`).join(", ")
    : "";

  const baseData: Record<string, string> = {
    customer_name: customerName,
    order_id: shortId,
    order_summary: orderSummary,
    total_amount: `৳ ${order.total_amount?.toLocaleString() || "0"}`,
    tracking_url: `${SITE_URL}/track-order/${order.id}`,
    payment_url: `${SITE_URL}/payment/${order.id}`,
    profile_url: `${SITE_URL}/profile`,
    site_url: SITE_URL,
  };

  // Add adjustment-specific data
  if (order.status === "adjustment_due" && order.shipping_adjustment && order.shipping_adjustment > 0) {
    const estWeight = order.actual_weight_gm ? `${order.actual_weight_gm}gm` : "N/A";
    baseData.estimated_weight = `${Math.round((order.estimated_cargo_charge || 0) / 150 * 1000)}gm`;
    baseData.actual_weight = estWeight;
    baseData.old_shipping = `৳ ${(order.estimated_cargo_charge || 0).toLocaleString()}`;
    baseData.new_shipping = `৳ ${(order.actual_cargo_charge || 0).toLocaleString()}`;
    baseData.adjustment_amount = `৳ ${order.shipping_adjustment.toLocaleString()}`;
  }

  await sendEmail({
    template_slug: templateSlug,
    to: profile.email,
    data: baseData,
  });
}

// Send admin notification for new orders
export async function sendAdminOrderNotification(
  order: {
    id: string;
    user_id: string;
    status: string;
    total_amount: number;
  },
  orderItems?: { title: string; quantity: number }[]
): Promise<void> {
  // Only for auto_saved, pending_payment, pending
  if (!["auto_saved", "pending_payment", "pending"].includes(order.status)) return;

  // Get customer info
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", order.user_id)
    .maybeSingle();

  // Get all admin emails
  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (!adminRoles?.length) return;

  const adminIds = adminRoles.map((r) => r.user_id);
  const { data: adminProfiles } = await supabase
    .from("profiles")
    .select("email")
    .in("id", adminIds);

  const adminEmails = adminProfiles?.filter((p) => p.email).map((p) => p.email!) || [];
  if (!adminEmails.length) return;

  const statusLabels: Record<string, string> = {
    auto_saved: "Auto Saved",
    pending_payment: "Pending Payment",
    pending: "Pending",
  };

  const shortId = order.id.slice(0, 8).toUpperCase();
  const orderSummary = orderItems
    ? orderItems.map((i) => `${i.title} × ${i.quantity}`).join(", ")
    : "";
  const itemCount = orderItems?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  const data: Record<string, string> = {
    customer_name: profile?.full_name || "Unknown",
    customer_email: profile?.email || "",
    customer_phone: profile?.phone || "",
    order_id: shortId,
    order_summary: orderSummary,
    item_count: String(itemCount),
    total_amount: `৳ ${order.total_amount?.toLocaleString() || "0"}`,
    order_type: statusLabels[order.status] || order.status,
    admin_order_url: `${SITE_URL}/dev/orders`,
  };

  // Send to all admins
  for (const email of adminEmails) {
    await sendEmail({ template_slug: "admin_new_order", to: email, data });
  }
}

// Send welcome email
export async function sendWelcomeEmail(userId: string): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.email) return;

  await sendEmail({
    template_slug: "welcome",
    to: profile.email,
    data: {
      customer_name: profile.full_name || "User",
      site_url: SITE_URL,
    },
  });
}

// Send review thank you email
export async function sendReviewThankYouEmail(
  userId: string,
  productName: string
): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.email) return;

  await sendEmail({
    template_slug: "review_thank_you",
    to: profile.email,
    data: {
      customer_name: profile.full_name || "User",
      review_product: productName,
      site_url: SITE_URL,
    },
  });
}

// Send adjustment refund email
export async function sendAdjustmentRefundEmail(
  order: {
    id: string;
    user_id: string;
    estimated_cargo_charge?: number | null;
    actual_cargo_charge?: number | null;
    actual_weight_gm?: number | null;
  },
  refundAmount: number
): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", order.user_id)
    .maybeSingle();

  if (!profile?.email) return;

  const shortId = order.id.slice(0, 8).toUpperCase();

  await sendEmail({
    template_slug: "order_adjustment_refund",
    to: profile.email,
    data: {
      customer_name: profile.full_name || "User",
      order_id: shortId,
      estimated_weight: `${Math.round((order.estimated_cargo_charge || 0) / 150 * 1000)}gm`,
      actual_weight: `${order.actual_weight_gm || 0}gm`,
      old_shipping: `৳ ${(order.estimated_cargo_charge || 0).toLocaleString()}`,
      new_shipping: `৳ ${(order.actual_cargo_charge || 0).toLocaleString()}`,
      refund_amount: `৳ ${refundAmount.toLocaleString()}`,
      profile_url: `${SITE_URL}/profile`,
    },
  });
}
