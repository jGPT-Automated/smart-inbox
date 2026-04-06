import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/AuthGuard";
import Feed from "./pages/Feed";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import TagDetail from "./pages/TagDetail";
import Chat from "./pages/Chat";
import ItemDetail from "./pages/ItemDetail";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGuard>
        <div className="max-w-lg mx-auto relative">
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/organize" element={<Groups />} />
            <Route path="/organize/group/:id" element={<GroupDetail />} />
            <Route path="/organize/tag/:id" element={<TagDetail />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
        </AuthGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
