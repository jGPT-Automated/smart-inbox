import { motion } from "framer-motion";
import { ExternalLink, FileText, Github, MessageSquare, Tag, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export type FeedItem = {
  id: string;
  type: "link" | "file" | "text" | "github";
  title: string;
  summary?: string;
  source_url?: string;
  tags: string[];
  group_name?: string;
  created_at: string;
  keywords?: string[];
};

const typeConfig = {
  link: { icon: ExternalLink, badge: "type-badge-link", label: "Link" },
  file: { icon: FileText, badge: "type-badge-file", label: "File" },
  text: { icon: MessageSquare, badge: "type-badge-text", label: "Text" },
  github: { icon: Github, badge: "type-badge-github", label: "GitHub" },
};

export default function FeedCard({
  item,
  index,
  onClick,
}: {
  item: FeedItem;
  index: number;
  onClick?: () => void;
}) {
  const config = typeConfig[item.type] || typeConfig.text;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="feed-card cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-lg bg-secondary flex-shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={config.badge}>{config.label}</span>
            {item.group_name && (
              <span className="text-xs text-muted-foreground font-mono">
                {item.group_name}
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-foreground truncate leading-tight">
            {item.title}
          </h3>
          {item.summary && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {item.summary}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
            <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
