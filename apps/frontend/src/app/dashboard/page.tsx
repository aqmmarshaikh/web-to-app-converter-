"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FolderKanban,
  Hammer,
  CheckCircle,
  XCircle,
  ArrowRight,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

const fadeUp: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function DashboardOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardStats().then((res) => {
      if (res.success) setStats(res.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      icon: FolderKanban,
      label: "Total Projects",
      value: stats?.totalProjects || 0,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      icon: Hammer,
      label: "Total Builds",
      value: stats?.totalBuilds || 0,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      icon: CheckCircle,
      label: "Successful Builds",
      value: stats?.successfulBuilds || 0,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      icon: XCircle,
      label: "Failed Builds",
      value: stats?.failedBuilds || 0,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  const statusVariant = (status: string) => {
    switch (status) {
      case "COMPLETED": return "success";
      case "FAILED": return "destructive";
      case "BUILDING":
      case "PREPARING":
      case "SIGNING": return "info";
      default: return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 skeleton rounded-xl" />
          ))}
        </div>
        <div className="h-64 skeleton rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back! Here&apos;s an overview of your projects.
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((stat, i) => (
          <motion.div key={i} variants={fadeUp}>
            <Card className="hover:border-white/10 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Builds + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Builds */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Builds</CardTitle>
            <Link href="/dashboard/builds">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentBuilds?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentBuilds.map((build: any) => (
                  <div
                    key={build.id}
                    className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-white/5 border border-border flex items-center justify-center flex-shrink-0">
                        <Hammer className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {build.project?.name || "Unknown Project"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(build.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusVariant(build.status) as any} className="text-[10px]">
                        {build.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{build.buildType}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Hammer className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No builds yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a project to start building
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/projects/new" className="block">
              <Button variant="outline" className="w-full justify-start gap-3" size="sm">
                <Plus className="h-4 w-4" />
                Create New Project
              </Button>
            </Link>
            <Link href="/dashboard/projects" className="block">
              <Button variant="outline" className="w-full justify-start gap-3" size="sm">
                <FolderKanban className="h-4 w-4" />
                View All Projects
              </Button>
            </Link>
            <Link href="/dashboard/builds" className="block">
              <Button variant="outline" className="w-full justify-start gap-3" size="sm">
                <TrendingUp className="h-4 w-4" />
                Build History
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
