"use client";

import React from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Smartphone,
  Palette,
  Shield,
  Package,
  Zap,
  Globe,
  ChevronDown,
  Check,
  Menu,
  X,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Layers,
  Download,
  Settings,
  Code2,
  MonitorSmartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ============================================================
   Animation Variants
   ============================================================ */

const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

/* ============================================================
   Section Wrapper with In-View Animation
   ============================================================ */

function AnimatedSection({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ============================================================
   Navbar
   ============================================================ */

function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-black" />
          </div>
          <span className="text-lg font-bold tracking-tight">AppForge</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            FAQ
          </a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="rounded-full px-5">
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden glass border-t border-border/50 px-6 py-4 space-y-4"
        >
          <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMenuOpen(false)}>How It Works</a>
          <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMenuOpen(false)}>Pricing</a>
          <a href="#faq" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMenuOpen(false)}>FAQ</a>
          <div className="flex gap-3 pt-2">
            <Link href="/login" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">Log In</Button>
            </Link>
            <Link href="/register" className="flex-1">
              <Button size="sm" className="w-full">Get Started</Button>
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}

/* ============================================================
   Hero Section
   ============================================================ */

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated background */}
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 blur-3xl animate-gradient" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs font-medium backdrop-blur-sm">
            <Sparkles className="h-3 w-3 mr-1.5" />
            Now in Beta — Free for everyone
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05]"
        >
          Convert Any Website
          <br />
          <span className="gradient-text-vivid">Into an Android App</span>
          <br />
          in Minutes.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          No coding required. Generate production-ready APKs directly from your
          website URL. Custom branding, native features, and signed builds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/register">
            <Button size="xl" variant="gradient" className="group">
              Start Building
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="xl" variant="outline" className="backdrop-blur-sm">
              See How It Works
            </Button>
          </a>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-20 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
          <div className="rounded-xl border border-border overflow-hidden shadow-2xl shadow-white/5 bg-card">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/80">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-background rounded-md px-4 py-1 text-xs text-muted-foreground">
                  appforge.dev/dashboard
                </div>
              </div>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Stat Cards */}
              {[
                { label: "Total Projects", value: "12", icon: <Layers className="h-4 w-4" /> },
                { label: "Successful Builds", value: "47", icon: <Check className="h-4 w-4" /> },
                { label: "Downloads", value: "1.2K", icon: <Download className="h-4 w-4" /> },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-background/50 p-4 flex items-center gap-4"
                >
                  <div className="h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground">
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Build List Preview */}
            <div className="px-8 pb-8">
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-4 gap-4 px-4 py-2.5 bg-background/50 text-xs font-medium text-muted-foreground border-b border-border">
                  <span>Project</span>
                  <span>Status</span>
                  <span>Type</span>
                  <span>Date</span>
                </div>
                {[
                  { name: "My Portfolio", status: "Completed", type: "APK", badge: "success" },
                  { name: "E-Commerce Store", status: "Building", type: "AAB", badge: "info" },
                  { name: "Blog App", status: "Queued", type: "APK", badge: "secondary" },
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-4 gap-4 px-4 py-3 text-sm border-b border-border last:border-0">
                    <span className="font-medium">{row.name}</span>
                    <span>
                      <Badge variant={row.badge as any} className="text-[10px]">
                        {row.status}
                      </Badge>
                    </span>
                    <span className="text-muted-foreground">{row.type}</span>
                    <span className="text-muted-foreground">Just now</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ============================================================
   Features Section
   ============================================================ */

const features = [
  {
    icon: <Zap className="h-5 w-5" />,
    title: "One-Click APK Generation",
    description: "Enter your website URL and get a production-ready APK in minutes. No Android Studio required.",
  },
  {
    icon: <Palette className="h-5 w-5" />,
    title: "Custom Branding",
    description: "Upload your app icon, splash screen, and choose theme colors. Make it truly yours.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Signed APK Support",
    description: "Generate signed APKs ready for Google Play Store submission with your own keystore.",
  },
  {
    icon: <Package className="h-5 w-5" />,
    title: "AAB Bundle Support",
    description: "Export as Android App Bundle (AAB) for optimized delivery through Google Play.",
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: "WebView & TWA",
    description: "Choose between WebView wrapper, Trusted Web Activity, or enhanced native wrapper.",
  },
  {
    icon: <Smartphone className="h-5 w-5" />,
    title: "Beginner Friendly",
    description: "No coding knowledge needed. Our wizard guides you through every step of the process.",
  },
];

function Features() {
  return (
    <AnimatedSection id="features" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Features</Badge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Everything you need to go
            <br />
            <span className="gradient-text">from website to app</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Powerful features designed for simplicity. Build professional Android apps without writing a single line of code.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div key={i} variants={scaleIn}>
              <Card className="group hover:border-white/10 hover:bg-card/80 h-full cursor-default">
                <CardContent className="p-6">
                  <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

/* ============================================================
   How It Works Section
   ============================================================ */

const steps = [
  {
    number: "01",
    icon: <Globe className="h-6 w-6" />,
    title: "Enter Your Website URL",
    description: "Paste your website URL and we'll automatically detect its type — PWA, static site, React, Next.js, or any other web technology.",
  },
  {
    number: "02",
    icon: <Settings className="h-6 w-6" />,
    title: "Configure Your App",
    description: "Customize your app name, icon, splash screen, colors, permissions, and navigation. Our wizard makes it simple.",
  },
  {
    number: "03",
    icon: <Download className="h-6 w-6" />,
    title: "Download Your APK",
    description: "Hit generate and watch your app being built in real-time. Download the APK or AAB when it's ready.",
  },
];

function HowItWorks() {
  return (
    <AnimatedSection id="how-it-works" className="py-24 md:py-32 relative">
      <div className="absolute inset-0 dot-pattern opacity-50" />
      <div className="mx-auto max-w-7xl px-6 relative">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <Badge variant="outline" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Three steps to your
            <br />
            <span className="gradient-text">Android app</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div key={i} variants={fadeUp} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-border to-transparent -translate-x-8" />
              )}
              <Card className="bg-card/50 border-border/50 hover:border-white/10 transition-all group">
                <CardContent className="p-8 text-center">
                  <div className="text-4xl font-black text-white/5 mb-4 group-hover:text-white/10 transition-colors">
                    {step.number}
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-white/10 group-hover:scale-110 transition-all">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

/* ============================================================
   App Types Section
   ============================================================ */

const appTypes = [
  {
    icon: <MonitorSmartphone className="h-6 w-6" />,
    title: "WebView App",
    description: "A lightweight wrapper that loads your website inside an embedded browser view. Perfect for quick conversions.",
    features: ["Simple setup", "Custom UI overlays", "Offline caching", "File upload support"],
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Trusted Web Activity",
    description: "Uses Chrome's engine for full-screen, high-performance rendering. Best for PWAs with a web manifest.",
    features: ["Native performance", "No browser chrome", "Auto-updates", "Digital Asset Links"],
    recommended: true,
  },
  {
    icon: <Code2 className="h-6 w-6" />,
    title: "Native Wrapper",
    description: "Enhanced WebView with native UI components like bottom navigation, drawers, and push notifications.",
    features: ["Bottom navigation", "Navigation drawer", "Push notifications", "Deep linking"],
  },
];

function AppTypes() {
  return (
    <AnimatedSection className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <Badge variant="outline" className="mb-4">App Types</Badge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Choose your
            <br />
            <span className="gradient-text">conversion method</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Three different approaches to fit your needs. From simple wrappers to feature-rich native apps.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {appTypes.map((type, i) => (
            <motion.div key={i} variants={scaleIn}>
              <Card className={`h-full relative group transition-all hover:border-white/10 ${
                type.recommended ? "border-white/20 shadow-lg shadow-white/5" : ""
              }`}>
                {type.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-white text-black text-[10px] font-semibold px-3 py-0.5">
                      Recommended
                    </Badge>
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-5 group-hover:bg-white/10 transition-colors">
                    {type.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{type.title}</h3>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{type.description}</p>
                  <ul className="space-y-2.5">
                    {type.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-sm">
                        <div className="h-4 w-4 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                          <Check className="h-2.5 w-2.5 text-success" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

/* ============================================================
   Pricing Section
   ============================================================ */

function Pricing() {
  return (
    <AnimatedSection id="pricing" className="py-24 md:py-32 relative">
      <div className="absolute inset-0 dot-pattern opacity-30" />
      <div className="mx-auto max-w-3xl px-6 relative">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Pricing</Badge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Free. <span className="gradient-text">Forever.</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            AppForge is completely free during beta. No credit card required.
          </p>
        </motion.div>

        <motion.div variants={scaleIn}>
          <Card className="border-white/10 bg-card/50 backdrop-blur-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <CardContent className="p-10 md:p-12">
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground mb-8 text-sm">
                Full access to all features. No limitations during beta.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Unlimited projects",
                  "APK & AAB generation",
                  "Signed APK support",
                  "Custom branding",
                  "All app types (WebView, TWA, Native)",
                  "Real-time build monitoring",
                  "24h download window",
                  "Community support",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <div className="h-5 w-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-success" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button size="lg" variant="gradient" className="w-full">
                  Get Started for Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatedSection>
  );
}

/* ============================================================
   FAQ Section
   ============================================================ */

const faqs = [
  {
    question: "What types of websites can I convert?",
    answer: "AppForge supports virtually any website — static sites, React apps, Next.js, Vue, Angular, WordPress, PWAs, and any publicly accessible URL. As long as it loads in a browser, we can wrap it.",
  },
  {
    question: "Is the generated APK safe for the Play Store?",
    answer: "Yes! You can generate signed APKs with your own keystore, which meets Google Play Store requirements. We also support AAB (Android App Bundle) format which Google recommends for new submissions.",
  },
  {
    question: "How long does a build take?",
    answer: "Most builds complete within 2-5 minutes. Complex apps with many dependencies might take slightly longer. You can monitor build progress in real-time from your dashboard.",
  },
  {
    question: "Do I need any coding knowledge?",
    answer: "Absolutely not. Our step-by-step wizard guides you through every option with clear descriptions. Just enter your URL, configure your preferences, and hit generate.",
  },
  {
    question: "How long are build artifacts available?",
    answer: "Generated APK and AAB files are available for download for 24 hours after build completion. You can always create a new build if you need to download again.",
  },
  {
    question: "Can I add native features like push notifications?",
    answer: "Yes! The Native Wrapper app type supports push notifications (via Firebase), deep linking, offline mode, file upload/download, and custom navigation components.",
  },
];

function FAQ() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  return (
    <AnimatedSection id="faq" className="py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <Badge variant="outline" className="mb-4">FAQ</Badge>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Frequently asked
            <br />
            <span className="gradient-text">questions</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div key={i} variants={fadeUp}>
              <Card
                className={`cursor-pointer transition-all hover:border-white/10 ${
                  openIndex === i ? "border-white/10 bg-card/80" : "bg-card/30"
                }`}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-medium text-sm">{faq.question}</h3>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
                        openIndex === i ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  {openIndex === i && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 text-sm text-muted-foreground leading-relaxed"
                    >
                      {faq.answer}
                    </motion.p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

/* ============================================================
   CTA Section
   ============================================================ */

function CTA() {
  return (
    <AnimatedSection className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 animate-gradient" />
      <div className="mx-auto max-w-4xl px-6 text-center relative">
        <motion.div variants={fadeUp}>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Ready to build your app?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join thousands of creators who have already converted their websites into Android apps using AppForge.
          </p>
          <Link href="/register">
            <Button size="xl" variant="gradient" className="group">
              Start Building — It&apos;s Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </AnimatedSection>
  );
}

/* ============================================================
   Footer
   ============================================================ */

function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-black" />
              </div>
              <span className="text-lg font-bold">AppForge</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Convert any website into a native Android application. No coding required.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Resources</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">API Reference</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} AppForge. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink className="h-4 w-4" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   Page Assembly
   ============================================================ */

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <AppTypes />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
