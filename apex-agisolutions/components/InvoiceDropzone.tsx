"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";

interface InvoiceDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  required?: boolean;
}

export default function InvoiceDropzone({ onFileSelected, disabled, required }: InvoiceDropzoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    onFileSelected(f);
  }, [onFileSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const removeFile = () => setFile(null);

  const maxSize = 10 * 1024 * 1024;

  return (
    <div>
      <label className="text-xs text-gray-500 uppercase mb-1 block">
        Invoice Attachment {required && <span className="text-red-400">*</span>}
        {!required && <span className="text-gray-600 ml-1">(optional)</span>}
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          dragOver ? "border-cyan-400 bg-cyan-500/10" : "border-gray-700 bg-gray-900/50"
        } ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-gray-600"}`}
      >
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-300 truncate max-w-[200px]">{file.name}</span>
              <span className="text-[10px] text-gray-600">({(file.size / 1024).toFixed(0)}KB)</span>
            </div>
            {!disabled && (
              <button onClick={(e) => { e.stopPropagation(); removeFile(); }} className="text-gray-500 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <Upload className="w-6 h-6 text-gray-500 mx-auto" />
            <p className="text-xs text-gray-500">
              Drop invoice or <span className="text-cyan-400">browse</span>
            </p>
            <p className="text-[10px] text-gray-600">JPEG, PNG, PDF • Max 10MB</p>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
