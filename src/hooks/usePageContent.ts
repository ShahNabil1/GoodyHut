import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PageContent {
  id: string;
  page_slug: string;
  title: string;
  subtitle: string | null;
  content: Record<string, any>;
  updated_at: string;
}

export function usePageContent(pageSlug: string) {
  return useQuery({
    queryKey: ["page-content", pageSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents" as any)
        .select("*")
        .eq("page_slug", pageSlug)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PageContent | null;
    },
  });
}

export function useAllPageContents() {
  return useQuery({
    queryKey: ["page-contents-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents" as any)
        .select("*")
        .order("page_slug");
      if (error) throw error;
      return (data || []) as unknown as PageContent[];
    },
  });
}

export function useUpdatePageContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title, subtitle, content }: { id: string; title: string; subtitle: string | null; content: Record<string, any> }) => {
      const { error } = await supabase
        .from("page_contents" as any)
        .update({ title, subtitle, content, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-content"] });
      queryClient.invalidateQueries({ queryKey: ["page-contents-all"] });
    },
  });
}
