import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setPermissions([]);
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      const admin = !!roleData;
      setIsAdmin(admin);

      if (admin) {
        const { data: permData } = await supabase
          .from("admin_permissions")
          .select("permissions")
          .eq("user_id", user.id)
          .maybeSingle();
        setPermissions(permData?.permissions || []);
      }

      setLoading(false);
    };

    checkAdmin();
  }, [user, authLoading]);

  const hasPermission = (perm: string) => {
    // If no permissions set, admin has full access
    return permissions.length === 0 || permissions.includes(perm);
  };

  return { isAdmin, permissions, hasPermission, loading };
}
