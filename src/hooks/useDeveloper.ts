import { useAuth } from "@/contexts/AuthContext";

// Developer email — stealth mode: hidden from CRM, full access
const DEVELOPER_EMAILS = ["dev.goodyhut@gmail.com", "shahriarnabil94@gmail.com"];

export function useDeveloper() {
  const { user, loading: authLoading } = useAuth();
  
  const isDeveloper = !authLoading && !!user?.email && DEVELOPER_EMAILS.includes(user.email);

  return { isDeveloper, loading: authLoading };
}

export const isDeveloperEmail = (email: string | null | undefined) =>
  !!email && DEVELOPER_EMAILS.includes(email);
