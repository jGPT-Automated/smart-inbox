import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Hash, Loader2 } from "lucide-react";
import FeedCard, { type FeedItem } from "@/components/FeedCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function TagDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: tag } = useQuery({
    queryKey: ["tag", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("tags").select("*").eq("id", id).single();
      return data;
    },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["tag-items", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("item_tags").select("items(id, type, title, summary, source_url, created_at, keywords, item_tags(tags(name)), item_groups(groups(name)))")
        .eq("tag_id", id);
      if (error || !data) return [];
      return data.map((it: any) => ({
        ...it.items,
        tags: it.items?.item_tags?.map((t: any) => t.tags?.name).filter(Boolean) || [],
        group_name: it.items?.item_groups?.[0]?.groups?.name || null,
      })).filter(Boolean) as FeedItem[];
    },
    enabled: !!id,
  });

  return (
    <div className="min-h-screen bottom-nav-safe">
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/organize")} className="p-1 -ml-1">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <Hash className="w-4 h-4 text-primary" />
        <h1 className="text-lg font-semibold font-mono">{tag?.name || "Tag"}</h1>
      </header>
      <div className="px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-20">No items with this tag</p>
        ) : (
          items.map((item, i) => (
            <FeedCard key={item.id} item={item} index={i} onClick={() => navigate(`/item/${item.id}`)} />
          ))
        )}
      </div>
    </div>
  );
}
