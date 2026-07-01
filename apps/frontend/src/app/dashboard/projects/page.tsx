"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Globe,
  MoreVertical,
  Copy,
  Trash2,
  ExternalLink,
  Hammer,
  FolderKanban,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await api.getProjects(1, 50, search);
      if (res.success) setProjects(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await api.deleteProject(id);
      if (res.success) {
        setProjects(projects.filter((p) => p.id !== id));
        toast.success("Project deleted successfully");
      } else {
        toast.error(res.error || "Failed to delete project");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to delete project");
    }
    setMenuOpenId(null);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await api.duplicateProject(id);
      if (res.success) {
        setProjects([res.data, ...projects]);
        toast.success("Project duplicated successfully");
      } else {
        toast.error(res.error || "Failed to duplicate project");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to duplicate project");
    }
    setMenuOpenId(null);
  };

  const appTypeLabel = (type: string) => {
    switch (type) {
      case "WEBVIEW": return "WebView";
      case "TWA": return "TWA";
      case "NATIVE_WRAPPER": return "Native";
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 skeleton" />
          <div className="h-9 w-32 skeleton rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your website-to-app conversions
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Project Grid */}
      {projects.length > 0 ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {projects.map((project) => (
            <motion.div
              key={project.id}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            >
              <Card className="group hover:border-white/10 transition-all relative">
                <CardContent className="p-5">
                  {/* Menu */}
                  <div className="absolute top-4 right-4 z-20" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpenId(menuOpenId === project.id ? null : project.id); }}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpenId === project.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-10">
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                          onClick={() => setMenuOpenId(null)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </Link>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDuplicate(project.id); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Duplicate
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(project.id); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <Link href={`/dashboard/projects/${project.id}`}>
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-border flex items-center justify-center mb-4">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1 pr-8 truncate">
                      {project.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mb-4">
                      {project.websiteUrl}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">
                        {appTypeLabel(project.appType)}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Hammer className="h-3 w-3" />
                        {project._count?.builds || 0} builds
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Create your first project to start converting websites into Android apps.
            </p>
            <Link href="/dashboard/projects/new">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
