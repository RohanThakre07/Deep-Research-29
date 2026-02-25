import React, { useState, useCallback } from "react";
import { Upload as UploadIcon, CheckCircle, AlertCircle, Loader2, X, Edit2 } from "lucide-react";

interface AnalysisResult {
  theme: string;
  style: string;
  title: string;
  description: string;
  bullets: string[];
  tags: string[];
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [editedAnalysis, setEditedAnalysis] = useState<AnalysisResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    analyzing: boolean;
    uploading: boolean;
    creating: boolean;
    uploaded: boolean;
    created: boolean;
    error: string | null;
  }>({
    analyzing: false,
    uploading: false,
    creating: false,
    uploaded: false,
    created: false,
    error: null,
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setAnalysis(null);
      setEditedAnalysis(null);
      setUploadedImageId(null);
      setStatus({
        analyzing: false,
        uploading: false,
        creating: false,
        uploaded: false,
        created: false,
        error: null,
      });
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setAnalysis(null);
      setEditedAnalysis(null);
      setUploadedImageId(null);
      setStatus({
        analyzing: false,
        uploading: false,
        creating: false,
        uploaded: false,
        created: false,
        error: null,
      });
    }
  };

  const analyzeImage = async () => {
    if (!file) return;

    setStatus((s) => ({ ...s, analyzing: true, error: null }));
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setAnalysis(data.analysis);
      setEditedAnalysis(data.analysis);
      setStatus((s) => ({ ...s, analyzing: false }));
    } catch (error) {
      setStatus((s) => ({
        ...s,
        analyzing: false,
        error: error instanceof Error ? error.message : "Analysis failed",
      }));
    }
  };

  const uploadToPrintify = async () => {
    if (!file) return;

    setStatus((s) => ({ ...s, uploading: true, error: null }));
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploadedImageId(data.product?.printify_image_id);
      setStatus((s) => ({ ...s, uploading: false, uploaded: true }));
    } catch (error) {
      setStatus((s) => ({
        ...s,
        uploading: false,
        error: error instanceof Error ? error.message : "Upload failed",
      }));
    }
  };

  const createDraft = async () => {
    if (!uploadedImageId || !editedAnalysis) return;

    setStatus((s) => ({ ...s, creating: true, error: null }));
    try {
      const res = await fetch("/api/create-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: uploadedImageId,
          ...editedAnalysis,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Draft creation failed");

      setStatus((s) => ({ ...s, creating: false, created: true }));
    } catch (error) {
      setStatus((s) => ({
        ...s,
        creating: false,
        error: error instanceof Error ? error.message : "Draft creation failed",
      }));
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setAnalysis(null);
    setEditedAnalysis(null);
    setUploadedImageId(null);
    setIsEditing(false);
    setStatus({
      analyzing: false,
      uploading: false,
      creating: false,
      uploaded: false,
      created: false,
      error: null,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Upload & Analyze</h2>
        <p className="text-gray-600">Upload images to create Printify product drafts</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h3 className="font-semibold text-gray-900">Image Upload</h3>

          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
            >
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Drag and drop an image, or{" "}
                  <span className="text-blue-600">browse</span>
                </p>
                <p className="text-sm text-gray-400 mt-2">PNG or JPG up to 50MB</p>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={preview!}
                  alt="Preview"
                  className="w-full max-h-80 object-contain rounded-lg bg-gray-100"
                />
                <button
                  onClick={reset}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={analyzeImage}
                  disabled={status.analyzing || !!analysis}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {status.analyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : analysis ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Analysis Complete
                    </>
                  ) : (
                    "Analyze Image"
                  )}
                </button>

                {analysis && (
                  <>
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">
                        {status.uploaded ? "Uploaded to Printify" : "Ready to upload"}
                      </span>
                    </div>

                    <button
                      onClick={status.created ? reset : (status.uploaded ? createDraft : uploadToPrintify)}
                      disabled={status.uploading || status.creating}
                      className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {status.uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Uploading...
                        </>
                      ) : status.creating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating Draft...
                        </>
                      ) : status.created ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Done! Upload Another
                        </>
                      ) : status.uploaded ? (
                        "Create Product Draft"
                      ) : (
                        "Upload & Create Draft"
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {status.error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{status.error}</p>
            </div>
          )}
        </div>

        {/* Analysis Result */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">AI Analysis Result</h3>
            {analysis && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Edit2 className="w-4 h-4" />
                {isEditing ? "Done" : "Edit"}
              </button>
            )}
          </div>

          {!analysis ? (
            <div className="text-center py-12 text-gray-500">
              Upload an image and click "Analyze" to see AI-generated content
            </div>
          ) : isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editedAnalysis?.title || ""}
                  onChange={(e) =>
                    setEditedAnalysis((a) => a && { ...a, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editedAnalysis?.description || ""}
                  onChange={(e) =>
                    setEditedAnalysis((a) => a && { ...a, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bullets (one per line)
                </label>
                <textarea
                  value={editedAnalysis?.bullets.join("\n") || ""}
                  onChange={(e) =>
                    setEditedAnalysis((a) => a && {
                      ...a,
                      bullets: e.target.value.split("\n"),
                    })
                  }
                  rows={5}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editedAnalysis?.tags.join(", ") || ""}
                  onChange={(e) =>
                    setEditedAnalysis((a) => a && {
                      ...a,
                      tags: e.target.value.split(",").map((t) => t.trim()),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Theme
                </p>
                <p className="text-gray-900">{analysis.theme}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Style
                </p>
                <p className="text-gray-900">{analysis.style}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Title
                </p>
                <p className="text-gray-900 font-medium">{analysis.title}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Bullets
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {analysis.bullets.map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {analysis.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
