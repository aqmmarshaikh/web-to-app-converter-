"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Hammer,
  ArrowLeft,
  Sparkles,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const adminNav = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/builds", icon: Hammer, label: "Builds" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile && profile.role !== "ADMIN") {
        router.push("/dashboard");
      }
    }
  }, [user, profile, loading, router]);

  if (loading || !user || profile?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-warning" />
              <span className="text-sm font-semibold">Admin Panel</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Admin Navigation */}
        <div className="flex gap-1 p-1 bg-card rounded-lg border border-border mb-8 w-fit">
          {adminNav.map((item) => {
            const isActive = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Content */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
