"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { toast } from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.forgotPassword(email);
      setSent(true);
      toast.success("Reset link sent successfully!");
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <Card className="bg-card/50 backdrop-blur-sm border-white/5">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-white flex items-center justify-center">
              {sent ? (
                <CheckCircle className="h-6 w-6 text-black" />
              ) : (
                <Mail className="h-6 w-6 text-black" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {sent ? "Check your email" : "Reset your password"}
            </CardTitle>
            <CardDescription>
              {sent
                ? `We've sent a password reset link to ${email}`
                : "Enter your email and we'll send you a reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {sent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Didn&apos;t receive the email? Check your spam folder or try again.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSent(false)}
                >
                  Try another email
                </Button>
                <Link href="/login" className="block">
                  <Button variant="ghost" className="w-full">
                    Back to login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
