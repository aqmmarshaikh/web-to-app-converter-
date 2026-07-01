"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  Hammer,
  Settings,
  Trash2,
  Copy,
  Download,
  Loader2,
  Check,
  XCircle,
  ExternalLink,
  Rocket,
  Clock,
  MoreVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";

const statusVariant = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "FAILED":
      return "destructive";
    case "QUEUED":
    case "PREPARING":
    case "GENERATING_PROJECT":
    case "RUNNING_GRADLE":
    case "SIGNING_APK":
    case "UPLOADING":
    case "BUILDING":
    case "SIGNING":
      return "info";
    default:
      return "secondary";
  }
};

const statusIcon = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return <Check className="h-3.5 w-3.5" />;
    case "FAILED":
      return <XCircle className="h-3.5 w-3.5" />;
    case "QUEUED":
    case "PREPARING":
    case "GENERATING_PROJECT":
    case "RUNNING_GRADLE":
    case "SIGNING_APK":
    case "UPLOADING":
    case "BUILDING":
    case "SIGNING":
      return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    default:
      return <Clock className="h-3.5 w-3.5" />;
  }
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [builds, setBuilds] = useState<any[]>([]);
  const [building, setBuilding] = useState(false);
  const [buildType, setBuildType] = useState("APK");
  const [deleting, setDeleting] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await api.getProject(projectId);
      if (res.success) {
        setProject(res.data);
        setBuilds(res.data.builds || []);
      }
    } catch (e: any) {
      console.error("Fetch project failed:", e);
      const errMsg = e.message || "Failed to load project";
      toast.error(errMsg);
      
      // Stop polling and mark active builds as failed locally
      setBuilds((prevBuilds) => 
        prevBuilds.map((b) => 
          ["QUEUED", "PREPARING", "GENERATING_PROJECT", "RUNNING_GRADLE", "SIGNING_APK", "UPLOADING", "BUILDING", "SIGNING"].includes(b.status)
            ? { ...b, status: "FAILED", error: errMsg }
            : b
        )
      );
      
      setProject((prevProj: any) => {
        if (!prevProj) return null;
        return {
          ...prevProj,
          builds: prevProj.builds?.map((b: any) =>
            ["QUEUED", "PREPARING", "GENERATING_PROJECT", "RUNNING_GRADLE", "SIGNING_APK", "UPLOADING", "BUILDING", "SIGNING"].includes(b.status)
              ? { ...b, status: "FAILED", error: errMsg }
              : b
          )
        };
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Poll for active builds
  useEffect(() => {
    const hasActive = builds.some((b) =>
      ["QUEUED", "PREPARING", "GENERATING_PROJECT", "RUNNING_GRADLE", "SIGNING_APK", "UPLOADING", "BUILDING", "SIGNING"].includes(b.status)
    );
    if (!hasActive) return;

    const interval = setInterval(() => {
      fetchProject();
    }, 5000);

    return () => clearInterval(interval);
  }, [builds, fetchProject]);

  const handleBuild = async () => {
    setBuilding(true);
    try {
      const res = await api.createBuild(projectId, buildType);
      if (res.success) {
        toast.success("Build queued successfully!");
        fetchProject();
      } else {
        toast.error(res.error || "Failed to queue build");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to queue build");
    } finally {
      setBuilding(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone."))
      return;
    setDeleting(true);
    try {
      const res = await api.deleteProject(projectId);
      if (res.success) {
        toast.success("Project deleted successfully");
        router.push("/dashboard/projects");
      } else {
        toast.error(res.error || "Failed to delete project");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const res = await api.duplicateProject(projectId);
      if (res.success) {
        toast.success("Project duplicated!");
        router.push(`/dashboard/projects/${res.data.id}`);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to duplicate project");
    }
  };

  const handleDownload = async (buildId: string) => {
    try {
      const res = await api.downloadBuild(buildId);
      if (res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, "_blank");
      } else {
        toast.error("Download URL not available");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to download");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton" />
        <div className="h-64 skeleton rounded-xl" />
        <div className="h-48 skeleton rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-semibold">Project not found</h2>
        <Link href="/dashboard/projects">
          <Button variant="outline" className="mt-4">
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const config = project.config || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <a
              href={project.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5 transition-colors"
            >
              <Globe className="h-3 w-3" />
              {project.websiteUrl}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDuplicate}>
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete
          </Button>
        </div>
      </div>

      {/* Project Info + Build Trigger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Config */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Project Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">App Name</span>
                <p className="font-medium">{config.appName || project.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Package Name</span>
                <p className="font-medium font-mono text-xs">{config.packageName || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">App Type</span>
                <p className="font-medium">{project.appType}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Version</span>
                <p className="font-medium">
                  {config.versionName || "1.0.0"} ({config.versionCode || 1})
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Theme Color</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded border border-border"
                    style={{ backgroundColor: config.themeColor || "#000" }}
                  />
                  <span className="font-mono text-xs">{config.themeColor || "#000000"}</span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Builds</span>
                <p className="font-medium">{project._count?.builds || 0} total</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium">
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Permissions</span>
                <p className="font-medium">
                  {config.permissions?.length > 0
                    ? config.permissions.join(", ")
                    : "None"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Build Trigger */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              New Build
            </CardTitle>
            <CardDescription>Queue a new build for this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Output Format</label>
              <div className="grid grid-cols-1 gap-2">
                {["APK", "AAB", "SIGNED_APK"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setBuildType(type)}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                      buildType === type
                        ? "border-white/20 bg-white/5 font-medium"
                        : "border-border hover:border-white/10"
                    }`}
                  >
                    {type === "SIGNED_APK" ? "Signed APK" : type}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleBuild}
              disabled={building}
              className="w-full gap-2"
              variant="gradient"
            >
              {building ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Queuing...
                </>
              ) : (
                <>
                  <Hammer className="h-4 w-4" />
                  Build {buildType}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Build History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Hammer className="h-4 w-4" />
            Build History
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {builds.length} builds
          </Badge>
        </CardHeader>
        <CardContent>
          {builds.length > 0 ? (
            <div className="space-y-2">
              {builds.map((build: any) => (
                <div
                  key={build.id}
                  className="flex items-center justify-between py-3 px-4 rounded-lg border border-border hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-white/5 border border-border flex items-center justify-center flex-shrink-0">
                      {statusIcon(build.status)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={statusVariant(build.status) as any}
                          className="text-[10px]"
                        >
                          {build.status}
                        </Badge>
                        {typeof build.progress === 'number' && build.progress > 0 && build.progress < 100 && (
                          <span className="text-xs font-semibold text-muted-foreground">({build.progress}%)</span>
                        )}
                        <span className="text-xs text-muted-foreground">{build.buildType}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(build.createdAt).toLocaleString()}
                      </p>
                      {build.status === "FAILED" && build.error && (
                        <div className="space-y-1.5 mt-1">
                          <p className="text-xs text-destructive font-medium whitespace-pre-wrap">
                            Error: {build.error}
                          </p>
                          {build.logsUrl && (
                            <a
                              href={build.logsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-400 hover:underline font-semibold block"
                            >
                              View/Download Build Logs (build_logs.txt)
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {build.status === "COMPLETED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => handleDownload(build.id)}
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Hammer className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No builds yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click &quot;Build&quot; above to create your first build
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
