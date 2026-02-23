import React, { useEffect, useState } from "react";
import { Save, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface Settings {
  blueprint_id: string;
  print_provider_id: string;
  default_price: string;
  variant_ids: string;
  auto_process: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    blueprint_id: "",
    print_provider_id: "",
    default_price: "",
    variant_ids: "",
    auto_process: "true",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings({
        blueprint_id: data.blueprint_id || "",
        print_provider_id: data.print_provider_id || "",
        default_price: data.default_price || "",
        variant_ids: data.variant_ids || "[]",
        auto_process: data.auto_process || "true",
      });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600">Configure product templates and automation</p>
      </div>

      <form onSubmit={saveSettings} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h3 className="font-semibold text-gray-900">Product Template</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blueprint ID
              </label>
              <input
                type="text"
                value={settings.blueprint_id}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, blueprint_id: e.target.value }))
                }
                placeholder="e.g., 145"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find in Printify catalog URL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Print Provider ID
              </label>
              <input
                type="text"
                value={settings.print_provider_id}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, print_provider_id: e.target.value }))
                }
                placeholder="e.g., 99"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Provider for the blueprint
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Price (cents)
            </label>
            <input
              type="text"
              value={settings.default_price}
              onChange={(e) =>
                setSettings((s) => ({ ...s, default_price: e.target.value }))
              }
              placeholder="e.g., 1999 for $19.99"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Variant IDs (JSON array)
            </label>
            <textarea
              value={settings.variant_ids}
              onChange={(e) =>
                setSettings((s) => ({ ...s, variant_ids: e.target.value }))
              }
              placeholder='e.g., [12345, 12346, 12347]'
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to auto-select all available variants (max 100)
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Automation</h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Auto-process new images</p>
              <p className="text-sm text-gray-500">
                Automatically analyze and create drafts for images dropped in the
                uploads folder
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  auto_process: s.auto_process === "true" ? "false" : "true",
                }))
              }
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.auto_process === "true" ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.auto_process === "true" ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>

          {saveStatus === "success" && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              Saved successfully
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              Failed to save
            </span>
          )}
        </div>
      </form>

      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
        <h4 className="font-semibold text-blue-900 mb-2">Finding Blueprint & Provider IDs</h4>
        <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
          <li>Go to Printify and select a product template</li>
          <li>Open browser developer tools (F12)</li>
          <li>Look at the network requests when loading the product</li>
          <li>Find the blueprint_id and print_provider_id in the API calls</li>
          <li>Or use the Printify API catalog endpoint to browse available products</li>
        </ol>
      </div>
    </div>
  );
}
