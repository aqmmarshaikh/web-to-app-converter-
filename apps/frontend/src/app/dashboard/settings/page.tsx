"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Key, Loader2, Check, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    api.getMe().then((res) => {
      if (res.success) {
        setUser(res.data);
        setName(res.data.name || "");
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="h-8 w-32 skeleton" />
        <div className="h-64 skeleton rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-5 pb-4 border-b border-border">
            <div className="h-16 w-16 rounded-full bg-white/10 border border-border flex items-center justify-center text-2xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-semibold">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant={user?.emailVerified ? "success" : "warning"} className="text-[10px]">
                  {user?.emailVerified ? "Email Verified" : "Unverified"}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {user?.role}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <Button disabled={saving || name === user?.name} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Account
          </CardTitle>
          <CardDescription>Account details and security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium">Member Since</p>
              <p className="text-xs text-muted-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }) : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Last updated recently</p>
            </div>
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-destructive">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
