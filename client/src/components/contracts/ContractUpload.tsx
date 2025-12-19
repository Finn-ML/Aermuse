import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, AlertCircle, CheckCircle, Lock, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import type { Contract } from "@shared/schema";

interface ContractUploadProps {
  onUploadComplete: (contract: Contract) => void;
  onCancel?: () => void;
  /** Current number of contracts the user has */
  currentContractCount?: number;
  /** Maximum contracts allowed (null = unlimited) */
  contractLimit?: number | null;
  /** Whether the user is on a premium plan */
  isPremium?: boolean;
}

type UploadState = "idle" | "uploading" | "success" | "error" | "limit_reached";

const ACCEPTED_TYPES = ".pdf,.doc,.docx";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function ContractUpload({
  onUploadComplete,
  onCancel,
  currentContractCount,
  contractLimit,
  isPremium = false
}: ContractUploadProps) {
  const queryClient = useQueryClient();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [limitInfo, setLimitInfo] = useState<{ current: number; limit: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if at limit before allowing upload
  const isAtLimit = !isPremium && contractLimit !== null && contractLimit !== undefined
    && currentContractCount !== undefined && currentContractCount >= contractLimit;

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

    // Pre-check limit before attempting upload
    if (isAtLimit) {
      setState("limit_reached");
      setLimitInfo({
        current: currentContractCount ?? 0,
        limit: contractLimit ?? 10
      });
      return;
    }

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
              // Handle contract limit error with dedicated state
              if (data.code === "CONTRACT_LIMIT_REACHED") {
                setLimitInfo({
                  current: data.current,
                  limit: data.limit
                });
                reject({ isLimitError: true, current: data.current, limit: data.limit });
              } else {
                reject(new Error(data.error || "Upload failed"));
              }
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Network error. Please check your connection and try again."));

        xhr.open("POST", "/api/contracts/upload");
        xhr.withCredentials = true;
        xhr.send(formData);
      });

      setState("success");
      // Invalidate contract usage cache on successful upload
      queryClient.invalidateQueries({ queryKey: ['contract-usage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts/limit'] });
      setTimeout(() => onUploadComplete(response), 500);
    } catch (err) {
      // Handle limit error with dedicated state
      if (err && typeof err === 'object' && 'isLimitError' in err) {
        setState("limit_reached");
        return;
      }
      setState("error");
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  };

  const handleReset = () => {
    setFile(null);
    setState("idle");
    setProgress(0);
    setError("");
    setLimitInfo(null);
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
      {error && state === "error" && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Upload failed</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="mt-3 w-full px-4 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Contract Limit Reached */}
      {state === "limit_reached" && limitInfo && (
        <div className="mt-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Lock className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-[#660033] mb-1">Contract Limit Reached</h4>
              <p className="text-[#660033]/70 text-sm mb-3">
                You've used {limitInfo.current} of {limitInfo.limit} contracts on the free plan.
                Upgrade to Premium for unlimited contract storage.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#660033] text-[#F7E6CA] rounded-lg hover:bg-[#4a0024] transition-colors text-sm font-medium"
                >
                  <Sparkles className="h-4 w-4" />
                  Upgrade to Premium
                </Link>
                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-[#660033] hover:bg-[#660033]/10 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
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
