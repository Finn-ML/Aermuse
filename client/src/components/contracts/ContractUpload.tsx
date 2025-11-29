import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, AlertCircle, CheckCircle } from "lucide-react";
import type { Contract } from "@shared/schema";

interface ContractUploadProps {
  onUploadComplete: (contract: Contract) => void;
  onCancel?: () => void;
}

type UploadState = "idle" | "uploading" | "success" | "error";

const ACCEPTED_TYPES = ".pdf,.doc,.docx";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function ContractUpload({ onUploadComplete, onCancel }: ContractUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (![".pdf", ".doc", ".docx"].includes(ext)) {
      return "Invalid file type. Accepted: PDF, DOC, DOCX";
    }
    if (file.size > MAX_SIZE) {
      return "File too large. Maximum size: 10MB";
    }
    return null;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validationError = validateFile(droppedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(droppedFile);
      setError("");
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setState("uploading");
    setProgress(0);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      const response = await new Promise<Contract>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            resolve(data.contract);
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.error || "Upload failed"));
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));

        xhr.open("POST", "/api/contracts/upload");
        xhr.withCredentials = true;
        xhr.send(formData);
      });

      setState("success");
      setTimeout(() => onUploadComplete(response), 500);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleReset = () => {
    setFile(null);
    setState("idle");
    setProgress(0);
    setError("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => state === "idle" && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center
          transition-colors cursor-pointer
          ${dragActive
            ? "border-[#660033] bg-[#660033]/5"
            : "border-gray-300 hover:border-gray-400"
          }
          ${state === "uploading" ? "pointer-events-none opacity-75" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleChange}
          className="hidden"
        />

        {!file ? (
          <>
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700">
              Drop your contract here
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-2">
              PDF, DOC, or DOCX up to 10MB
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-[#660033]" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {state === "idle" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {state === "uploading" && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#660033] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Message */}
      {state === "success" && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800">Upload complete!</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Actions */}
      {file && state === "idle" && (
        <div className="mt-4 flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleUpload}
            className="flex-1 px-4 py-2 bg-[#660033] text-white rounded-md hover:bg-[#4d0026] transition-colors"
          >
            Upload Contract
          </button>
        </div>
      )}
    </div>
  );
}
