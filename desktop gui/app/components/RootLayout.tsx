import { useState } from "react";
import { Outlet, NavLink } from "react-router";
import {
  MessageSquare,
  Image,
  Video,
  Settings,
  Users,
  Database,
  PanelLeftClose,
  PanelLeft,
  Zap,
} from "lucide-react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "../components/ui/sonner";

const navItems = [
  { to: "/", label: "Chat & Reason", icon: MessageSquare, exact: true },
  { to: "/images", label: "Image Studio", icon: Image },
  { to: "/videos", label: "Video Studio", icon: Video },
  { to: "/settings", label: "API Setup", icon: Settings },
  { to: "/admin", label: "Admin", icon: Users },
  { to: "/cache", label: "Local Cache", icon: Database },
];

export function RootLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className="dark h-screen w-screen flex bg-background overflow-hidden relative m-0 p-0">
        {/* Sidebar */}
        <aside
          className={`h-full flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out ${
            collapsed ? "w-[68px]" : "w-[220px]"
          }`}
        >
          {/* Logo */}
          <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold truncate">Grok2API</span>
            )}
          </div>

          {/* Nav Links */}
          <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors duration-150 ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  } ${collapsed ? "justify-center" : ""}`
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Collapse Toggle */}
          <div className="px-2 py-3 shrink-0">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 w-full transition-colors ${
                collapsed ? "justify-center" : ""
              }`}
            >
              {collapsed ? (
                <PanelLeft className="w-[18px] h-[18px]" />
              ) : (
                <>
                  <PanelLeftClose className="w-[18px] h-[18px]" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
