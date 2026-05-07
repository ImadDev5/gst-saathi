"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound } from "lucide-react";

export default function SignIn() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setToken(urlToken);
      handleValidate(urlToken);
    }
  }, []);

  const handleValidate = async (tokenValue: string) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/validate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenValue }),
      });

      const json = await res.json();

      if (json.success) {
        router.push(json.redirect || "/dashboard");
      } else {
        setError(json.error || "Invalid token");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) handleValidate(token.trim());
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tax<span className="text-slate-900">Apex</span>{" "}
            <span className="text-sm text-slate-500 font-normal">Sign In</span>
          </h1>
          <p className="mt-2 text-slate-500 text-sm">Enter your access token to continue</p>
        </div>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                  <KeyRound className="h-5 w-5 text-slate-700" />
                </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Vault Access</h2>
                <p className="text-[11px] text-slate-400">Enter credentials to proceed</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-emerald-600 font-medium">System Online</span>
              <span className="ml-auto text-[11px] text-slate-400 tabular-nums">
                {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-slate-500">Access Token</Label>
                <Input
                  type="text"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter your access token"
                  className="mt-1.5 bg-white border-slate-200 font-mono tracking-wide h-11"
                  autoFocus
                />
              </div>

              <AnimatePresence>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                disabled={loading || !token.trim()}
                className="w-full bg-slate-900 text-white hover:bg-slate-800 h-11 font-semibold"
              >
                {loading ? "Authenticating..." : "Authenticate"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center space-y-2 mt-6">
          <a href="/" className="text-xs text-slate-400 hover:text-slate-900 transition-colors block">
            &larr; Back to home
          </a>
          <p className="text-xs text-slate-400">
            Don&apos;t have a token?{" "}
            <a href="/#contact" className="text-slate-900 hover:underline">
              Request access
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}