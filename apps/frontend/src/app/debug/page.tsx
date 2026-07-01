"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Database,
  Key,
  Server,
  RefreshCw,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { api, ApiError } from "@/lib/api";

export default function DebugPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  
  // Status states
  const [firebaseInit, setFirebaseInit] = useState<"ok" | "error" | "loading">("loading");
  const [firestoreStatus, setFirestoreStatus] = useState<"ok" | "error" | "loading">("loading");
  const [firestoreMsg, setFirestoreMsg] = useState("");
  
  const [backendStatus, setBackendStatus] = useState<"ok" | "error" | "loading">("loading");
  const [backendHealth, setBackendHealth] = useState<any>(null);
  const [backendMsg, setBackendMsg] = useState("");

  const [dbStatus, setDbStatus] = useState<"ok" | "error" | "loading">("loading");
  const [dbMsg, setDbMsg] = useState("");

  const [buildServiceStatus, setBuildServiceStatus] = useState<"ok" | "error" | "loading">("loading");
  const [buildServiceStats, setBuildServiceStats] = useState<any>(null);
  const [buildServiceMsg, setBuildServiceMsg] = useState("");

  const [tokenStatus, setTokenStatus] = useState<"ok" | "error" | "loading" | "none">("loading");
  const [tokenDetails, setTokenDetails] = useState<{
    exists: boolean;
    headerFormat: string;
    decodedExpiration: string;
    jwtValue: string;
    error?: string;
  }>({
    exists: false,
    headerFormat: "None",
    decodedExpiration: "N/A",
    jwtValue: "",
  });

  // Environment variables list
  const envVars = [
    { name: "NEXT_PUBLIC_FIREBASE_API_KEY", value: process.env.NEXT_PUBLIC_FIREBASE_API_KEY },
    { name: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", value: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN },
    { name: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", value: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID },
    { name: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", value: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET },
    { name: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", value: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID },
    { name: "NEXT_PUBLIC_FIREBASE_APP_ID", value: process.env.NEXT_PUBLIC_FIREBASE_APP_ID },
    { name: "NEXT_PUBLIC_API_URL", value: process.env.NEXT_PUBLIC_API_URL },
  ];

  const runDiagnostics = async () => {
    setRefreshing(true);
    
    // 1. Firebase Initialization
    if (auth && auth.app) {
      setFirebaseInit("ok");
    } else {
      setFirebaseInit("error");
    }

    // 2. Firestore direct read
    try {
      setFirestoreStatus("loading");
      // Check if we can read from Firestore
      const testDocRef = doc(db, "users", "test-connection-non-existent");
      await getDoc(testDocRef);
      setFirestoreStatus("ok");
      setFirestoreMsg("Successfully read from Firestore (user collection reference tested)");
    } catch (e: any) {
      setFirestoreStatus("error");
      setFirestoreMsg(e.message || "Failed to reach Firestore database");
    }

    // 3. Backend Health Check
    try {
      setBackendStatus("loading");
      const healthRes = await api.fetch("/api/health");
      if (healthRes.success) {
        setBackendStatus("ok");
        setBackendHealth(healthRes.data);
        setBackendMsg("Backend endpoints reachable and responsive");
      } else {
        setBackendStatus("error");
        setBackendMsg("Received invalid health payload");
      }
    } catch (e: any) {
      setBackendStatus("error");
      setBackendMsg(e.message || "Backend server unreachable");
    }

    // 4. Token Check & Database check on Backend
    try {
      setTokenStatus("loading");
      setDbStatus("loading");
      
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        // Decode expiration
        let expirationStr = "N/A";
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const exp = payload.exp * 1000;
          expirationStr = new Date(exp).toLocaleString();
        } catch {}

        setTokenStatus("ok");
        setTokenDetails({
          exists: true,
          headerFormat: `Bearer ${token.substring(0, 15)}...`,
          decodedExpiration: expirationStr,
          jwtValue: token,
        });

        // Test database dependency route (api.getProjects)
        const projectsRes = await api.getProjects(1, 1);
        if (projectsRes.success) {
          setDbStatus("ok");
          setDbMsg("Projects loaded successfully via database query");
        } else {
          setDbStatus("error");
          setDbMsg(projectsRes.error || "Failed database route check");
        }
      } else {
        setTokenStatus("none");
        setTokenDetails({
          exists: false,
          headerFormat: "None (User not authenticated)",
          decodedExpiration: "N/A",
          jwtValue: "",
        });
        setDbStatus("error");
        setDbMsg("Authentication required to query backend database");
      }
    } catch (e: any) {
      setTokenStatus("error");
      setTokenDetails(prev => ({ ...prev, error: e.message }));
      setDbStatus("error");
      setDbMsg(e.message || "Failed database/token check");
    }

    // 5. Build Service Status Check
    try {
      setBuildServiceStatus("loading");
      const statsRes = await api.getDashboardStats();
      if (statsRes.success) {
        setBuildServiceStatus("ok");
        setBuildServiceStats(statsRes.data);
        setBuildServiceMsg("Stats dashboard endpoint functional");
      } else {
        setBuildServiceStatus("error");
        setBuildServiceMsg(statsRes.error || "Failed to load dashboard stats");
      }
    } catch (e: any) {
      setBuildServiceStatus("error");
      setBuildServiceMsg(e.message || "Failed to fetch build statistics");
    }

    setRefreshing(false);
  };

  useEffect(() => {
    if (!authLoading) {
      runDiagnostics();
    }
  }, [authLoading]);

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Cpu className="h-6 w-6 text-primary" />
                AppForge Diagnostics
              </h1>
              <p className="text-muted-foreground text-sm">
                Real-time audit status of API, Firebase, Token and Database components.
              </p>
            </div>
          </div>
          <Button onClick={runDiagnostics} disabled={refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Run Diagnostics
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Diagnostic Status Cards */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card/40 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg">System Health Check</CardTitle>
                <CardDescription>Core status overview of integration components</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                
                {/* Firebase SDK Init */}
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Firebase client SDK</p>
                      <p className="text-xs text-muted-foreground">Checks if client-side Firebase initialization succeeded</p>
                    </div>
                  </div>
                  <div>
                    {firebaseInit === "ok" ? (
                      <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> OK</Badge>
                    ) : firebaseInit === "loading" ? (
                      <Badge variant="secondary">Checking...</Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> ERROR</Badge>
                    )}
                  </div>
                </div>

                {/* Firestore Connection */}
                <div className="flex flex-col gap-1 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Firestore Database</p>
                        <p className="text-xs text-muted-foreground">Verifies read accessibility to Firebase Firestore</p>
                      </div>
                    </div>
                    <div>
                      {firestoreStatus === "ok" ? (
                        <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> OK</Badge>
                      ) : firestoreStatus === "loading" ? (
                        <Badge variant="secondary">Checking...</Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> ERROR</Badge>
                      )}
                    </div>
                  </div>
                  {firestoreMsg && (
                    <p className={`text-xs mt-1 px-8 ${firestoreStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                      {firestoreMsg}
                    </p>
                  )}
                </div>

                {/* Backend Connection */}
                <div className="flex flex-col gap-1 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Backend Health Check</p>
                        <p className="text-xs text-muted-foreground">Pings local backend API server</p>
                      </div>
                    </div>
                    <div>
                      {backendStatus === "ok" ? (
                        <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> OK</Badge>
                      ) : backendStatus === "loading" ? (
                        <Badge variant="secondary">Checking...</Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> ERROR</Badge>
                      )}
                    </div>
                  </div>
                  {backendMsg && (
                    <p className={`text-xs mt-1 px-8 ${backendStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                      {backendMsg}
                    </p>
                  )}
                  {backendHealth && (
                    <pre className="text-[10px] mt-2 ml-8 p-2 bg-black/40 border border-border rounded overflow-x-auto text-muted-foreground">
                      {JSON.stringify(backendHealth, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Database connectivity on Backend */}
                <div className="flex flex-col gap-1 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Backend DB Query</p>
                        <p className="text-xs text-muted-foreground">Verifies backend server can query Firestore database</p>
                      </div>
                    </div>
                    <div>
                      {dbStatus === "ok" ? (
                        <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> OK</Badge>
                      ) : dbStatus === "loading" ? (
                        <Badge variant="secondary">Checking...</Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> ERROR</Badge>
                      )}
                    </div>
                  </div>
                  {dbMsg && (
                    <p className={`text-xs mt-1 px-8 ${dbStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                      {dbMsg}
                    </p>
                  )}
                </div>

                {/* Build Service Connection */}
                <div className="flex flex-col gap-1 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Build statistics</p>
                        <p className="text-xs text-muted-foreground">Checks dashboard build statistics functionality</p>
                      </div>
                    </div>
                    <div>
                      {buildServiceStatus === "ok" ? (
                        <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> OK</Badge>
                      ) : buildServiceStatus === "loading" ? (
                        <Badge variant="secondary">Checking...</Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> ERROR</Badge>
                      )}
                    </div>
                  </div>
                  {buildServiceMsg && (
                    <p className={`text-xs mt-1 px-8 ${buildServiceStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                      {buildServiceMsg}
                    </p>
                  )}
                  {buildServiceStats && (
                    <pre className="text-[10px] mt-2 ml-8 p-2 bg-black/40 border border-border rounded overflow-x-auto text-muted-foreground">
                      {JSON.stringify(buildServiceStats, null, 2)}
                    </pre>
                  )}
                </div>

              </CardContent>
            </Card>

            {/* Token details */}
            <Card className="bg-card/40 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Authorization Token Diagnostics
                </CardTitle>
                <CardDescription>JWT structures and authorization signatures</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-black/25 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground">Token Presence</p>
                    <p className="font-semibold text-sm mt-0.5">
                      {tokenStatus === "none" ? "Missing (Unauthenticated)" : tokenStatus === "ok" ? "Present" : "Checking..."}
                    </p>
                  </div>
                  <div className="p-3 bg-black/25 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground">Token Expiration Date</p>
                    <p className="font-semibold text-sm mt-0.5">{tokenDetails.decodedExpiration}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Client Header payload representation:</p>
                  <pre className="p-3 bg-black/40 border border-border rounded-lg text-xs overflow-x-auto">
                    {`Authorization: ${tokenDetails.headerFormat}`}
                  </pre>
                </div>

                {tokenDetails.jwtValue && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Decoded JWT Payload (JSON representation):</p>
                    <pre className="p-3 bg-black/40 border border-border rounded-lg text-[10px] overflow-x-auto text-muted-foreground max-h-48 overflow-y-auto">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(atob(tokenDetails.jwtValue.split(".")[1])), null, 2);
                        } catch {
                          return "Unable to parse payload";
                        }
                      })()}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Environment Variables & Authentication info */}
          <div className="space-y-6">
            
            {/* Auth Session Info */}
            <Card className="bg-card/40 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg">Active User Profile</CardTitle>
                <CardDescription>Current authenticated Firebase user context</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {user ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{profile?.name || user.displayName || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{profile?.email || user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <Badge variant="outline">{profile?.role || "USER"}</Badge>
                    </div>
                    <div className="flex flex-col gap-1 pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">UID:</span>
                      <span className="text-[10px] font-mono select-all bg-black/30 p-1 px-2 border border-border rounded">{user.uid}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
                    <ShieldAlert className="h-8 w-8 text-warning" />
                    <p>No active user authenticated.</p>
                    <Link href="/login" className="mt-2">
                      <Button size="sm" variant="outline">Go to Login</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Environmental variables status */}
            <Card className="bg-card/40 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  Client Environment
                </CardTitle>
                <CardDescription>Variables loaded in frontend browser context</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {envVars.map((v, idx) => (
                  <div key={idx} className="flex flex-col gap-1 pb-2 border-b border-border last:border-b-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-medium truncate pr-2 max-w-[200px]" title={v.name}>
                        {v.name}
                      </span>
                      {v.value ? (
                        <Badge variant="success" className="text-[9px]">Loaded</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[9px]">Missing</Badge>
                      )}
                    </div>
                    {v.value ? (
                      <span className="text-[10px] font-mono text-muted-foreground bg-black/20 p-1 px-2 rounded truncate max-w-full" title={v.value}>
                        {v.name.includes("API_KEY") || v.name.includes("APP_ID")
                          ? `${v.value.substring(0, 10)}... (Masked)`
                          : v.value}
                      </span>
                    ) : (
                      <span className="text-[10px] text-destructive italic">Not set in environment</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
}
