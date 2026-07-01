"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Settings,
  Rocket,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  Smartphone,
  Palette,
  Navigation,
  Shield,
  Zap,
  MonitorSmartphone,
  Code2,
  Camera,
  MapPin,
  Mic,
  Bell,
  HardDrive,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";
import { toast } from "react-hot-toast";

/* ============================================================
   Step Indicator
   ============================================================ */

const steps = [
  { icon: Globe, label: "Website URL", description: "Enter your website" },
  { icon: Settings, label: "Configure", description: "Customize your app" },
  { icon: Rocket, label: "Generate", description: "Build your APK" },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-2.5">
            <div
              className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                i < currentStep
                  ? "bg-success text-black"
                  : i === currentStep
                  ? "bg-white text-black"
                  : "bg-card border border-border text-muted-foreground"
              }`}
            >
              {i < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                <step.icon className="h-4 w-4" />
              )}
            </div>
            <div className="hidden sm:block">
              <p className={`text-sm font-medium ${i <= currentStep ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-12 mx-2 transition-colors ${i < currentStep ? "bg-success" : "bg-border"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ============================================================
   Permission Items
   ============================================================ */

const permissionOptions = [
  { id: "CAMERA", icon: Camera, label: "Camera", description: "Take photos and videos" },
  { id: "LOCATION", icon: MapPin, label: "Location", description: "Access device location" },
  { id: "MICROPHONE", icon: Mic, label: "Microphone", description: "Record audio" },
  { id: "NOTIFICATIONS", icon: Bell, label: "Notifications", description: "Send push notifications" },
  { id: "STORAGE", icon: HardDrive, label: "Storage", description: "Read/write files" },
  { id: "CONTACTS", icon: Users, label: "Contacts", description: "Access contacts list" },
];

/* ============================================================
   App Type Selection
   ============================================================ */

const appTypes = [
  {
    id: "WEBVIEW",
    icon: MonitorSmartphone,
    title: "WebView App",
    description: "Simple wrapper with embedded browser view",
  },
  {
    id: "TWA",
    icon: Globe,
    title: "Trusted Web Activity",
    description: "Full-screen Chrome rendering (recommended for PWAs)",
    recommended: true,
  },
  {
    id: "NATIVE_WRAPPER",
    icon: Code2,
    title: "Native Wrapper",
    description: "Enhanced with native UI components",
  },
];

/* ============================================================
   Main Wizard
   ============================================================ */

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [urlValidating, setUrlValidating] = useState(false);
  const [urlValid, setUrlValid] = useState<boolean | null>(null);

  // Step 1: URL
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Step 2: Config
  const [appName, setAppName] = useState("");
  const [packageName, setPackageName] = useState("");
  const [versionName, setVersionName] = useState("1.0.0");
  const [versionCode, setVersionCode] = useState("1");
  const [description, setDescription] = useState("");
  const [appType, setAppType] = useState("WEBVIEW");
  const [themeColor, setThemeColor] = useState("#000000");
  const [darkMode, setDarkMode] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [bottomNavigation, setBottomNavigation] = useState(false);
  const [navigationDrawer, setNavigationDrawer] = useState(false);
  const [pullToRefresh, setPullToRefresh] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [splashScreen, setSplashScreen] = useState(true);
  const [backButtonHandling, setBackButtonHandling] = useState(true);
  const [downloadSupport, setDownloadSupport] = useState(true);
  const [fileUploadSupport, setFileUploadSupport] = useState(true);
  const [orientationLock, setOrientationLock] = useState("UNSPECIFIED");

  // Config tab
  const [configTab, setConfigTab] = useState("basic");

  // Step 3: Build
  const [buildType, setBuildType] = useState("APK");
  const [buildId, setBuildId] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<string | null>(null);
  const [buildProgress, setBuildProgress] = useState<number>(0);

  // Normalization logic for Android package names
  const normalizePackageName = (value: string): string => {
    if (!value) return "";
    let normalized = value.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");
    const segments = normalized.split(".").filter(Boolean);
    
    if (segments.length === 0) {
      return "com.example.myapp";
    }
    
    if (segments.length === 1) {
      const firstChar = segments[0][0];
      if (!/[a-z]/.test(firstChar)) {
        segments[0] = "a" + segments[0];
      }
      return `com.${segments[0]}`;
    }
    
    if (segments.length === 2) {
      const tlds = ["com", "org", "net", "edu", "gov", "live", "io", "co", "info", "xyz", "app"];
      const p0 = segments[0];
      const p1 = segments[1];
      if (tlds.includes(p1) && !tlds.includes(p0)) {
        return `com.${p0}.${p1}`;
      }
      if (p0 === "live" || p0 === "org" || p0 === "net" || p0 === "com") {
        return `com.${p1}.${p0}`;
      }
      if (!tlds.includes(p0)) {
        return `com.${p0}.${p1}`;
      }
    }

    const finalSegments = segments.map((seg) => {
      if (!/^[a-z]/.test(seg)) {
        return "a" + seg;
      }
      return seg;
    });

    return finalSegments.join(".");
  };

  // Auto-generate package name from URL
  const autoPackageName = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      const parts = hostname.replace("www.", "").split(".").reverse();
      return parts.join(".").toLowerCase().replace(/[^a-z0-9.]/g, "");
    } catch {
      return "com.example.myapp";
    }
  };

  // Auto-generate app name from URL
  const autoAppName = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      const name = hostname.replace("www.", "").split(".")[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      return "My App";
    }
  };

  // Validate URL
  const validateUrl = async () => {
    setUrlValidating(true);
    setUrlValid(null);
    try {
      const url = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
      setWebsiteUrl(url);
      // Simple validation — just check URL format
      new URL(url);
      setUrlValid(true);
      setAppName(autoAppName(url));
      setPackageName(normalizePackageName(autoPackageName(url)));
    } catch {
      setUrlValid(false);
    }
    setUrlValidating(false);
  };

  // Toggle permission
  const togglePermission = (id: string) => {
    setPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Handle project creation and build
  const handleGenerate = async () => {
    setLoading(true);
    setError("");

    try {
      const finalPackageName = normalizePackageName(packageName);
      // Create project
      const projectRes = await api.createProject({
        name: appName,
        websiteUrl,
        appType,
        config: {
          appName,
          packageName: finalPackageName,
          versionName,
          versionCode: parseInt(versionCode),
          description,
          themeColor,
          darkMode,
          permissions,
          bottomNavigation,
          navigationDrawer,
          pullToRefresh,
          offlineMode,
          splashScreen,
          backButtonHandling,
          downloadSupport,
          fileUploadSupport,
          orientationLock,
          floatingActionButton: false,
          pushNotifications: permissions.includes("NOTIFICATIONS"),
          deepLinks: false,
          customLoadingScreen: false,
        },
      });

      if (!projectRes.success) {
        throw new Error(projectRes.error || "Failed to create project");
      }

      // Queue build
      const buildRes = await api.createBuild(projectRes.data.id, buildType);
      if (buildRes.success) {
        setBuildId(buildRes.data.id);
        setBuildStatus("QUEUED");
        // Poll for status
        pollBuildStatus(buildRes.data.id);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err as Error).message || "An unexpected error occurred";
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  // Poll build status
  const pollBuildStatus = async (id: string) => {
    const poll = setInterval(async () => {
      try {
        const res = await api.getBuild(id);
        if (res.success) {
          setBuildStatus(res.data.status);
          if (typeof res.data.progress === "number") {
            setBuildProgress(res.data.progress);
          }
          if (res.data.status === "COMPLETED" || res.data.status === "FAILED") {
            clearInterval(poll);
            setLoading(false);
            if (res.data.status === "FAILED") {
              const buildErrorMsg = res.data.error || "Build failed";
              setError(buildErrorMsg);
              toast.error(buildErrorMsg);
            }
          }
        }
      } catch (err: any) {
        clearInterval(poll);
        setLoading(false);
        setBuildStatus("FAILED");
        const msg = err instanceof ApiError ? err.message : (err as Error).message || "Polling request failed";
        setError(msg);
        toast.error(msg);
      }
    }, 3000);
  };

  // Navigation
  const nextStep = () => {
    if (step === 0 && !urlValid) {
      validateUrl();
      return;
    }
    if (step < 2) setStep(step + 1);
    if (step === 2 && !buildId) handleGenerate();
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Create New Project</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Convert your website into an Android app in three easy steps.
      </p>

      <StepIndicator currentStep={step} />

      <AnimatePresence mode="wait">
        {/* Step 1: Website URL */}
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle>Enter Your Website URL</CardTitle>
                <CardDescription>
                  Paste the URL of the website you want to convert into an Android app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <div className="flex gap-3">
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com"
                      value={websiteUrl}
                      onChange={(e) => {
                        setWebsiteUrl(e.target.value);
                        setUrlValid(null);
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={validateUrl}
                      disabled={!websiteUrl || urlValidating}
                    >
                      {urlValidating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : urlValid ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        "Validate"
                      )}
                    </Button>
                  </div>
                  {urlValid === false && (
                    <p className="text-xs text-destructive">Please enter a valid URL</p>
                  )}
                  {urlValid === true && (
                    <p className="text-xs text-success">URL is valid!</p>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-background/50 p-4">
                  <p className="text-sm font-medium mb-2">Supported website types:</p>
                  <div className="flex flex-wrap gap-2">
                    {["Static Sites", "React", "Next.js", "Vue", "Angular", "WordPress", "PWAs", "Any URL"].map((type) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Configuration */}
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle>Configure Your App</CardTitle>
                <CardDescription>
                  Customize the appearance and behavior of your Android app.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Config Tabs */}
                <div className="flex gap-1 mb-6 p-1 bg-background/50 rounded-lg border border-border overflow-x-auto">
                  {[
                    { id: "basic", icon: Smartphone, label: "Basic" },
                    { id: "branding", icon: Palette, label: "Branding" },
                    { id: "navigation", icon: Navigation, label: "Navigation" },
                    { id: "permissions", icon: Shield, label: "Permissions" },
                    { id: "advanced", icon: Zap, label: "Advanced" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setConfigTab(tab.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                        configTab === tab.id
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Basic Tab */}
                {configTab === "basic" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>App Name</Label>
                        <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="My App" />
                      </div>
                      <div className="space-y-2">
                        <Label>Package Name</Label>
                        <Input 
                          value={packageName} 
                          onChange={(e) => setPackageName(e.target.value)} 
                          onBlur={(e) => setPackageName(normalizePackageName(e.target.value))}
                          placeholder="com.example.myapp" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Version Name</Label>
                        <Input value={versionName} onChange={(e) => setVersionName(e.target.value)} placeholder="1.0.0" />
                      </div>
                      <div className="space-y-2">
                        <Label>Version Code</Label>
                        <Input type="number" value={versionCode} onChange={(e) => setVersionCode(e.target.value)} placeholder="1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="A brief description of your app..."
                        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-none"
                      />
                    </div>

                    {/* App Type */}
                    <div className="space-y-3">
                      <Label>App Type</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {appTypes.map((type) => (
                          <button
                            key={type.id}
                            onClick={() => setAppType(type.id)}
                            className={`relative text-left p-4 rounded-xl border transition-all ${
                              appType === type.id
                                ? "border-white/20 bg-white/5"
                                : "border-border hover:border-white/10 bg-card/50"
                            }`}
                          >
                            {type.recommended && (
                              <Badge className="absolute -top-2 right-3 bg-white text-black text-[9px] px-2 py-0">
                                Best
                              </Badge>
                            )}
                            <type.icon className={`h-5 w-5 mb-2 ${appType === type.id ? "text-foreground" : "text-muted-foreground"}`} />
                            <p className="text-sm font-medium">{type.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Branding Tab */}
                {configTab === "branding" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Theme Color</Label>
                      <div className="flex gap-3 items-center">
                        <input
                          type="color"
                          value={themeColor}
                          onChange={(e) => setThemeColor(e.target.value)}
                          className="h-10 w-16 rounded-lg border border-border bg-transparent cursor-pointer"
                        />
                        <Input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="flex-1" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <div>
                        <p className="text-sm font-medium">Dark Mode</p>
                        <p className="text-xs text-muted-foreground">Use dark theme for the app</p>
                      </div>
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`h-6 w-11 rounded-full transition-colors relative ${darkMode ? "bg-white" : "bg-border"}`}
                      >
                        <span className={`absolute top-1 h-4 w-4 rounded-full transition-all ${darkMode ? "left-6 bg-black" : "left-1 bg-muted-foreground"}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <div>
                        <p className="text-sm font-medium">Splash Screen</p>
                        <p className="text-xs text-muted-foreground">Show a branded launch screen</p>
                      </div>
                      <button
                        onClick={() => setSplashScreen(!splashScreen)}
                        className={`h-6 w-11 rounded-full transition-colors relative ${splashScreen ? "bg-white" : "bg-border"}`}
                      >
                        <span className={`absolute top-1 h-4 w-4 rounded-full transition-all ${splashScreen ? "left-6 bg-black" : "left-1 bg-muted-foreground"}`} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Navigation Tab */}
                {configTab === "navigation" && (
                  <div className="space-y-1">
                    {[
                      { label: "Bottom Navigation", desc: "Tab bar at the bottom", state: bottomNavigation, toggle: setBottomNavigation },
                      { label: "Navigation Drawer", desc: "Slide-out side menu", state: navigationDrawer, toggle: setNavigationDrawer },
                      { label: "Pull to Refresh", desc: "Swipe down to reload page", state: pullToRefresh, toggle: setPullToRefresh },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-border">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => item.toggle(!item.state)}
                          className={`h-6 w-11 rounded-full transition-colors relative ${item.state ? "bg-white" : "bg-border"}`}
                        >
                          <span className={`absolute top-1 h-4 w-4 rounded-full transition-all ${item.state ? "left-6 bg-black" : "left-1 bg-muted-foreground"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Permissions Tab */}
                {configTab === "permissions" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissionOptions.map((perm) => (
                      <button
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                          permissions.includes(perm.id)
                            ? "border-white/20 bg-white/5"
                            : "border-border hover:border-white/10 bg-card/50"
                        }`}
                      >
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                          permissions.includes(perm.id) ? "bg-white/10" : "bg-white/5"
                        }`}>
                          <perm.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{perm.label}</p>
                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                        </div>
                        {permissions.includes(perm.id) && (
                          <Check className="h-4 w-4 text-success" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Advanced Tab */}
                {configTab === "advanced" && (
                  <div className="space-y-1">
                    {[
                      { label: "Offline Mode", desc: "Cache content for offline access", state: offlineMode, toggle: setOfflineMode },
                      { label: "Back Button Handling", desc: "Navigate back in WebView on back press", state: backButtonHandling, toggle: setBackButtonHandling },
                      { label: "Download Support", desc: "Handle file downloads from website", state: downloadSupport, toggle: setDownloadSupport },
                      { label: "File Upload Support", desc: "Allow file picker for uploads", state: fileUploadSupport, toggle: setFileUploadSupport },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-border">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => item.toggle(!item.state)}
                          className={`h-6 w-11 rounded-full transition-colors relative ${item.state ? "bg-white" : "bg-border"}`}
                        >
                          <span className={`absolute top-1 h-4 w-4 rounded-full transition-all ${item.state ? "left-6 bg-black" : "left-1 bg-muted-foreground"}`} />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-3 border-b border-border">
                      <div>
                        <p className="text-sm font-medium">Orientation Lock</p>
                        <p className="text-xs text-muted-foreground">Lock screen orientation</p>
                      </div>
                      <select
                        value={orientationLock}
                        onChange={(e) => setOrientationLock(e.target.value)}
                        className="bg-background border border-input rounded-lg px-3 py-1.5 text-sm"
                      >
                        <option value="UNSPECIFIED">Auto</option>
                        <option value="PORTRAIT">Portrait</option>
                        <option value="LANDSCAPE">Landscape</option>
                      </select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Generate */}
        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle>Generate Your App</CardTitle>
                <CardDescription>
                  Choose the output format and start building.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!buildId && (
                  <>
                    {/* Build Type Selection */}
                    <div className="space-y-3">
                      <Label>Build Output</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { id: "APK", label: "APK", desc: "Standard Android package", recommended: true },
                          { id: "AAB", label: "AAB", desc: "Android App Bundle for Play Store" },
                          { id: "SIGNED_APK", label: "Signed APK", desc: "Production-signed package" },
                        ].map((type) => (
                          <button
                            key={type.id}
                            onClick={() => setBuildType(type.id)}
                            className={`relative text-left p-4 rounded-xl border transition-all ${
                              buildType === type.id
                                ? "border-white/20 bg-white/5"
                                : "border-border hover:border-white/10 bg-card/50"
                            }`}
                          >
                            <p className="text-sm font-semibold">{type.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{type.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-lg border border-border bg-background/50 p-4 space-y-2">
                      <p className="text-sm font-medium mb-3">Build Summary</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">App Name</span>
                        <span>{appName}</span>
                        <span className="text-muted-foreground">Package</span>
                        <span className="truncate">{packageName}</span>
                        <span className="text-muted-foreground">Website</span>
                        <span className="truncate">{websiteUrl}</span>
                        <span className="text-muted-foreground">App Type</span>
                        <span>{appType}</span>
                        <span className="text-muted-foreground">Output</span>
                        <span>{buildType}</span>
                        <span className="text-muted-foreground">Permissions</span>
                        <span>{permissions.length > 0 ? permissions.join(", ") : "None"}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Build Progress */}
                {buildId && (
                  <div className="text-center py-8">
                    {buildStatus !== "COMPLETED" && buildStatus !== "FAILED" && (
                      <>
                        <div className="relative h-20 w-20 mx-auto mb-6">
                          <div className="absolute inset-0 rounded-full border-4 border-border" />
                          <div className="absolute inset-0 rounded-full border-4 border-t-white animate-spin" />
                          <div className="absolute inset-3 rounded-full bg-card flex items-center justify-center">
                            <Rocket className="h-6 w-6" />
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          Building your app...
                        </h3>
                        <div className="flex flex-col items-center gap-2 mb-3">
                          <Badge variant="info">{buildStatus}</Badge>
                          {buildProgress > 0 && (
                            <span className="text-sm font-semibold text-muted-foreground">Progress: {buildProgress}%</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-3">
                          This usually takes 2-5 minutes. Don&apos;t close this page.
                        </p>
                      </>
                    )}

                    {buildStatus === "COMPLETED" && (
                      <>
                        <div className="h-20 w-20 rounded-full bg-success/10 border-2 border-success flex items-center justify-center mx-auto mb-6">
                          <Check className="h-8 w-8 text-success" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          Build Completed! 🎉
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Your {buildType} is ready to download.
                        </p>
                        <Button
                          onClick={async () => {
                            const res = await api.downloadBuild(buildId);
                            if (res.data?.downloadUrl) {
                              window.open(res.data.downloadUrl, "_blank");
                            }
                          }}
                          size="lg"
                          variant="gradient"
                          className="gap-2"
                        >
                          Download {buildType}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {buildStatus === "FAILED" && (
                      <>
                        <div className="h-20 w-20 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center mx-auto mb-6">
                          <span className="text-2xl">✕</span>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          Build Failed
                        </h3>
                        <p className="text-sm text-destructive mb-6 whitespace-pre-wrap">
                          {error || "Something went wrong during the build process."}
                        </p>
                        <Button onClick={() => { setBuildId(null); setBuildStatus(null); setBuildProgress(0); setError(""); }} variant="outline">
                          Try Again
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={step === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {step < 2 ? (
          <Button onClick={nextStep} className="gap-2" disabled={step === 0 && !websiteUrl}>
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : !buildId ? (
          <Button onClick={handleGenerate} className="gap-2" disabled={loading} variant="gradient">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Generate {buildType}
              </>
            )}
          </Button>
        ) : buildStatus === "COMPLETED" ? (
          <Button onClick={() => router.push("/dashboard/projects")} className="gap-2">
            Go to Projects
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
