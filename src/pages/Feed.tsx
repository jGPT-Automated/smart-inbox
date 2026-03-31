import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import FeedCard, { type FeedItem } from "@/components/FeedCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEMO_ITEMS: FeedItem[] = [
  {
    id: "1",
    type: "github",
    title: "shadcn/ui - Beautifully designed components",
    summary: "A collection of re-usable components built with Radix UI and Tailwind CSS. 45k+ stars, active community.",
    source_url: "https://github.com/shadcn-ui/ui",
    tags: ["react", "ui", "tailwind"],
    group_name: "Dev Tools",
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "2",
    type: "link",
    title: "The Future of AI-Powered Development",
    summary: "An in-depth look at how AI is transforming the way we build software.",
    source_url: "https://example.com/article",
    tags: ["ai", "development"],
    group_name: "Articles",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "3",
    type: "text",
    title: "Meeting notes: Q1 Planning",
    summary: "Key decisions from the planning session.",
    tags: ["notes", "planning"],
    group_name: "Work",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "4",
    type: "file",
    title: "design-system-v2.pdf",
    summary: "Updated design system documentation.",
    tags: ["design", "docs"],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export default function Feed() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["feed-items"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("items")
        .select(`
          id, type, title, summary, source_url, created_at, keywords,
          item_tags(tags(name)),
          item_groups(groups(name))
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !data || data.length === 0) return DEMO_ITEMS;

      return data.map((item: any) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        summary: item.summary,
        source_url: item.source_url,
        created_at: item.created_at,
        keywords: item.keywords,
        tags: item.item_tags?.map((it: any) => it.tags?.name).filter(Boolean) || [],
        group_name: item.item_groups?.[0]?.groups?.name || null,
      })) as FeedItem[];
    },
    retry: false,
  });

  const types = ["link", "github", "text", "file"];
  const filtered = filter ? (items || []).filter((i) => i.type === filter) : items || [];

  return (
    <div className="min-h-screen bottom-nav-safe">
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 py-3">
        <h1 className="text-lg font-semibold font-mono text-gradient">funnel_</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Your knowledge stream</p>
      </header>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-thin">
        <button
          onClick={() => setFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            !filter ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          All
        </button>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t === filter ? null : t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors whitespace-nowrap ${
              filter === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <p className="text-muted-foreground text-sm">No items yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Send something to your Telegram bot to get started</p>
          </motion.div>
        ) : (
          filtered.map((item, i) => (
            <FeedCard key={item.id} item={item} index={i} onClick={() => navigate(`/item/${item.id}`)} />
          ))
        )}
      </div>
    </div>
  );
}
