import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import FeedCard, { type FeedItem } from "@/components/FeedCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: group } = useQuery({
    queryKey: ["group", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("groups").select("*").eq("id", id).single();
      return data;
    },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["group-items", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("item_groups").select("items(id, type, title, summary, source_url, created_at, keywords, item_tags(tags(name)))")
        .eq("group_id", id);
      if (error || !data) return [];
      return data.map((ig: any) => ({
        ...ig.items,
        tags: ig.items?.item_tags?.map((it: any) => it.tags?.name).filter(Boolean) || [],
        group_name: group?.name || null,
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
        <div className="flex items-center gap-2">
          {group?.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />}
          <h1 className="text-lg font-semibold font-mono">{group?.name || "Group"}</h1>
        </div>
      </header>
      <div className="px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-20">No items in this group</p>
        ) : (
          items.map((item, i) => (
            <FeedCard key={item.id} item={item} index={i} onClick={() => navigate(`/item/${item.id}`)} />
          ))
        )}
      </div>
    </div>
  );
}
