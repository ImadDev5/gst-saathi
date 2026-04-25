"use client";

import { useState, useCallback, useRef } from "react";

interface Props {
  onUploadComplete: (statementId: string) => void;
}

const SUPPORTED_BANKS = ["HDFC", "ICICI", "SBI", "KOTAK", "AXIS", "OTHER"] as const;

export default function StatementUpload({ onUploadComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [statementId, setStatementId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith(".csv") || dropped.type === "text/csv")) {
      setFile(dropped);
      setErrorMsg("");
      // Auto-detect bank from filename
      const name = dropped.name.toUpperCase();
      for (const bank of SUPPORTED_BANKS) {
        if (name.includes(bank)) { setBankName(bank); break; }
      }
    } else {
      setErrorMsg("Only CSV files are supported");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setErrorMsg("");
    }
  };

  const pollStatus = (stmtId: string) => {
    setStatus("processing");
    setProgress(50);
    let attempts = 0;

    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/v1/statements/${stmtId}/status`);
        const json = await res.json();

        if (json.data?.status === "COMPLETED") {
          clearInterval(pollRef.current!);
          setStatus("done");
          setProgress(100);
          onUploadComplete(stmtId);
        } else if (json.data?.status === "FAILED") {
          clearInterval(pollRef.current!);
          setStatus("error");
          setErrorMsg(json.data?.error_message || "Processing failed");
        } else {
          setProgress(Math.min(50 + attempts * 5, 90));
        }
      } catch {
        // Keep polling
      }

      if (attempts > 60) {
        clearInterval(pollRef.current!);
        setStatus("error");
        setErrorMsg("Processing timed out — please try again");
      }
    }, 3000);
  };

  const handleUpload = async () => {
    if (!file || !bankName) return;

    setStatus("uploading");
    setProgress(10);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bankName", bankName);
      formData.append("trialToken", document.cookie.replace(/(?:(?:^|.*;\s*)trial_token\s*=\s*([^;]*).*$)|^.*$/, "$1"));

      setProgress(30);
      const res = await fetch("/api/v1/statements/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error || "Upload failed");
        return;
      }

      setStatementId(json.statementId);
      pollStatus(json.statementId);
    } catch (err) {
      setStatus("error");
      setErrorMsg("Network error — check your connection");
    }
  };

  const statusColors: Record<string, string> = {
    idle: "border-gray-700",
    uploading: "border-cyan-500/50",
    processing: "border-amber-500/50",
    done: "border-green-500/50",
    error: "border-red-500/50",
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300
          ${isDragging ? "border-cyan-400 bg-cyan-500/5 scale-[1.02]" : statusColors[status] || "border-gray-700"}
          ${status === "idle" ? "hover:border-gray-500 hover:bg-gray-900/50" : ""}
        `}
      >
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />

        {status === "idle" && (
          <>
            <div className="text-4xl mb-3 opacity-40">📄</div>
            <p className="text-gray-300 font-medium">
              {file ? file.name : "Drop CSV here or click to browse"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supported: HDFC, ICICI, SBI, Kotak, Axis (.csv format)
            </p>
          </>
        )}

        {(status === "uploading" || status === "processing") && (
          <>
            <div className="text-2xl mb-2 animate-pulse">{status === "uploading" ? "⬆️" : "⚙️"}</div>
            <p className="text-sm text-gray-300">
              {status === "uploading" ? "Uploading..." : "Classifying transactions..."}
            </p>
            <div className="mt-4 mx-auto max-w-xs h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}

        {status === "done" && (
          <>
            <div className="text-4xl mb-2">✅</div>
            <p className="text-green-400 font-medium">Processing complete!</p>
            <p className="text-xs text-gray-400 mt-1">View your transactions below</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-4xl mb-2">❌</div>
            <p className="text-red-400 font-medium">{errorMsg}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setStatus("idle"); setFile(null); setErrorMsg(""); }}
              className="mt-2 text-xs text-cyan-400 underline"
            >
              Try again
            </button>
          </>
        )}
      </div>

      {/* Bank selector + Upload button */}
      {file && status === "idle" && (
        <div className="flex items-center gap-3">
          <select
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Select bank...</option>
            {SUPPORTED_BANKS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <button
            onClick={handleUpload}
            disabled={!bankName}
            className="rounded-lg bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-black transition-all hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Upload & Classify
          </button>
        </div>
      )}
    </div>
  );
}
