"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ContactForm from "@/components/ContactForm";
import { KeyRound, ArrowRight, ShieldCheck, Terminal, Sparkles, Upload, FileSearch, FileText } from "lucide-react";

const stagger = {
  animate: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5 } },
};

export default function TaxApexPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/validate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });

      const json = await res.json();

      if (json.success) {
        router.push(json.redirect || "/dashboard");
      } else {
        setError(json.error || "Invalid access token");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-void text-white overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(circle at 50% 40%, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 40%, black 20%, transparent 70%)",
        }}
      />
      <div className="noise-overlay" />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-void/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <a href="/" className="group flex cursor-pointer items-center space-x-3">
            <i className="fas fa-brain text-2xl text-cyan-400 transition-transform duration-700 group-hover:rotate-180" />
            <span className="font-display text-xl font-bold tracking-tight text-white">
              APEX <span className="text-cyan-400">AGI</span>
            </span>
          </a>

          <div className="hidden items-center space-x-8 text-sm font-mono md:flex">
            <a href="/#services" className="text-gray-400 transition-colors hover:text-white">
              / SERVICES
            </a>
            <a href="/#why-india" className="text-gray-400 transition-colors hover:text-white">
              / WHY INDIA
            </a>
            <a href="/#industries" className="text-gray-400 transition-colors hover:text-white">
              / INDUSTRIES
            </a>
            <a href="/taxapex" className="text-cyan-400 transition-colors hover:text-white">
              / TAXAPEX
            </a>
          </div>
        </div>
      </nav>

      <main className="container relative mx-auto px-6 pt-36 pb-24">
        {/* Header */}
        <motion.div
          className="mb-20 text-center"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          <motion.div
            variants={fadeUp}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs text-emerald-400 tracking-widest">GST ITC OPTIMIZATION</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-display text-5xl font-bold tracking-tight md:text-6xl"
          >
            Tax<span className="text-cyan-400">Apex</span>
          </motion.h1>

          <motion.div variants={fadeUp} className="mt-3 flex items-center justify-center gap-3">
            <span className="font-mono text-xs tracking-[0.3em] text-gray-600">///</span>
            <span className="font-display text-xl font-light tracking-wider text-gray-400">
              GST SAATHI
            </span>
            <span className="font-mono text-xs tracking-[0.3em] text-gray-600">///</span>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-4 text-sm text-gray-400 max-w-xl mx-auto leading-relaxed"
          >
            Upload your bank statement, let AI classify every expense for ITC eligibility,
            then import into GSTR-3B — all in one flow.
          </motion.p>
        </motion.div>

        {/* Unified Flow Diagram */}
        <motion.div
          className="mx-auto mb-16 max-w-4xl"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-3"
          >
            {[
              { icon: Upload, label: "Upload Bank\nStatement", color: "text-cyan-400", bg: "border-cyan-500/20 bg-cyan-500/5" },
              { icon: FileSearch, label: "AI Classifies\nITC Eligibility", color: "text-violet-400", bg: "border-violet-500/20 bg-violet-500/5" },
              { icon: FileText, label: "Import to\nGSTR-3B", color: "text-emerald-400", bg: "border-emerald-500/20 bg-emerald-500/5" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-0">
                <div className={`flex flex-col items-center gap-2 rounded-xl border ${step.bg} px-5 py-4 w-40`}>
                  <step.icon className={`w-5 h-5 ${step.color}`} />
                  <span className="text-[11px] text-gray-400 text-center leading-tight whitespace-pre-line">{step.label}</span>
                </div>
                {i < 2 && (
                  <ArrowRight className="w-4 h-4 text-gray-700 hidden sm:block" />
                )}
              </div>
            ))}
          </motion.div>
          <motion.p
            variants={fadeUp}
            className="text-center mt-6 text-[11px] text-gray-600 font-mono tracking-wider"
          >
            BANK STATEMENT → AI CLASSIFICATION → GSTR-3B FILING
          </motion.p>
        </motion.div>

        {/* Two-column layout */}
        <motion.div
          className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2 lg:gap-10"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          {/* Left: Sign-in Vault */}
          <motion.div variants={fadeUp}>
            <motion.div
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm"
              whileHover={{ borderColor: "rgba(0,212,255,0.2)" }}
              transition={{ duration: 0.3 }}
            >
              {/* Subtle top glow accent */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

              <div className="p-8 md:p-10">
                {/* Header */}
                <div className="mb-8 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/5">
                    <Terminal className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-tight">
                      Sign In
                    </h2>
                    <p className="font-mono text-xs text-gray-500">Enter your access token</p>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.01] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <span className="font-mono text-xs text-emerald-400/80">System Online</span>
                  </div>
                  <span className="ml-auto font-mono text-[10px] text-gray-600">
                    {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Sign-in form */}
                <form onSubmit={handleValidate} className="space-y-5">
                  <div className="relative">
                    <label className="mb-2 block font-mono text-xs tracking-wider text-gray-500 uppercase">
                      ACCESS TOKEN
                    </label>
                    <div
                      className={`relative rounded-xl border transition-all duration-300 ${
                        focused
                          ? "border-cyan-500/50 shadow-[0_0_20px_rgba(0,212,255,0.1)]"
                          : "border-white/[0.08]"
                      }`}
                    >
                      <input
                        type="text"
                        value={token}
                        onChange={(e) => {
                          setToken(e.target.value);
                          if (error) setError("");
                        }}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="Enter your access token"
                        className="w-full bg-transparent px-4 py-4 text-sm text-white placeholder:text-gray-600 focus:outline-none font-mono tracking-wide"
                        autoFocus
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <KeyRound className="h-4 w-4 text-gray-600" />
                      </div>
                    </div>

                    {/* Blinking cursor effect when focused and empty */}
                    {focused && !token && (
                      <div className="pointer-events-none absolute left-4 top-[2.9rem] h-4 w-0.5 animate-pulse bg-cyan-400" />
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        className="overflow-hidden rounded-lg border border-red-500/20 bg-red-500/[0.04] px-4 py-3"
                      >
                        <p className="flex items-center gap-2 font-mono text-xs text-red-400">
                          <span className="text-red-500">!</span> {error}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={loading || !token.trim()}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative w-full overflow-hidden rounded-xl bg-cyan-500 px-6 py-4 text-sm font-bold text-black transition-all duration-300 hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(0,212,255,0.3)] disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:bg-cyan-500 disabled:hover:shadow-none"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                          className="inline-block h-4 w-4 rounded-full border-2 border-black/20 border-t-black"
                        />
                        Authenticating...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Authenticate
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </motion.button>
                </form>
              </div>
            </motion.div>

            {/* Security badges */}
            <motion.div
              variants={fadeUp}
              className="mt-6 flex items-center justify-center gap-6 font-mono text-[10px] text-gray-600 tracking-wider"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" /> 256-BIT ENCRYPTED
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> AI-POWERED
              </span>
            </motion.div>
          </motion.div>

          {/* Right: Product Preview & Access */}
          <motion.div variants={fadeUp}>
            <motion.div
              className="overflow-hidden rounded-2xl border border-amber-500/10 bg-gradient-to-b from-amber-500/[0.02] to-transparent"
              whileHover={{ borderColor: "rgba(245,158,11,0.2)" }}
              transition={{ duration: 0.3 }}
            >
              {/* Amber top accent */}
              <div className="h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

              <div className="px-8 pt-8 md:px-10 md:pt-10">
                <h2 className="font-display text-xl font-bold tracking-tight">
                  What You Get
                </h2>
                <p className="mt-2 font-mono text-xs text-gray-500">
                  After sign-in, here&apos;s what awaits
                </p>
              </div>

              {/* Feature list */}
              <div className="mx-8 mt-6 space-y-3 md:mx-10">
                {[
                  { icon: Upload, label: "AI-Powered ITC Pre-Processor", desc: "Upload bank statements — get CA-ready ITC reports automatically" },
                  { icon: FileSearch, label: "GSTR-3B Integration", desc: "Import discovered ITC directly into your GSTR-3B computation" },
                  { icon: FileText, label: "Retail Digital Ledger", desc: "Track sales & purchases with automatic GST calculation" },
                ].map((feat, i) => (
                  <div key={i} className="flex gap-3 rounded-lg border border-white/[0.04] bg-white/[0.01] px-4 py-3">
                    <feat.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/60" />
                    <div>
                      <p className="text-sm font-medium text-gray-200">{feat.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Try ITC Checker CTA */}
              <div className="mx-8 mt-6 mb-8 md:mx-10">
                <a
                  href="/itc-check"
                  className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm font-medium text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                >
                  Try Free ITC Checker
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Contact Form */}
              <div className="px-6 pb-6 md:px-8 md:pb-8 border-t border-white/[0.04] pt-6">
                <p className="text-xs text-gray-500 mb-4 font-mono tracking-wider uppercase">Request Access Token</p>
                <ContactForm className="!max-w-none !mx-0 !bg-transparent !shadow-none !border-0 !p-0" />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer
        className="relative border-t border-white/[0.04] bg-void py-10"
        variants={fadeIn}
        initial="initial"
        animate="animate"
      >
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between border-t border-white/[0.03] pt-8 font-mono text-xs text-gray-600 md:flex-row">
            <p>&copy; 2025 Apex AGI Solutions. Hyderabad, India.</p>
            <div className="mt-4 flex gap-6 md:mt-0">
              <a href="/#contact" className="transition-colors hover:text-cyan-400">
                Contact
              </a>
              <a href="/" className="transition-colors hover:text-cyan-400">
                Home
              </a>
              <a
                href="/admin/signin"
                className="text-gray-600 transition-colors hover:text-amber-400"
              >
                Admin
              </a>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
