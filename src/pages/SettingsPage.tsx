import { useState } from "react";
import { Bot, Flame, Zap, Plus, Trash2, Eye, EyeOff, Key, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CREDENTIAL_TYPES = [
  { value: "telegram_bot", label: "Telegram Bot Token", icon: Bot, color: "info" },
  { value: "openai", label: "OpenAI API Key", icon: Key, color: "success" },
  { value: "gemini", label: "Gemini API Key", icon: Zap, color: "primary" },
  { value: "openrouter", label: "OpenRouter API Key", icon: Key, color: "warning" },
  { value: "groq", label: "Groq API Key", icon: Zap, color: "accent" },
];

type Credential = { id: string; label: string; credential_type: string; encrypted_value: string; created_at: string };

export default function SettingsPage() {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("telegram_bot");
  const [newValue, setNewValue] = useState("");
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: creds = [] } = useQuery({
    queryKey: ["credentials"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_credentials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data as Credential[];
    },
    retry: false,
  });

  const addCred = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("user_credentials").insert({
        label: newLabel.trim(), credential_type: newType, encrypted_value: newValue.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      setAdding(false); setNewLabel(""); setNewValue(""); toast.success("Credential saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const deleteCred = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("user_credentials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["credentials"] }); toast.success("Deleted"); },
    onError: () => toast.error("Failed to delete"),
  });

  const toggleVisible = (id: string) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const maskValue = (val: string) => val.slice(0, 6) + "•".repeat(Math.max(0, val.length - 10)) + val.slice(-4);

  return (
    <div className="min-h-screen bottom-nav-safe">
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 py-3">
        <h1 className="text-lg font-semibold font-mono text-gradient">settings_</h1>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Info cards */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="feed-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-info/15"><Bot className="w-5 h-5 text-info" /></div>
            <div>
              <h3 className="text-sm font-medium">Telegram Bot</h3>
              <p className="text-xs text-muted-foreground">Send content to your bot to capture it</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="feed-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-warning/15"><Flame className="w-5 h-5 text-warning" /></div>
            <div>
              <h3 className="text-sm font-medium">Firecrawl</h3>
              <p className="text-xs text-muted-foreground">Extracts content from links automatically</p>
            </div>
          </div>
        </motion.div>

        {/* Credentials section */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold font-mono text-muted-foreground">API Keys & Tokens</h2>
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)} className="text-xs">
              <Plus className="w-3 h-3 mr-1" />Add
            </Button>
          </div>

          {adding && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="feed-card space-y-3 mb-3">
              <div className="flex flex-wrap gap-1.5">
                {CREDENTIAL_TYPES.map((ct) => (
                  <button key={ct.value} onClick={() => setNewType(ct.value)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                      newType === ct.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}>
                    {ct.label}
                  </button>
                ))}
              </div>
              <Input placeholder="Label (e.g. 'My main bot')" value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)} className="bg-secondary border-border/50 text-sm" />
              <Input placeholder="Paste your key / token..." value={newValue} type="password"
                onChange={(e) => setNewValue(e.target.value)} className="bg-secondary border-border/50 text-sm font-mono" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addCred.mutate()} disabled={!newValue.trim()} className="text-xs">Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="text-xs">Cancel</Button>
              </div>
            </motion.div>
          )}

          {creds.length === 0 && !adding ? (
            <p className="text-xs text-muted-foreground text-center py-6">No credentials saved yet</p>
          ) : (
            creds.map((c, i) => {
              const ct = CREDENTIAL_TYPES.find((t) => t.value === c.credential_type);
              const Icon = ct?.icon || Key;
              const visible = visibleIds.has(c.id);
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }} className="feed-card flex items-center gap-3 mb-2">
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.label || ct?.label || c.credential_type}</p>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">
                      {visible ? c.encrypted_value : maskValue(c.encrypted_value)}
                    </p>
                  </div>
                  <button onClick={() => toggleVisible(c.id)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    {visible ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => deleteCred.mutate(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="pt-6 border-t border-border/30">
          <Button
            variant="outline"
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
