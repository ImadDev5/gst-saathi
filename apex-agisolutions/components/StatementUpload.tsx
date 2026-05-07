"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, RefreshCcw, CheckCircle2, XCircle, CloudUpload } from "lucide-react";
import { SUPPORTED_BANKS, detectBankFromFilename } from "@/lib/services/parsing";

interface Props {
  onUploadComplete: (statementId: string) => void;
}

const POLL_INTERVAL_MS = 3000;
const PROCESSING_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_POLL_ATTEMPTS = Math.ceil(PROCESSING_TIMEOUT_MS / POLL_INTERVAL_MS);

export default function StatementUpload({ onUploadComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

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
      setBankName(detectBankFromFilename(dropped.name));
      setErrorMsg("");
    } else {
      setErrorMsg("Only CSV files are supported");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setBankName(detectBankFromFilename(selected.name));
      setErrorMsg("");
    }
  };

  const pollStatus = (stmtId: string) => {
    setStatus("processing");
    setProgress(10);
    let attempts = 0;

    if (pollRef.current) {
      clearInterval(pollRef.current);
    }

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
        } else if (json.data?.status === "PROCESSING") {
          setProgress(Math.min(10 + attempts * 3, 90));
        }
      } catch {
        // Keep polling
      }

      if (attempts > MAX_POLL_ATTEMPTS) {
        clearInterval(pollRef.current!);
        setStatus("error");
        setErrorMsg("Processing timed out after 15 minutes. Please refresh in a bit or try again shortly.");
      }
    }, POLL_INTERVAL_MS);
  };

  const handleUpload = async () => {
    if (!file || !bankName) return;

    setStatus("uploading");
    setProgress(10);
    setErrorMsg("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bankName", bankName);

      setProgress(30);
      const res = await fetch("/api/v1/statements/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const json = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error || "Upload failed");
        return;
      }

      pollStatus(json.statementId);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("error");
        setErrorMsg("Processing timed out — file may be too large. Try a smaller file.");
      } else {
        setStatus("error");
        setErrorMsg("Network error — check your connection");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => status === "idle" && fileRef.current?.click()}
        className={`
          relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-150
          ${isDragging ? "border-slate-900 bg-slate-50" : "border-slate-300 hover:border-slate-600 hover:bg-slate-50"}
        `}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          aria-label="Statement file"
          onChange={handleFileSelect}
          className="hidden"
        />

        {status === "idle" && (
          <div className="space-y-3">
            <CloudUpload className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-slate-700 font-medium">
              {file ? file.name : "Drop CSV here or click to browse"}
            </p>
            <p className="text-xs text-slate-400">
              Supported: HDFC, ICICI, SBI, Kotak, Axis (.csv format)
            </p>
          </div>
        )}

        {(status === "uploading" || status === "processing") && (
          <div className="space-y-4">
            <div className="mx-auto">
              <RefreshCcw className="w-8 h-8 text-slate-700 animate-spin" />
            </div>
            <p className="text-sm text-slate-700">
              {status === "uploading" ? "Uploading..." : "Classifying transactions..."}
            </p>
            <div className="mx-auto max-w-xs">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-slate-900 font-medium">Processing complete!</p>
            <p className="text-xs text-slate-400">View your transactions below</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-2">
            <XCircle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="text-red-700 font-medium">{errorMsg}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setStatus("idle");
                setFile(null);
                setErrorMsg("");
              }}
              className="mt-2 border-slate-200"
            >
              Try again
            </Button>
          </div>
        )}
      </div>

      {file && status === "idle" && (
        <div className="flex items-center gap-3">
          <Select value={bankName} onValueChange={(v) => { if (v) setBankName(v); }}>
            <SelectTrigger className="flex-1 bg-white border-slate-200">
              <SelectValue placeholder="Select bank..." />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_BANKS.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleUpload}
            disabled={!bankName}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Upload & Classify
          </Button>
        </div>
      )}
    </div>
  );
}