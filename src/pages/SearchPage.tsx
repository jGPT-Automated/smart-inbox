import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import FeedCard, { type FeedItem } from "@/components/FeedCard";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const q = query.trim();
      const { data, error } = await (supabase as any)
        .from("items")
        .select(`id, type, title, summary, source_url, created_at, keywords, item_tags(tags(name)), item_groups(groups(name))`)
        .or(`title.ilike.%${q}%,summary.ilike.%${q}%,raw_content.ilike.%${q}%`)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error || !data) return [];
      return data.map((item: any) => ({
        id: item.id, type: item.type, title: item.title, summary: item.summary,
        source_url: item.source_url, created_at: item.created_at, keywords: item.keywords,
        tags: item.item_tags?.map((it: any) => it.tags?.name).filter(Boolean) || [],
        group_name: item.item_groups?.[0]?.groups?.name || null,
      })) as FeedItem[];
    },
    enabled: query.trim().length > 0,
    retry: false,
  });

  return (
    <div className="min-h-screen bottom-nav-safe">
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 py-3">
        <h1 className="text-lg font-semibold font-mono text-gradient">search_</h1>
      </header>
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search your funnel..." value={query} onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-secondary border-border/50 text-sm" autoFocus />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      <div className="px-4 space-y-3">
        {!query.trim() ? (
          <p className="text-center text-muted-foreground text-sm py-10">Search by title, content, tags, or keywords</p>
        ) : results.length === 0 && !isLoading ? (
          <p className="text-center text-muted-foreground text-sm py-10">No results found</p>
        ) : (
          results.map((item, i) => (
            <FeedCard key={item.id} item={item} index={i} onClick={() => navigate(`/item/${item.id}`)} />
          ))
        )}
      </div>
    </div>
  );
}
