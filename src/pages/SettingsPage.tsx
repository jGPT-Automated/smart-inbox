import { Bot, Flame, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bottom-nav-safe">
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 py-3">
        <h1 className="text-lg font-semibold font-mono text-gradient">settings_</h1>
      </header>

      <div className="px-4 py-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="feed-card"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-info/15">
              <Bot className="w-5 h-5 text-info" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Telegram Bot</h3>
              <p className="text-xs text-muted-foreground">Send content to your bot to capture it</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Connect your Telegram bot via the Lovable connectors panel. Once connected, send any message, link, or file to your bot and it'll appear in your feed.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="feed-card"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-warning/15">
              <Flame className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="text-sm font-medium">Firecrawl</h3>
              <p className="text-xs text-muted-foreground">Extracts content from links automatically</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            When you send a link, Firecrawl scrapes the page content, extracts the main text, and stores it for search. GitHub repos get special treatment with tree extraction.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="feed-card"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/15">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium">AI Processing</h3>
              <p className="text-xs text-muted-foreground">Auto-categorizes and extracts keywords</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Every item you capture is analyzed by AI to extract keywords, suggest tags and groups, and generate summaries. This powers the intelligent search.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
