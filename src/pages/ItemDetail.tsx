import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Tag, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: item } = useQuery({
    queryKey: ["item", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("items")
        .select(`*, item_tags(tags(id, name)), item_groups(groups(id, name, color))`)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
    retry: false,
  });

  return (
    <div className="min-h-screen bottom-nav-safe">
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-sm font-medium truncate">{item?.title || "Loading..."}</h1>
      </header>

      {item && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className={`type-badge-${item.type}`}>{item.type}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </span>
            {item.source_url && (
              <a href={item.source_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-primary hover:underline">
                <ExternalLink className="w-3 h-3" />Source
              </a>
            )}
          </div>
          <h2 className="text-xl font-semibold leading-tight">{item.title}</h2>
          {item.item_groups?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {item.item_groups.map((ig: any) => (
                <span key={ig.groups.id} className="flex items-center gap-1.5 text-xs font-medium bg-secondary px-2.5 py-1 rounded-full">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ig.groups.color }} />
                  {ig.groups.name}
                </span>
              ))}
            </div>
          )}
          {item.item_tags?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {item.item_tags.map((it: any) => (
                <span key={it.tags.id} className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                  <Tag className="w-2.5 h-2.5" />{it.tags.name}
                </span>
              ))}
            </div>
          )}
          {item.summary && (
            <div className="bg-secondary/50 rounded-xl p-4">
              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Summary</h3>
              <p className="text-sm text-foreground/90 leading-relaxed">{item.summary}</p>
            </div>
          )}
          {item.extracted_content && (
            <div className="bg-secondary/30 rounded-xl p-4">
              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Extracted Content</h3>
              <div className="prose prose-sm prose-invert max-w-none text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.extracted_content}</ReactMarkdown>
              </div>
            </div>
          )}
          {item.keywords?.length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Keywords</h3>
              <div className="flex gap-1.5 flex-wrap">
                {item.keywords.map((kw: string) => (
                  <span key={kw} className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">{kw}</span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
