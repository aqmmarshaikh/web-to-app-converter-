"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Hammer,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export default function AdminBuildsPage() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    api.getAdminBuilds(1, 50, statusFilter)
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
      case "BUILDING": case "PREPARING": case "SIGNING": return "info";
      default: return "secondary";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle className="h-4 w-4 text-success" />;
      case "FAILED": return <XCircle className="h-4 w-4 text-destructive" />;
      case "BUILDING": case "PREPARING": case "SIGNING":
        return <Loader2 className="h-4 w-4 text-info animate-spin" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Builds</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monitor and manage builds across all users
        </p>
      </div>

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

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Project</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">User</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {builds.map((build, i) => (
                  <motion.tr
                    key={build.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {statusIcon(build.status)}
                        <div>
                          <p className="text-sm font-medium">{build.project?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{build.project?.websiteUrl || ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-muted-foreground">
                        {build.project?.user?.email || "—"}
                      </span>
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
                        {new Date(build.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {builds.length === 0 && (
            <div className="text-center py-12">
              <Hammer className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No builds found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
