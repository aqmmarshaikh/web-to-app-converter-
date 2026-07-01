"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  Hammer,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  X,
  ChevronDown,
  User,
  Shield,
  Bell,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/projects", icon: FolderKanban, label: "Projects" },
  { href: "/dashboard/builds", icon: Hammer, label: "Builds" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-card border-r border-border z-50 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-black" />
            </div>
            <span className="text-lg font-bold tracking-tight">AppForge</span>
          </Link>
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* New Project Button */}
        <div className="p-4">
          <Link href="/dashboard/projects/new">
            <Button className="w-full gap-2" size="sm">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white/5 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {/* Admin link */}
          {profile?.role === "ADMIN" && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                pathname.startsWith("/admin")
                  ? "bg-white/5 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Shield className="h-4 w-4" />
              Admin Panel
            </Link>
          )}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-3">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-white/10 border border-border flex items-center justify-center text-xs font-semibold">
                {profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">{profile?.name || user?.displayName || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
                >
                  <Link href="/dashboard/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors" onClick={() => setUserMenuOpen(false)}>
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <button className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
