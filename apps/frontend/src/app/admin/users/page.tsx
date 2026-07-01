"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, User, Mail, Calendar, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getAdminUsers(1, 50, search)
      .then((res) => {
        if (res.success) setUsers(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton" />
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
        <h1 className="text-2xl font-bold tracking-tight">Users Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View and manage all registered users
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">User</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Projects</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-white/10 border border-border flex items-center justify-center text-xs font-semibold">
                          {user.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={user.role === "ADMIN" ? "warning" : "outline"}
                        className="text-[10px]"
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={user.emailVerified ? "success" : "secondary"}
                        className="text-[10px]"
                      >
                        {user.emailVerified ? "Verified" : "Unverified"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-muted-foreground">
                        {user._count?.projects || 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
