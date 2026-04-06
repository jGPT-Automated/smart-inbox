import { useLocation, useNavigate } from "react-router-dom";
import { FolderOpen, Rss, Settings } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { path: "/organize", icon: FolderOpen, label: "Organize" },
  { path: "/", icon: Rss, label: "Feed" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === "/chat") return null;

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className="flex items-center gap-1 px-2 py-2 rounded-full border border-border/40"
        style={{
          background: "hsl(220 18% 10% / 0.75)",
          backdropFilter: "blur(24px) saturate(1.5)",
          WebkitBackdropFilter: "blur(24px) saturate(1.5)",
          boxShadow:
            "0 8px 32px -4px hsl(175 80% 50% / 0.12), 0 0 0 1px hsl(220 15% 18% / 0.5), 0 2px 8px 0 rgba(0,0,0,0.4)",
        }}
      >
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-full transition-colors"
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "hsl(175 80% 50% / 0.12)",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <tab.icon
                className={`w-5 h-5 relative z-10 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium relative z-10 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
