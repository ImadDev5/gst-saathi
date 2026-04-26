"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-mono text-2xl tracking-tight">
            GST<span className="text-cyan-400">Saathi</span>{" "}
            <span className="text-sm text-gray-500 font-normal">Sign In</span>
          </h1>
          <p className="mt-2 text-gray-400 text-sm">Enter your access token to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Your access token"
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500 focus:outline-none font-mono"
            autoFocus
          />

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="w-full rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors disabled:opacity-30"
          >
            {loading ? "Validating..." : "Sign In"}
          </button>
        </form>

        <div className="text-center space-y-2">
          <a href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors block">
            ← Back to home
          </a>
          <p className="text-xs text-gray-600">
            Don't have a token?{" "}
            <a href="/#contact" className="text-cyan-400 hover:underline">
              Request access
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
