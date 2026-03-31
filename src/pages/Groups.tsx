import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, FolderOpen, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Group = { id: string; name: string; color: string; item_count: number };
type Tag = { id: string; name: string; item_count: number };

const COLORS = [
  "hsl(175, 80%, 50%)", "hsl(210, 80%, 55%)", "hsl(38, 92%, 55%)",
  "hsl(145, 65%, 45%)", "hsl(280, 70%, 55%)", "hsl(0, 72%, 55%)",
];

const DEMO_GROUPS: Group[] = [
  { id: "1", name: "Dev Tools", color: COLORS[0], item_count: 12 },
  { id: "2", name: "Articles", color: COLORS[1], item_count: 8 },
  { id: "3", name: "Work", color: COLORS[2], item_count: 5 },
];

const DEMO_TAGS: Tag[] = [
  { id: "1", name: "react", item_count: 15 },
  { id: "2", name: "ai", item_count: 10 },
  { id: "3", name: "design", item_count: 7 },
];

export default function Groups() {
  const [tab, setTab] = useState<"groups" | "tags">("groups");
  const [newName, setNewName] = useState("");
  const queryClient = useQueryClient();

  const { data: groups = DEMO_GROUPS } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("groups")
        .select("id, name, color, item_groups(count)")
        .order("name");
      if (error || !data?.length) return DEMO_GROUPS;
      return data.map((g: any) => ({
        id: g.id, name: g.name, color: g.color || COLORS[0],
        item_count: g.item_groups?.[0]?.count || 0,
      }));
    },
    retry: false,
  });

  const { data: tags = DEMO_TAGS } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tags")
        .select("id, name, item_tags(count)")
        .order("name");
      if (error || !data?.length) return DEMO_TAGS;
      return data.map((t: any) => ({
        id: t.id, name: t.name, item_count: t.item_tags?.[0]?.count || 0,
      }));
    },
    retry: false,
  });

  const addGroup = useMutation({
    mutationFn: async (name: string) => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const { error } = await (supabase as any).from("groups").insert({ name, color });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["groups"] }); setNewName(""); toast.success("Group created"); },
    onError: () => toast.error("Failed to create group"),
  });

  const addTag = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await (supabase as any).from("tags").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tags"] }); setNewName(""); toast.success("Tag created"); },
    onError: () => toast.error("Failed to create tag"),
  });

  const handleAdd = () => {
    if (!newName.trim()) return;
    if (tab === "groups") addGroup.mutate(newName.trim());
    else addTag.mutate(newName.trim());
  };

  return (
    <div className="min-h-screen bottom-nav-safe">
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 py-3">
        <h1 className="text-lg font-semibold font-mono text-gradient">organize_</h1>
      </header>

      <div className="flex gap-1 px-4 py-3">
        {(["groups", "tags"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}>
            {t === "groups" ? <FolderOpen className="w-4 h-4 inline mr-1.5" /> : <Hash className="w-4 h-4 inline mr-1.5" />}
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-2 px-4 pb-3">
        <Input placeholder={`New ${tab === "groups" ? "group" : "tag"} name...`} value={newName}
          onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="bg-secondary border-border/50 text-sm" />
        <Button size="icon" onClick={handleAdd} className="shrink-0"><Plus className="w-4 h-4" /></Button>
      </div>

      <div className="px-4 space-y-2">
        {tab === "groups"
          ? groups.map((g, i) => (
              <motion.div key={g.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }} className="feed-card flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{g.item_count} items</p>
                </div>
              </motion.div>
            ))
          : tags.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }} className="feed-card flex items-center gap-3">
                <Hash className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.item_count} items</p>
                </div>
              </motion.div>
            ))}
      </div>
    </div>
  );
}
