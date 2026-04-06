import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, X, MessageCircle, Plus, Sparkles } from "lucide-react";
import FeedCard, { type FeedItem } from "@/components/FeedCard";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import useDebounce from "@/hooks/use-debounce";

const DEMO_ITEMS: FeedItem[] = [
  {
    id: "1", type: "github", title: "shadcn/ui - Beautifully designed components",
    summary: "A collection of re-usable components built with Radix UI and Tailwind CSS. 45k+ stars, active community.",
    source_url: "https://github.com/shadcn-ui/ui", tags: ["react", "ui", "tailwind"],
    group_name: "Dev Tools", created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "2", type: "link", title: "The Future of AI-Powered Development",
    summary: "An in-depth look at how AI is transforming the way we build software.",
    source_url: "https://example.com/article", tags: ["ai", "development"],
    group_name: "Articles", created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "3", type: "text", title: "Meeting notes: Q1 Planning",
    summary: "Key decisions from the planning session.", tags: ["notes", "planning"],
    group_name: "Work", created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "4", type: "file", title: "design-system-v2.pdf",
    summary: "Updated design system documentation.", tags: ["design", "docs"],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export default function Feed() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  // Full feed
  const { data: allItems, isLoading } = useQuery({
    queryKey: ["feed-items"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("items")
        .select(`id, type, title, summary, source_url, created_at, keywords,
          item_tags(tags(name)), item_groups(groups(name))`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error || !data || data.length === 0) return DEMO_ITEMS;
      return data.map((item: any) => ({
        id: item.id, type: item.type, title: item.title, summary: item.summary,
        source_url: item.source_url, created_at: item.created_at, keywords: item.keywords,
        tags: item.item_tags?.map((it: any) => it.tags?.name).filter(Boolean) || [],
        group_name: item.item_groups?.[0]?.groups?.name || null,
      })) as FeedItem[];
    },
    retry: false,
  });

  // Server-side search for longer queries (semantic-ish)
  const { data: serverResults } = useQuery({
    queryKey: ["feed-search", debouncedQuery],
    queryFn: async () => {
      const q = debouncedQuery.trim();
      const { data, error } = await (supabase as any)
        .from("items")
        .select(`id, type, title, summary, source_url, created_at, keywords,
          item_tags(tags(name)), item_groups(groups(name))`)
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
    enabled: debouncedQuery.trim().length >= 3,
    retry: false,
  });

  const items = allItems || [];

  // Hybrid filtering: instant client-side for short queries, server for longer
  const filtered = useMemo(() => {
    let base = items;
    const q = query.trim().toLowerCase();

    if (q.length > 0 && q.length < 3) {
      // Literal client-side filter
      base = base.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.summary?.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)) ||
          i.group_name?.toLowerCase().includes(q) ||
          i.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    } else if (q.length >= 3 && serverResults) {
      base = serverResults;
    }

    if (filter) base = base.filter((i) => i.type === filter);
    return base;
  }, [items, query, filter, serverResults]);

  const types = ["link", "github", "text", "file"];
  const isSearching = query.trim().length > 0;

  return (
    <div className="min-h-screen bottom-nav-safe">
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 py-3">
        <h1 className="text-lg font-semibold font-mono text-gradient">funnel_</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Your knowledge stream</p>
      </header>

      {/* Integrated search */}
      <div className="px-4 pt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your funnel..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10 bg-secondary border-border/50 text-sm"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        {isSearching && query.trim().length >= 3 && (
          <div className="flex items-center gap-1.5 mt-1.5 px-1">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-muted-foreground">Deep searching content, keywords & tags</span>
          </div>
        )}
      </div>

      {/* Type filters */}
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
          <button key={t} onClick={() => setFilter(t === filter ? null : t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors whitespace-nowrap ${
              filter === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="px-4 space-y-3 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <p className="text-muted-foreground text-sm">
              {isSearching ? "No results found" : "No items yet"}
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              {isSearching ? "Try a different search term" : "Send something to your Telegram bot to get started"}
            </p>
          </motion.div>
        ) : (
          filtered.map((item, i) => (
            <FeedCard key={item.id} item={item} index={i} onClick={() => navigate(`/item/${item.id}`)} />
          ))
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col-reverse items-end gap-2">
        <AnimatePresence>
          {fabOpen && (
            <>
              <motion.button
                key="chat"
                initial={{ opacity: 0, scale: 0.5, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 10 }}
                onClick={() => { setFabOpen(false); navigate("/chat"); }}
                className="w-12 h-12 rounded-full bg-info text-primary-foreground flex items-center justify-center shadow-lg glow-sm"
              >
                <MessageCircle className="w-5 h-5" />
              </motion.button>
            </>
          )}
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setFabOpen(!fabOpen)}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg glow"
        >
          <motion.div animate={{ rotate: fabOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus className="w-6 h-6" />
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
}
