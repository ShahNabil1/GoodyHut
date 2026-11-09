import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getVariantPrice } from "@/lib/shippingUtils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTracking } from "@/hooks/useTracking";
import { getCatalogContentId } from "@/lib/catalogIds";

const SESSION_KEY = "goodyhut_session";

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  selected_size: string | null;
  product?: {
    id: string;
    title: string;
    price: number;
    emoji: string;
    image_url?: string;
    category_id?: string | null;
    estimated_weight_gm?: number | null;
    shipping_charge_type?: string | null;
    shipping_rate_override?: number | null;
    variants?: any;
  };
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addToCart: (productId: string, size?: string, qty?: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  totalItems: number;
  totalPrice: number;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { trackEvent } = useTracking();
  const sessionId = getSessionId();

  const fetchCart = useCallback(async () => {
    const { data } = await supabase
      .from("cart_items")
      .select(`
        id, 
        product_id, 
        quantity, 
        selected_size, 
        products(
          id, 
          title, 
          price, 
          emoji,
          category_id,
          estimated_weight_gm,
          shipping_charge_type,
          shipping_rate_override,
          variants,
          product_images(image_url)
        )
      `)
      .eq("session_id", sessionId);

    if (data) {
      setItems(
        data.map((d: any) => ({
          id: d.id,
          product_id: d.product_id,
          quantity: d.quantity,
          selected_size: d.selected_size,
          product: d.products ? {
            ...d.products,
            image_url: d.products.product_images?.[0]?.image_url
          } : undefined,
        }))
      );
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Sync user_id to cart items when user logs in
  useEffect(() => {
    if (!user) return;
    supabase
      .from("cart_items")
      .update({ user_id: user.id } as any)
      .eq("session_id", sessionId)
      .is("user_id", null)
      .then(() => {});
  }, [user, sessionId]);

  const addToCart = async (productId: string, size?: string, qty: number = 1) => {
    // Check if item already in cart
    const existing = items.find(
      (i) => i.product_id === productId && i.selected_size === (size || null)
    );
    if (existing) {
      await updateQuantity(existing.id, existing.quantity + qty);
    } else {
      await supabase.from("cart_items").insert({
        session_id: sessionId,
        product_id: productId,
        quantity: qty,
        selected_size: size || null,
        ...(user ? { user_id: user.id } : {}),
      } as any);
      await fetchCart();
    }
    setIsOpen(true);

    // Track add_to_cart — content_ids match catalog feed g:id
    // Fetch fresh product data to ensure we have variants for ID resolution
    const { data: prodRow } = await supabase
      .from("products")
      .select("id, title, price, variants")
      .eq("id", productId)
      .single();

    const variants = prodRow?.variants;
    const catalogContentId = getCatalogContentId(productId, variants, size || null);

    // Resolve the actual price: variant price override → base price, then apply deal discount
    const variantPrice = getVariantPrice(variants, size || null);
    let unitPrice = variantPrice ?? (prodRow?.price || 0);

    // Check for active deal discount
    const now = new Date().toISOString();
    const { data: dealRow } = await supabase
      .from("product_deals")
      .select("discount_percentage")
      .eq("product_id", productId)
      .eq("active", true)
      .lte("start_date", now)
      .gte("end_date", now)
      .limit(1)
      .maybeSingle();

    if (dealRow?.discount_percentage) {
      unitPrice = Math.round(unitPrice * (1 - dealRow.discount_percentage / 100));
    }

    trackEvent("add_to_cart", {
      item_id: productId,
      item_name: prodRow?.title || "",
      quantity: qty,
      selected_size: size || null,
      content_ids: [catalogContentId],
      content_type: "product",
      value: unitPrice * qty,
      currency: "BDT",
      ...(user ? { user_id: user.id } : {}),
    });
  };

  const removeFromCart = async (itemId: string) => {
    await supabase.from("cart_items").delete().eq("id", itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }
    await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
    );
  };

  const totalItems = items.length;
  const totalPrice = items.reduce(
    (s, i) => {
      const vp = getVariantPrice(i.product?.variants, i.selected_size);
      return s + i.quantity * (vp ?? (i.product?.price ?? 0));
    },
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        isOpen,
        setIsOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        totalItems,
        totalPrice,
        refresh: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
