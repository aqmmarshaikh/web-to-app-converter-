"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Hammer,
  Download,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export default function BuildsPage() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    api.getBuilds(1, 50, statusFilter)
      .then((res) => {
        if (res.success) setBuilds(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const statusVariant = (status: string) => {
    switch (status) {
      case "COMPLETED": return "success";
      case "FAILED": return "destructive";
      case "BUILDING":
      case "PREPARING":
      case "SIGNING": return "info";
      case "QUEUED": return "secondary";
      default: return "outline";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle className="h-4 w-4 text-success" />;
      case "FAILED": return <XCircle className="h-4 w-4 text-destructive" />;
      case "BUILDING":
      case "PREPARING":
      case "SIGNING": return <Loader2 className="h-4 w-4 text-info animate-spin" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleDownload = async (buildId: string) => {
    try {
      const res = await api.downloadBuild(buildId);
      if (res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, "_blank");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (start: string, end: string) => {
    if (!start || !end) return "—";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 skeleton" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Build History</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track and manage all your app builds
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["", "COMPLETED", "BUILDING", "QUEUED", "FAILED"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="whitespace-nowrap"
            >
              {status || "All"}
            </Button>
          ))}
        </div>
      </div>

      {/* Builds Table */}
      {builds.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Project</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Duration</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Date</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {builds.map((build, i) => (
                    <motion.tr
                      key={build.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {statusIcon(build.status)}
                          <div>
                            <p className="text-sm font-medium">{build.project?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {build.project?.websiteUrl || ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={statusVariant(build.status) as any} className="text-[10px]">
                          {build.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-muted-foreground">{build.buildType}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(build.startedAt, build.completedAt)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(build.createdAt)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {build.status === "COMPLETED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(build.id)}
                            className="gap-1.5"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Hammer className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No builds found</h3>
            <p className="text-sm text-muted-foreground text-center">
              {statusFilter
                ? `No builds with status "${statusFilter}"`
                : "Create a project and start your first build"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
