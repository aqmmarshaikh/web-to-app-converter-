import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "AppForge — Convert Any Website Into an Android App",
  description:
    "Build Android APKs and AABs from any website in minutes. No coding required. Support for WebView, TWA, and native wrapper apps with custom branding, permissions, and more.",
  keywords: [
    "website to apk",
    "convert website to app",
    "android app builder",
    "apk generator",
    "webview app",
    "trusted web activity",
    "no code app builder",
  ],
  authors: [{ name: "AppForge" }],
  openGraph: {
    type: "website",
    title: "AppForge — Convert Any Website Into an Android App",
    description:
      "Build Android APKs from any website in minutes. No coding required.",
    siteName: "AppForge",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
