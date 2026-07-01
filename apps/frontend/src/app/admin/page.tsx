"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  FolderKanban,
  Hammer,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

const fadeUp: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminStats()
      .then((res) => {
        if (res.success) setStats(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 skeleton rounded-xl" />
          ))}
        </div>
        <div className="h-64 skeleton rounded-xl" />
      </div>
    );
  }

  const statCards = [
    { icon: Users, label: "Total Users", value: stats?.totalUsers || 0, color: "text-blue-400", bg: "bg-blue-400/10" },
    { icon: FolderKanban, label: "Total Projects", value: stats?.totalProjects || 0, color: "text-purple-400", bg: "bg-purple-400/10" },
    { icon: Hammer, label: "Total Builds", value: stats?.totalBuilds || 0, color: "text-cyan-400", bg: "bg-cyan-400/10" },
    { icon: TrendingUp, label: "Builds Today", value: stats?.buildsToday || 0, color: "text-success", bg: "bg-success/10" },
  ];

  const statusVariant = (status: string) => {
    switch (status) {
      case "COMPLETED": return "success";
      case "FAILED": return "destructive";
      case "BUILDING": case "PREPARING": case "SIGNING": return "info";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          System overview and health metrics
        </p>
      </div>

      {/* Stats */}
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

      {/* Build Success Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Build Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className="text-lg font-bold text-success">
                  {stats?.totalBuilds > 0
                    ? Math.round((stats.successfulBuilds / stats.totalBuilds) * 100)
                    : 0}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all"
                  style={{
                    width: `${stats?.totalBuilds > 0
                      ? (stats.successfulBuilds / stats.totalBuilds) * 100
                      : 0}%`,
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <p className="text-lg font-semibold text-success">{stats?.successfulBuilds || 0}</p>
                  <p className="text-xs text-muted-foreground">Successful</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-destructive">{stats?.failedBuilds || 0}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{(stats?.totalBuilds || 0) - (stats?.successfulBuilds || 0) - (stats?.failedBuilds || 0)}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Builds */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Builds</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentBuilds?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentBuilds.slice(0, 5).map((build: any) => (
                  <div key={build.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{build.project?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{build.project?.user?.email || ""}</p>
                    </div>
                    <Badge variant={statusVariant(build.status) as any} className="text-[10px]">
                      {build.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No builds yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
